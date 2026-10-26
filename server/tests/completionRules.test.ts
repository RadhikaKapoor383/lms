import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPLETION_RULES, describeRules, parseCompletionRules, withDefaults,
} from "../src/services/completionRules.service";
import { computeEligibility } from "../src/services/certificate.service";

const Q1 = "64b7f0c2a1b2c3d4e5f60711";
const Q2 = "64b7f0c2a1b2c3d4e5f60712";
const ok = (body: any, quizIds = [Q1, Q2]) => {
  const r = parseCompletionRules(body, quizIds);
  if ("error" in r) throw new Error(r.error);
  return r.rules;
};
const err = (body: any, quizIds = [Q1, Q2]) => {
  const r = parseCompletionRules(body, quizIds);
  return "error" in r ? r.error : null;
};

describe("completion rules: reading and checking", () => {
  it("an older course with no rules gets the original rule", () => {
    expect(withDefaults(undefined)).toEqual(DEFAULT_COMPLETION_RULES);
    expect(withDefaults({ lessonPercent: 80 })).toEqual({ ...DEFAULT_COMPLETION_RULES, lessonPercent: 80 });
    expect(DEFAULT_COMPLETION_RULES).toMatchObject({ lessonPercent: 100, quizzes: "all", assignments: "none" });
  });
  it("accepts a full set of rules (numbers may come as text from a form)", () => {
    expect(ok({ lessonPercent: "80", quizzes: "selected", quizIds: [Q2, Q2], assignments: "passed", assignmentPassPercent: 60 })).toEqual({
      lessonPercent: 80, quizzes: "selected", quizIds: [Q2], assignments: "passed", assignmentPassPercent: 60,
    });
  });
  it("refuses out-of-range or fractional percentages and unknown choices", () => {
    expect(err({ lessonPercent: 0 })).toMatch(/1 to 100/);
    expect(err({ lessonPercent: 101 })).toMatch(/1 to 100/);
    expect(err({ lessonPercent: 50.5 })).toMatch(/1 to 100/);
    expect(err({ quizzes: "most" })).toMatch(/all, none, selected/);
    expect(err({ assignments: "graded" })).toMatch(/none, submitted, passed/);
    expect(err({ assignmentPassPercent: "abc" })).toMatch(/pass mark/);
    expect(err(null)).toBeTruthy();
  });
  it("selected quizzes must be this course's, and at least one", () => {
    expect(err({ quizzes: "selected", quizIds: ["64b7f0c2a1b2c3d4e5f60799"] })).toMatch(/does not belong/);
    expect(err({ quizzes: "selected", quizIds: [] })).toMatch(/at least one/);
    expect(err({ quizzes: "selected" })).toMatch(/Choose which/);
    expect(err({ quizzes: "selected", quizIds: [{ $ne: 1 }] })).toMatch(/Choose which/);
  });
  it("quiz ids are dropped unless 'selected'", () => {
    expect(ok({ quizzes: "all", quizIds: [Q1] }).quizIds).toEqual([]);
  });
  it("describes the rules in plain words", () => {
    expect(describeRules(DEFAULT_COMPLETION_RULES)).toEqual(["Finish every lesson", "Pass every quiz"]);
    expect(
      describeRules({ lessonPercent: 75, quizzes: "selected", quizIds: [Q1], assignments: "passed", assignmentPassPercent: 60 }, { [Q1]: "Final" })
    ).toEqual(["Finish at least 75% of the lessons", "Pass these quizzes: Final", "Score at least 60% on every assignment"]);
    expect(describeRules({ ...DEFAULT_COMPLETION_RULES, quizzes: "none", assignments: "submitted" })).toEqual([
      "Finish every lesson", "Submit every assignment",
    ]);
  });
});

describe("eligibility under a course's rules", () => {
  const quizzes = [
    { quizId: Q1, title: "Mid", passed: false },
    { quizId: Q2, title: "Final", passed: true },
  ];
  const assignments = [
    { assignmentId: "a1", title: "Essay", submitted: true, scorePercent: 70 },
    { assignmentId: "a2", title: "Project", submitted: true, scorePercent: null },
    { assignmentId: "a3", title: "Report", submitted: false, scorePercent: null },
  ];

  it("defaults behave exactly like before", () => {
    const r = computeEligibility(100, quizzes);
    expect(r.eligible).toBe(false);
    expect(r.pendingQuizzes).toEqual([{ quizId: Q1, title: "Mid" }]);
    expect(r.pendingAssignments).toEqual([]);
    expect(r.requiredLessonPercent).toBe(100);
  });
  it("a lower lesson share is enough", () => {
    const rules = { ...DEFAULT_COMPLETION_RULES, lessonPercent: 80, quizzes: "none" as const };
    expect(computeEligibility(80, quizzes, rules).eligible).toBe(true);
    expect(computeEligibility(79, quizzes, rules).eligible).toBe(false);
    expect(computeEligibility(0, [], { ...rules, lessonPercent: 1 }).eligible).toBe(false); // no lessons done / no lessons
  });
  it("only the selected quizzes count", () => {
    const rules = { ...DEFAULT_COMPLETION_RULES, quizzes: "selected" as const, quizIds: [Q2] };
    expect(computeEligibility(100, quizzes, rules).eligible).toBe(true);
    // a selected quiz that was deleted simply drops out
    expect(computeEligibility(100, [quizzes[0]], rules).eligible).toBe(true);
  });
  it("submitted: every assignment handed in, grades don't matter", () => {
    const rules = { ...DEFAULT_COMPLETION_RULES, quizzes: "none" as const, assignments: "submitted" as const };
    const r = computeEligibility(100, [], rules, assignments);
    expect(r.pendingAssignments).toEqual([{ assignmentId: "a3", title: "Report", reason: "not submitted" }]);
    expect(computeEligibility(100, [], rules, assignments.slice(0, 2)).eligible).toBe(true);
  });
  it("passed: graded at or above the pass mark", () => {
    const rules = { ...DEFAULT_COMPLETION_RULES, quizzes: "none" as const, assignments: "passed" as const, assignmentPassPercent: 70 };
    expect(computeEligibility(100, [], rules, assignments).pendingAssignments.map((a) => [a.title, a.reason])).toEqual([
      ["Project", "not graded yet"],
      ["Report", "not submitted"],
    ]);
    const low = [{ assignmentId: "a1", title: "Essay", submitted: true, scorePercent: 69.9 }];
    expect(computeEligibility(100, [], rules, low).pendingAssignments[0].reason).toBe("below the pass mark");
    expect(computeEligibility(100, [], rules, [assignments[0]]).eligible).toBe(true); // exactly 70%
  });
});
