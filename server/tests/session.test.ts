import { beforeEach, describe, expect, it, vi } from "vitest";

// A tiny in-memory stand-in for Redis (keys expire by "ttl" bookkeeping only).
const store = new Map<string, { value: string; ttl: number }>();
vi.mock("../src/utils/redis", () => ({
  redis: {
    set: async (k: string, v: string, _ex: string, ttl: number) => { store.set(k, { value: v, ttl }); return "OK"; },
    get: async (k: string) => store.get(k)?.value ?? null,
    expire: async (k: string, ttl: number) => { const e = store.get(k); if (e) e.ttl = ttl; return e ? 1 : 0; },
    del: async (...keys: string[]) => keys.filter((k) => store.delete(k)).length,
  },
}));

import {
  REFRESH_GRACE_SECONDS, decideRefresh, describeDuration, endSession, getSessionLimits, isPastMax,
  secondsUntilMax, sessionEndedError, startRefreshChain, startSession, touchSession,
} from "../src/utils/session";

beforeEach(() => store.clear());

describe("getSessionLimits", () => {
  it("defaults to NO hard cap (active users stay logged in) and 30 minutes idle", () => {
    expect(getSessionLimits({} as any)).toEqual({ maxSeconds: 0, idleSeconds: 1800 });
  });
  it("reads SESSION_MAX_HOURS (optional cap) and SESSION_IDLE_MINUTES", () => {
    expect(getSessionLimits({ SESSION_MAX_HOURS: "1", SESSION_IDLE_MINUTES: "10" } as any)).toEqual({ maxSeconds: 3600, idleSeconds: 600 });
    expect(getSessionLimits({ SESSION_MAX_HOURS: "0.5" } as any).maxSeconds).toBe(1800);
  });
  it("ignores nonsense and falls back to the defaults (no cap, 30 min)", () => {
    for (const bad of ["abc", "", "0", "-5", "NaN"]) {
      expect(getSessionLimits({ SESSION_MAX_HOURS: bad, SESSION_IDLE_MINUTES: bad } as any)).toEqual({ maxSeconds: 0, idleSeconds: 1800 });
    }
  });
});

describe("hard cap (only when switched on)", () => {
  it("with no cap, nobody is ever past it and there is no end time", () => {
    expect(isPastMax(1000, 0, 1000 + 10 * 86400)).toBe(false);
    expect(secondsUntilMax(1000, 0, 5000)).toBe(Infinity);
  });
  it("counts from the moment of login", () => {
    expect(secondsUntilMax(1000, 7200, 1000)).toBe(7200);
    expect(secondsUntilMax(1000, 7200, 4000)).toBe(4200);
    expect(isPastMax(1000, 7200, 1000 + 7199)).toBe(false);
    expect(isPastMax(1000, 7200, 1000 + 7200)).toBe(true);
    expect(isPastMax(1000, 7200, 1000 + 99999)).toBe(true);
  });
});

describe("messages", () => {
  it("describeDuration is human", () => {
    expect(describeDuration(7200)).toBe("2 hours");
    expect(describeDuration(3600)).toBe("1 hour");
    expect(describeDuration(1800)).toBe("30 minutes");
    expect(describeDuration(60)).toBe("1 minute");
    expect(describeDuration(90)).toBe("90 seconds");
  });
  it("session-over errors are 401 with a code the website can act on", () => {
    process.env.SESSION_MAX_HOURS = "2";
    const idle = sessionEndedError("idle"); const max = sessionEndedError("max");
    delete process.env.SESSION_MAX_HOURS;
    expect([idle.statusCode, idle.code]).toEqual([401, "SESSION_IDLE"]);
    expect([max.statusCode, max.code]).toEqual([401, "SESSION_MAX"]);
    expect(idle.message).toMatch(/inactivity/);
    expect(max.message).toMatch(/2 hours/);
  });
});

describe("sessions in Redis", () => {
  it("each login gets its own random id, with an idle-length expiry", async () => {
    const a = await startSession("u1"); const b = await startSession("u1");
    expect(a.sid).toMatch(/^[0-9a-f]{32}$/);
    expect(a.sid).not.toBe(b.sid);
    expect(store.get(`sess:${a.sid}`)).toEqual({ value: "u1", ttl: 1800 });
  });
  it("touching restarts the idle clock for the right user only", async () => {
    const { sid } = await startSession("u1");
    store.get(`sess:${sid}`)!.ttl = 5;
    expect(await touchSession(sid, "u1")).toBe(true);
    expect(store.get(`sess:${sid}`)!.ttl).toBe(1800);
    expect(await touchSession(sid, "someone-else")).toBe(false);
  });
  it("an unknown or ended session is dead; ending one leaves the user's other logins alone", async () => {
    const a = await startSession("u1"); const b = await startSession("u1");
    expect(await touchSession("0".repeat(32), "u1")).toBe(false);
    await endSession(a.sid);
    expect(await touchSession(a.sid, "u1")).toBe(false);
    expect(await touchSession(b.sid, "u1")).toBe(true);
  });
});

describe("refresh-token rotation", () => {
  const state = { cur: "B", prev: "A", prevUntil: 1000 };

  it("the current token rotates to a new id and remembers the old one briefly", () => {
    expect(decideRefresh(state, "B", "C", 990)).toEqual({
      action: "rotate",
      jti: "C",
      next: { cur: "C", prev: "B", prevUntil: 990 + REFRESH_GRACE_SECONDS },
    });
  });
  it("the previous token, within the grace seconds, gets the current id (two tabs at once)", () => {
    expect(decideRefresh(state, "A", "X", 1000)).toEqual({ action: "grace", jti: "B" });
  });
  it("the previous token after the grace, or any older token, is reuse", () => {
    expect(decideRefresh(state, "A", "X", 1001)).toEqual({ action: "reuse" });
    expect(decideRefresh(state, "Z", "X", 990)).toEqual({ action: "reuse" });
    expect(decideRefresh(state, "", "X", 990)).toEqual({ action: "reuse" });
  });
  it("with no record (older login, or Redis lost it) the token is accepted once", () => {
    expect(decideRefresh(null, "", "N", 5).action).toBe("rotate");
    // ...and a second tab sending the same pre-rotation token right then gets the grace too
    expect(decideRefresh({ cur: "N", prev: "", prevUntil: 25 }, "", "M", 10)).toEqual({ action: "grace", jti: "N" });
  });
  it("on a fresh chain an empty id never matches", () => {
    expect(decideRefresh({ cur: "J1", prev: "", prevUntil: 0 }, "", "M", 0)).toEqual({ action: "reuse" });
  });
  it("a new login starts a chain with only its first id", async () => {
    await startRefreshChain("s1", "J1", 3600);
    expect(store.get("rt:s1")).toEqual({ value: JSON.stringify({ cur: "J1", prev: "", prevUntil: 0 }), ttl: 3600 });
  });
  it("ending a login also forgets its refresh chain", async () => {
    const { sid } = await startSession("u1");
    await startRefreshChain(sid, "J1", 60);
    await endSession(sid);
    expect(store.has(`sess:${sid}`)).toBe(false);
    expect(store.has(`rt:${sid}`)).toBe(false);
  });
  it("a replayed token gets its own 401 code so the website can explain it", () => {
    const e = sessionEndedError("reused");
    expect([e.statusCode, e.code]).toEqual([401, "SESSION_REVOKED"]);
  });
});
