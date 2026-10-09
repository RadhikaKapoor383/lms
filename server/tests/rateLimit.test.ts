import { beforeEach, describe, expect, it, vi } from "vitest";

// A tiny in-memory stand-in for Redis, so no server is needed.
const store = new Map<string, number>();
vi.mock("../src/utils/redis", () => ({
  redis: {
    incr: async (k: string) => { store.set(k, (store.get(k) || 0) + 1); return store.get(k)!; },
    expire: async () => 1,
    ttl: async () => 600,
    get: async (k: string) => (store.has(k) ? String(store.get(k)) : null),
    del: async (k: string) => { store.delete(k); return 1; },
  },
}));

import { clearRateLimit, decideRateLimit, hashKeyPart, hitRateLimit, isRateLimited } from "../src/utils/rateLimit";

beforeEach(() => store.clear());

describe("decideRateLimit", () => {
  it("allows up to the limit and blocks after it", () => {
    expect(decideRateLimit(3, 3, 60).allowed).toBe(true);
    expect(decideRateLimit(4, 3, 60)).toEqual({ allowed: false, retryAfterSeconds: 60 });
  });
});

describe("failed-login style counting", () => {
  it("isRateLimited only looks; hitRateLimit counts; clear resets", async () => {
    expect((await isRateLimited("k", 2)).allowed).toBe(true);
    await hitRateLimit("k", 2, 60);
    await hitRateLimit("k", 2, 60);
    expect((await isRateLimited("k", 2)).allowed).toBe(false); // 2 failures reached the limit
    await clearRateLimit("k");
    expect((await isRateLimited("k", 2)).allowed).toBe(true);
  });
  it("looking never adds to the count", async () => {
    for (let i = 0; i < 10; i++) await isRateLimited("k2", 2);
    expect((await isRateLimited("k2", 2)).allowed).toBe(true);
  });
});

describe("hashKeyPart", () => {
  it("is stable and hides the input", () => {
    expect(hashKeyPart("a@b.com")).toBe(hashKeyPart("a@b.com"));
    expect(hashKeyPart("a@b.com")).not.toContain("a@b.com");
  });
});
