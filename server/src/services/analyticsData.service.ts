import CourseModel from "../models/course.model";
import EnrollmentModel from "../models/enrollment.model";
import LessonProgressModel from "../models/lessonProgress.model";
import QuizAttemptModel from "../models/quizAttempt.model";
import AssignmentModel from "../models/assignment.model";
import AssignmentSubmissionModel from "../models/assignmentSubmission.model";
import { percent } from "./adminStats.service";
import {
  DAY_MS,
  INACTIVE_DAYS,
  IAttemptRow,
  IEnrollRow,
  ISubmissionRow,
  LastActivity,
  activityKey,
  analyzeCourse,
  combineCourseRows,
  summarizeAssignments,
  summarizeQuizzes,
  weeklyBuckets,
} from "./analytics.service";

const IN_COURSE = ["active", "completed"];

const groupBy = <T>(items: T[], key: (item: T) => string) => {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(item);
  }
  return groups;
};

// Fetches what the analytics pages need for a set of courses (all of them for
// an admin, one instructor's for an instructor) with one query per kind of
// data - not one per course - and hands it to the pure functions in
// analytics.service.ts.
export const loadCourseAnalytics = async (courseFilter: Record<string, any>, now: Date = new Date()) => {
  const courses = await CourseModel.find(courseFilter).select("name status instructor createdAt").lean();
  const ids = courses.map((c) => c._id);

  const eightWeeksAgo = new Date(+now - 8 * 7 * DAY_MS);
  const [enrollments, lastRows, recentLessons, attempts, assignments, submissions] = await Promise.all([
    EnrollmentModel.find({ course: { $in: ids }, status: { $in: IN_COURSE } })
      .select("course student status createdAt")
      .lean(),
    // per (course, student): the date of their latest finished lesson
    LessonProgressModel.aggregate([
      { $match: { course: { $in: ids } } },
      { $group: { _id: { course: "$course", student: "$student" }, last: { $max: "$completedAt" } } },
    ]),
    LessonProgressModel.find({ course: { $in: ids }, completedAt: { $gte: eightWeeksAgo } })
      .select("completedAt")
      .lean(),
    QuizAttemptModel.find({ course: { $in: ids } }).select("quiz course student percentage passed").lean(),
    AssignmentModel.find({ course: { $in: ids } }).select("course maxMarks").lean(),
    AssignmentSubmissionModel.find({ course: { $in: ids } }).select("assignment course marks isLate").lean(),
  ]);

  const lastActivity: LastActivity = new Map(
    lastRows.map((r: any) => [activityKey(r._id.course, r._id.student), r.last])
  );
  const maxMarks = new Map<string, number>(assignments.map((a: any) => [String(a._id), a.maxMarks]));

  const enrollByCourse = groupBy(enrollments as any as (IEnrollRow & { course: any })[], (e) => String(e.course));
  const attemptsByCourse = groupBy(attempts as any as (IAttemptRow & { course: any })[], (a) => String(a.course));
  const submissionsByCourse = groupBy(submissions as any as (ISubmissionRow & { course: any })[], (s) => String(s.course));

  const rows = courses.map((c: any) =>
    analyzeCourse(
      c,
      enrollByCourse.get(String(c._id)) || [],
      lastActivity,
      attemptsByCourse.get(String(c._id)) || [],
      submissionsByCourse.get(String(c._id)) || [],
      maxMarks,
      now
    )
  );

  // Engagement counts each PERSON once, however many of these courses they are in.
  const cutoff = +now - INACTIVE_DAYS * DAY_MS;
  const learners = new Set((enrollments as any[]).map((e) => String(e.student)));
  const activeLearners = new Set(
    lastRows.filter((r: any) => +new Date(r.last) >= cutoff).map((r: any) => String(r._id.student))
  );

  return {
    courses,
    enrollments: enrollments as any[],
    rows,
    totals: combineCourseRows(rows),
    quiz: summarizeQuizzes(attempts as any),
    assignment: summarizeAssignments(submissions as any, maxMarks),
    weeklyLessons: weeklyBuckets(
      recentLessons.map((l: any) => l.completedAt),
      8,
      now
    ),
    engagement: {
      learners: learners.size,
      activeLearners: activeLearners.size,
      activeRate: percent(activeLearners.size, learners.size),
      windowDays: INACTIVE_DAYS,
    },
  };
};
