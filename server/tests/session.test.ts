import { beforeEach, describe, expect, it, vi } from "vitest";

// A tiny in-memory stand-in for Redis (keys expire by "ttl" bookkeeping only).
const store = new Map<string, { value: string; ttl: number }>();
vi.mock("../src/utils/redis", () => ({
  redis: {
    set: async (k: string, v: string, _ex: string, ttl: number) => { store.set(k, { value: v, ttl }); return "OK"; },
    get: async (k: string) => store.get(k)?.value ?? null,
    expire: async (k: string, ttl: number) => { const e = store.get(k); if (e) e.ttl = ttl; return e ? 1 : 0; },
    del: async (k: string) => (store.delete(k) ? 1 : 0),
  },
}));

import {
  describeDuration, endSession, getSessionLimits, isPastMax, secondsUntilMax,
  sessionEndedError, startSession, touchSession,
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
