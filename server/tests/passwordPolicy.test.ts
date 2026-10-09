import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, validatePassword } from "../src/utils/passwordPolicy";

describe("validatePassword", () => {
  it("requires at least 8 characters", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(validatePassword("1234567")).toMatch(/8/);
    expect(validatePassword("12345678")).toBeNull();
  });
  it("rejects non-strings and passwords over bcrypt's 72-byte limit", () => {
    expect(validatePassword(undefined)).not.toBeNull();
    expect(validatePassword({ a: 1 })).not.toBeNull();
    expect(validatePassword("a".repeat(73))).not.toBeNull();
  });
});
