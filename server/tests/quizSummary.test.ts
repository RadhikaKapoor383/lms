import { describe, expect, it } from "vitest";
import { summarizeAttempts } from "../src/services/quizSummary.service";

const at = (iso: string, percentage: number, passed: boolean) => ({ percentage, passed, submittedAt: new Date(iso) });

describe("summarizeAttempts", () => {
  it("a quiz never attempted is 'not started' with every attempt left", () => {
    expect(summarizeAttempts([], 3)).toEqual({
      attemptsUsed: 0, attemptsRemaining: 3, bestPercentage: null, passed: false, lastAttemptAt: null, status: "not_started",
    });
  });

  it("some attempts used and not passed yet is 'in progress'", () => {
    const s = summarizeAttempts([at("2026-10-01T10:00:00Z", 40, false)], 3);
    expect(s).toMatchObject({ attemptsUsed: 1, attemptsRemaining: 2, bestPercentage: 40, passed: false, status: "in_progress" });
  });

  it("passing wins, whatever attempts are left, and the best score is kept", () => {
    const s = summarizeAttempts([at("2026-10-01T10:00:00Z", 30, false), at("2026-10-02T10:00:00Z", 85, true), at("2026-10-03T10:00:00Z", 60, false)], 3);
    expect(s).toMatchObject({ attemptsUsed: 3, attemptsRemaining: 0, bestPercentage: 85, passed: true, status: "passed" });
    expect(s.lastAttemptAt).toEqual(new Date("2026-10-03T10:00:00Z"));
  });

  it("every attempt used and never passed is 'no attempts left'", () => {
    const s = summarizeAttempts([at("2026-10-01T10:00:00Z", 10, false), at("2026-10-02T10:00:00Z", 20, false)], 2);
    expect(s).toMatchObject({ attemptsRemaining: 0, passed: false, status: "no_attempts_left" });
  });

  it("never reports negative attempts remaining", () => {
    expect(summarizeAttempts([at("2026-10-01T10:00:00Z", 0, false), at("2026-10-01T11:00:00Z", 0, false)], 1).attemptsRemaining).toBe(0);
  });

  it("a timed-out attempt (score 0) still uses an attempt", () => {
    const s = summarizeAttempts([at("2026-10-01T10:00:00Z", 0, false)], 2);
    expect(s).toMatchObject({ attemptsUsed: 1, attemptsRemaining: 1, bestPercentage: 0, status: "in_progress" });
  });
});
