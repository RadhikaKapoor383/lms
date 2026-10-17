import { describe, expect, it } from "vitest";
import {
  containsRegex,
  parseStudentListQuery,
  tallyQuizAttempts,
  tallySubmissions,
} from "../src/services/instructorLists.service";

describe("parseStudentListQuery", () => {
  it("defaults to page 1, 20 per page, no filters", () => {
    expect(parseStudentListQuery({})).toEqual({ value: { page: 1, limit: 20 } });
  });
  it("reads page, limit, search, course and status", () => {
    const id = "a".repeat(24);
    expect(parseStudentListQuery({ page: "3", limit: "50", q: "  sana ", courseId: id, status: "completed" })).toEqual({
      value: { page: 3, limit: 50, q: "sana", courseId: id, status: "completed" },
    });
  });
  it("treats empty filters as 'not set'", () => {
    expect(parseStudentListQuery({ q: "   ", courseId: "", status: "" })).toEqual({ value: { page: 1, limit: 20 } });
  });
  it("rejects bad values with a clear message instead of ignoring them", () => {
    for (const bad of [{ page: "0" }, { page: "1.5" }, { page: "abc" }, { limit: "0" }, { limit: "101" }, { courseId: "nope" }, { status: "revoked" }, { q: "x".repeat(101) }, { q: ["a"] }, { courseId: ["a"] }]) {
      expect(parseStudentListQuery(bad as any)).toHaveProperty("error");
    }
  });
});

describe("containsRegex", () => {
  it("is case-insensitive 'contains'", () => {
    expect(containsRegex("sana").test("Sana Ahmed")).toBe(true);
    expect(containsRegex("AHMED").test("sana@x.org ahmed")).toBe(true);
  });
  it("treats what is typed literally, so it can't be abused as a pattern", () => {
    expect(containsRegex("a.b").test("axb")).toBe(false);
    expect(containsRegex("a.b").test("a.b")).toBe(true);
    expect(containsRegex(".*").test("anything")).toBe(false);
    expect(containsRegex("(").test("(")).toBe(true); // no "unterminated group" crash
  });
});

describe("tallySubmissions", () => {
  it("counts submitted, graded, still to grade and late", () => {
    const t = tallySubmissions([
      { gradedAt: new Date(), isLate: false },
      { gradedAt: null, isLate: true },
      { isLate: false },
      { gradedAt: new Date(), isLate: true },
    ]);
    expect(t).toEqual({ submitted: 4, graded: 2, toGrade: 2, late: 2 });
  });
  it("no submissions is all zeros", () => {
    expect(tallySubmissions([])).toEqual({ submitted: 0, graded: 0, toGrade: 0, late: 0 });
  });
});

describe("tallyQuizAttempts", () => {
  it("uses each student's BEST attempt for the average and the pass rate", () => {
    const t = tallyQuizAttempts([
      { student: "a", percentage: 40, passed: false },
      { student: "a", percentage: 80, passed: true }, // a: best 80, passed
      { student: "b", percentage: 30, passed: false }, // b: best 30, failed
      { student: "c", percentage: 90, passed: true, timedOut: false },
    ]);
    expect(t.attempts).toBe(4);
    expect(t.studentsAttempted).toBe(3);
    expect(t.averageBestPercentage).toBeCloseTo((80 + 30 + 90) / 3, 1);
    expect(t.passRate).toBeCloseTo((2 / 3) * 100, 1);
    expect(t.timedOut).toBe(0);
  });
  it("counts timed-out attempts and treats them as 0 for that student", () => {
    const t = tallyQuizAttempts([{ student: "a", percentage: 0, passed: false, timedOut: true }]);
    expect(t).toMatchObject({ attempts: 1, studentsAttempted: 1, averageBestPercentage: 0, passRate: 0, timedOut: 1 });
  });
  it("nobody attempted: averages are null, not NaN", () => {
    expect(tallyQuizAttempts([])).toEqual({ attempts: 0, studentsAttempted: 0, averageBestPercentage: null, passRate: null, timedOut: 0 });
  });
});
