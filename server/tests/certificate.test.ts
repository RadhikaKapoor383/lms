import { describe, expect, it } from "vitest";
import { computeEligibility } from "../src/services/certificate.service";

describe("computeEligibility", () => {
  it("needs 100% of lessons AND every quiz passed", () => {
    expect(computeEligibility(100, [{ quizId: "1", title: "Q1", passed: true }]).eligible).toBe(true);
    expect(computeEligibility(100, []).eligible).toBe(true);
    expect(computeEligibility(99, []).eligible).toBe(false);
  });
  it("lists the quizzes still to pass", () => {
    const r = computeEligibility(100, [
      { quizId: "1", title: "Q1", passed: true },
      { quizId: "2", title: "Q2", passed: false },
    ]);
    expect(r.eligible).toBe(false);
    expect(r.pendingQuizzes).toEqual([{ quizId: "2", title: "Q2" }]);
  });
});
