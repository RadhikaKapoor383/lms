import { describe, expect, it } from "vitest";
import { canWith } from "../src/utils/permissions";

describe("can()", () => {
  const data = { governed: ["quiz.manage", "course.create"], allowed: ["course.create"] };
  it("follows the switches that apply to my role", () => {
    expect(canWith(data, "course.create")).toBe(true);
    expect(canWith(data, "quiz.manage")).toBe(false);
  });
  it("anything that isn't a switch for my role is allowed", () => {
    expect(canWith(data, "review.write")).toBe(true);
  });
  it("shows everything while the list is loading or failed", () => {
    expect(canWith(undefined, "quiz.manage")).toBe(true);
    expect(canWith({}, "quiz.manage")).toBe(true);
  });
});
