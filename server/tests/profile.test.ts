import { describe, expect, it } from "vitest";
import { parseEmailChangeRequest, parseProfileUpdate } from "../src/services/profile.service";

describe("parseProfileUpdate", () => {
  it("accepts and cleans valid fields", () => {
    const r = parseProfileUpdate({ name: " Radhika ", bio: " hi ", expertise: ["React", " react ", "", "TS"] });
    expect(r).toEqual({ update: { name: "Radhika", bio: "hi", expertise: ["React", "TS"] } });
  });
  it("ignores fields it doesn't know (role, email, ...)", () => {
    const r = parseProfileUpdate({ name: "A", role: "admin", isActive: false });
    expect(r).toEqual({ update: { name: "A" } });
  });
  it("rejects bad types and sizes", () => {
    expect(parseProfileUpdate({ name: "  " })).toHaveProperty("error");
    expect(parseProfileUpdate({ name: { $ne: 1 } })).toHaveProperty("error");
    expect(parseProfileUpdate({ bio: "x".repeat(501) })).toHaveProperty("error");
    expect(parseProfileUpdate({ bio: 5 })).toHaveProperty("error");
    expect(parseProfileUpdate({ expertise: "react" })).toHaveProperty("error");
    expect(parseProfileUpdate({ expertise: [1] })).toHaveProperty("error");
    expect(parseProfileUpdate({ expertise: Array.from({ length: 11 }, (_, i) => `t${i}`) })).toHaveProperty("error");
    expect(parseProfileUpdate({ expertise: ["x".repeat(41)] })).toHaveProperty("error");
  });
});

describe("parseEmailChangeRequest", () => {
  it("needs a valid new email and the current password", () => {
    expect(parseEmailChangeRequest({ newEmail: " new@site.com ", password: "secret123" })).toEqual({
      newEmail: "new@site.com",
      password: "secret123",
    });
    expect(parseEmailChangeRequest({ newEmail: "nope", password: "x" })).toHaveProperty("error");
    expect(parseEmailChangeRequest({ newEmail: "a@b.com" })).toHaveProperty("error");
    expect(parseEmailChangeRequest({ newEmail: "a@b.com", password: "" })).toHaveProperty("error");
    expect(parseEmailChangeRequest({ newEmail: { $ne: 1 }, password: "x" })).toHaveProperty("error");
    expect(parseEmailChangeRequest({ newEmail: "a@b.com", password: { $ne: 1 } })).toHaveProperty("error");
  });
});
