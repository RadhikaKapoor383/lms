import { afterEach, describe, expect, it, vi } from "vitest";

// socketAuth.service reads sessions from Redis; no Redis is needed for these tests
vi.mock("../src/utils/redis", () => ({ redis: {} }));
import { emitToUser, notificationEvent, setRealtime, userRoom } from "../src/utils/realtime";
import { readCookie } from "../src/services/socketAuth.service";

afterEach(() => setRealtime(null));

describe("realtime pushes", () => {
  it("go only to that person's room", () => {
    const sent: [string, string, unknown][] = [];
    setRealtime({ to: (room) => ({ emit: (event, payload) => sent.push([room, event, payload]) }) });
    emitToUser("u1", "notification:new", { title: "Hi" });
    expect(sent).toEqual([["user:u1", "notification:new", { title: "Hi" }]]);
    expect(userRoom("abc")).toBe("user:abc");
  });
  it("do nothing without a socket server (scripts) or without a person", () => {
    expect(() => emitToUser("u1", "x", {})).not.toThrow();
    const sent: unknown[] = [];
    setRealtime({ to: () => ({ emit: () => sent.push(1) }) });
    emitToUser(undefined, "x", {});
    emitToUser("", "x", {});
    expect(sent).toHaveLength(0);
  });
  it("a failing push never throws into the request", () => {
    setRealtime({ to: () => { throw new Error("socket down"); } });
    expect(() => emitToUser("u1", "x", {})).not.toThrow();
  });
  it("tell the browser only what the bell needs", () => {
    expect(notificationEvent({ _id: { toString: () => "n1" }, title: "T", message: "M", link: "/x", userId: "u1", status: "unread", createdAt: "d" })).toEqual({
      _id: "n1", title: "T", message: "M", link: "/x", createdAt: "d",
    });
  });
});

describe("reading the login cookie from a socket handshake", () => {
  it("finds it among other cookies and decodes it", () => {
    expect(readCookie("theme=dark; access_token=abc%2Edef; refresh_token=zzz", "access_token")).toBe("abc.def");
    expect(readCookie("access_token=x=y", "access_token")).toBe("x=y");
  });
  it("missing, look-alike or broken cookies give nothing", () => {
    expect(readCookie(undefined, "access_token")).toBeUndefined();
    expect(readCookie("my_access_token=nope", "access_token")).toBeUndefined();
    expect(readCookie("access_token=%E0%A4%A", "access_token")).toBeUndefined();
  });
});
