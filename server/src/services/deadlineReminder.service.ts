import AssignmentModel from "../models/assignment.model";
import AssignmentSubmissionModel from "../models/assignmentSubmission.model";
import CourseModel from "../models/course.model";
import { getCourseStudentIds, notifyUsers } from "./notification.service";

export const REMINDER_WINDOW_MS = 24 * 60 * 60 * 1000;

// Pure: "should this student get a reminder?" - everyone enrolled who has not
// submitted yet. Kept separate so it can be tested without a database.
export const pickStudentsToRemind = (
  enrolledStudentIds: string[],
  submittedStudentIds: string[]
): string[] => {
  const submitted = new Set(submittedStudentIds.map(String));
  return [...new Set(enrolledStudentIds.map(String))].filter((id) => !submitted.has(id));
};

// Finds assignments due within the next 24 hours and reminds the students who
// haven't submitted. Runs hourly (see notification.controller.ts).
//
// Each assignment is reminded ONCE: we "claim" it by flipping
// deadlineReminderSent with a conditional update. If two servers run the cron
// at the same moment, only one wins the claim, so nobody gets two reminders.
export const sendDeadlineReminders = async (now: Date = new Date()) => {
  const due = await AssignmentModel.find({
    deadlineReminderSent: { $ne: true },
    deadline: { $gt: now, $lte: new Date(now.getTime() + REMINDER_WINDOW_MS) },
  });

  let reminded = 0;

  for (const assignment of due) {
    const claimed = await AssignmentModel.findOneAndUpdate(
      { _id: assignment._id, deadlineReminderSent: { $ne: true } },
      { deadlineReminderSent: true }
    );
    if (!claimed) continue; // another run already took it

    const [enrolled, submissions, course] = await Promise.all([
      getCourseStudentIds(String(assignment.course)),
      AssignmentSubmissionModel.find({ assignment: assignment._id }).select("student"),
      CourseModel.findById(assignment.course).select("name"),
    ]);

    const toRemind = pickStudentsToRemind(
      enrolled,
      submissions.map((s) => String(s.student))
    );

    reminded += await notifyUsers(
      toRemind,
      "Assignment due soon",
      `"${assignment.title}" in ${course?.name || "your course"} is due ${assignment.deadline.toLocaleString()}`,
      `/course-access/${assignment.course}/assignments`
    );
  }

  return { assignments: due.length, reminded };
};
