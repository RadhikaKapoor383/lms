import { describe, expect, it } from "vitest";
import { getPasswordStrength } from "../src/utils/passwordStrength";

describe("getPasswordStrength", () => {
  it("shows nothing for an empty password", () => {
    expect(getPasswordStrength("")).toEqual({ score: 0, label: "" });
  });

  it("calls anything under 8 characters too short", () => {
    expect(getPasswordStrength("Ab1!")).toEqual({ score: 0, label: "Too short" });
  });

  it("scores longer, more varied passwords higher", () => {
    expect(getPasswordStrength("abcdefgh").label).toBe("Weak");
    expect(getPasswordStrength("abcdefgh1").label).toBe("Weak");
    expect(getPasswordStrength("Abcdefgh1").label).toBe("Okay");
    expect(getPasswordStrength("Abcdefgh1!").label).toBe("Good");
    expect(getPasswordStrength("Abcdefghijk1!").label).toBe("Strong");
  });
});
