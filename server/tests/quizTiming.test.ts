import { describe, expect, it } from "vitest";
import { QUIZ_GRACE_MS, isPastQuizDeadline, quizDeadline } from "../src/services/quizTiming.service";

const started = new Date("2026-10-01T10:00:00Z");
const at = (ms: number) => started.getTime() + ms;

describe("quiz deadline", () => {
  it("is start + limit + a 10 second grace", () => {
    expect(QUIZ_GRACE_MS).toBe(10000);
    expect(quizDeadline(started, 5)).toBe(at(5 * 60000 + 10000));
  });
  it("on time and inside the grace window is NOT past the deadline", () => {
    expect(isPastQuizDeadline(started, 5, at(60000))).toBe(false);
    expect(isPastQuizDeadline(started, 5, at(5 * 60000 + 9999))).toBe(false);
    expect(isPastQuizDeadline(started, 5, at(5 * 60000 + 10000))).toBe(false);
  });
  it("one millisecond after the grace is past", () => {
    expect(isPastQuizDeadline(started, 5, at(5 * 60000 + 10001))).toBe(true);
    expect(isPastQuizDeadline(started, 5, at(3 * 3600e3))).toBe(true);
  });
  it("a quiz with no time limit never runs out", () => {
    expect(isPastQuizDeadline(started, 0, at(99 * 3600e3))).toBe(false);
    expect(isPastQuizDeadline(started, undefined, at(99 * 3600e3))).toBe(false);
    expect(isPastQuizDeadline(started, null, at(99 * 3600e3))).toBe(false);
  });
});
