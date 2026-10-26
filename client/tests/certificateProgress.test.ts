import { describe, expect, it } from "vitest";
import { pendingSteps } from "../src/utils/certificateProgress";

describe("what's left for the certificate", () => {
  it("lists lessons, quizzes and assignments still to do", () => {
    expect(
      pendingSteps({
        lessonsComplete: false,
        completionPercentage: 42.6,
        requiredLessonPercent: 80,
        pendingQuizzes: [{ quizId: "q", title: "Final" }],
        pendingAssignments: [
          { assignmentId: "a", title: "Essay", reason: "not submitted" },
          { assignmentId: "b", title: "Project", reason: "not graded yet" },
          { assignmentId: "c", title: "Report", reason: "below the pass mark" },
        ],
      })
    ).toEqual([
      "Finish at least 80% of the lessons (you're at 43%)",
      'Pass the quiz "Final"',
      'Submit the assignment "Essay"',
      'Wait for "Project" to be graded',
      'Score the pass mark on "Report" (resubmit if allowed)',
    ]);
  });
  it("works with an older server that sends no rule details", () => {
    expect(pendingSteps({ lessonsComplete: false, completionPercentage: 10, pendingQuizzes: [] })).toEqual([
      "Finish every lesson (you're at 10%)",
    ]);
  });
  it("nothing left once a certificate exists", () => {
    expect(pendingSteps({ certificate: { certificateId: "x" }, lessonsComplete: false })).toEqual([]);
    expect(pendingSteps(undefined)).toEqual([]);
  });
});
