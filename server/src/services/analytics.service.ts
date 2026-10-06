import { percent } from "./adminStats.service";

// The arithmetic behind the dashboards and analytics pages, as plain functions
// with no database, so each rule can be tested on its own. The controllers fetch
// rows and hand them to these.

export const DAY_MS = 24 * 60 * 60 * 1000;
export const INACTIVE_DAYS = 30; // no lesson finished for this long = "inactive"

const average = (nums: number[]) =>
  nums.length === 0 ? 0 : Math.round(nums.reduce((t, n) => t + n, 0) / nums.length);

// ---------------------------------------------------------------------------
// Time buckets (all in UTC, so the same data gives the same chart anywhere)
// ---------------------------------------------------------------------------

// Monday 00:00 UTC of the week containing `d`.
export const weekStart = (d: Date): Date => {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const sinceMonday = (day.getUTCDay() + 6) % 7; // Mon = 0 ... Sun = 6
  day.setUTCDate(day.getUTCDate() - sinceMonday);
  return day;
};

export interface IBucket {
  label: string;
  count: number;
}

// The last `weeks` weeks (this one included), oldest first, with zero-filled
// gaps so a quiet week still shows as a zero instead of vanishing from the chart.
export const weeklyBuckets = (dates: (Date | string)[], weeks: number, now: Date = new Date()): IBucket[] => {
  const current = weekStart(now);
  const buckets: IBucket[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(+current - i * 7 * DAY_MS);
    buckets.push({ label: start.toISOString().slice(0, 10), count: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.label, i]));
  for (const d of dates) {
    const i = index.get(weekStart(new Date(d)).toISOString().slice(0, 10));
    if (i !== undefined) buckets[i].count += 1;
  }
  return buckets;
};

// The last `months` calendar months (this one included), labelled "2026-10".
export const monthlyBuckets = (dates: (Date | string)[], months: number, now: Date = new Date()): IBucket[] => {
  const buckets: IBucket[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    buckets.push({ label: d.toISOString().slice(0, 7), count: 0 });
  }
  const index = new Map(buckets.map((b, i) => [b.label, i]));
  for (const d of dates) {
    const i = index.get(new Date(d).toISOString().slice(0, 7));
    if (i !== undefined) buckets[i].count += 1;
  }
  return buckets;
};

// ---------------------------------------------------------------------------
// Quiz and assignment performance
// ---------------------------------------------------------------------------

export interface IAttemptRow {
  quiz: any;
  student: any;
  percentage: number;
  passed: boolean;
}

// Judged on each student's BEST attempt at each quiz: someone who failed twice
// then passed counts as a pass, and retakes don't drag the average down.
export const summarizeQuizzes = (attempts: IAttemptRow[]) => {
  const best = new Map<string, { percentage: number; passed: boolean }>();
  for (const a of attempts) {
    const key = `${a.quiz}:${a.student}`;
    const current = best.get(key) || { percentage: -1, passed: false };
    best.set(key, {
      percentage: Math.max(current.percentage, a.percentage),
      passed: current.passed || a.passed,
    });
  }
  const results = [...best.values()];
  return {
    attempts: attempts.length,
    takers: results.length, // one per (student, quiz)
    averagePercentage: average(results.map((r) => r.percentage)),
    passRate: percent(results.filter((r) => r.passed).length, results.length),
  };
};

export interface ISubmissionRow {
  assignment: any;
  marks?: number | null;
  isLate: boolean;
}

// Average is over GRADED work only (an ungraded submission isn't a zero), as a
// percentage of that assignment's maximum marks.
export const summarizeAssignments = (submissions: ISubmissionRow[], maxMarksById: Map<string, number>) => {
  const graded = submissions.filter((s) => typeof s.marks === "number");
  const percentages: number[] = [];
  for (const s of graded) {
    const max = maxMarksById.get(String(s.assignment));
    if (max && max > 0) percentages.push(Math.min(100, ((s.marks as number) / max) * 100));
  }
  return {
    submissions: submissions.length,
    graded: graded.length,
    pendingGrading: submissions.length - graded.length,
    averagePercentage: average(percentages),
    lateRate: percent(submissions.filter((s) => s.isLate).length, submissions.length),
  };
};

// ---------------------------------------------------------------------------
// Engagement and drop-off
// ---------------------------------------------------------------------------

export interface IEnrollRow {
  course: any;
  student: any;
  status: string;
  createdAt: Date | string;
  completionPercentage?: number;
}

// key: `${course}:${student}` -> that student's latest lesson completion in that course
export type LastActivity = Map<string, Date | string>;
export const activityKey = (course: any, student: any) => `${course}:${student}`;

const cutoffFor = (now: Date, days: number) => +now - days * DAY_MS;

// "Stalled" (the drop-off measure): still marked active, joined more than 30
// days ago, and hasn't finished a lesson in the last 30 days (or never did).
// Students who completed haven't dropped off, and someone who joined last week
// hasn't had time to - neither is counted.
export const countStalled = (
  enrollments: IEnrollRow[],
  lastActivity: LastActivity,
  now: Date = new Date(),
  inactiveDays: number = INACTIVE_DAYS
) => {
  const cutoff = cutoffFor(now, inactiveDays);
  return enrollments.filter((e) => {
    if (e.status !== "active") return false;
    if (+new Date(e.createdAt) > cutoff) return false;
    const last = lastActivity.get(activityKey(e.course, e.student));
    return !last || +new Date(last) < cutoff;
  }).length;
};

export const countRecentlyActive = (
  enrollments: IEnrollRow[],
  lastActivity: LastActivity,
  now: Date = new Date(),
  days: number = INACTIVE_DAYS
) => {
  const cutoff = cutoffFor(now, days);
  return enrollments.filter((e) => {
    const last = lastActivity.get(activityKey(e.course, e.student));
    return !!last && +new Date(last) >= cutoff;
  }).length;
};

// One course's numbers.
export const analyzeCourse = (
  course: { _id: any; name: string; status: string },
  enrollments: IEnrollRow[],
  lastActivity: LastActivity,
  attempts: IAttemptRow[],
  submissions: ISubmissionRow[],
  maxMarksById: Map<string, number>,
  now: Date = new Date()
) => {
  const completed = enrollments.filter((e) => e.status === "completed").length;
  const stalled = countStalled(enrollments, lastActivity, now);
  return {
    _id: course._id,
    name: course.name,
    status: course.status,
    enrolled: enrollments.length,
    completed,
    completionRate: percent(completed, enrollments.length),
    stalled,
    dropOffRate: percent(stalled, enrollments.length),
    activeLearners: countRecentlyActive(enrollments, lastActivity, now),
    quiz: summarizeQuizzes(attempts),
    assignment: summarizeAssignments(submissions, maxMarksById),
  };
};

// Totals across several courses' rows. (Quiz and assignment totals are NOT
// built from these rows - averaging averages would be wrong - the controller
// summarizes the raw attempts and submissions once instead.)
export const combineCourseRows = (rows: ReturnType<typeof analyzeCourse>[]) => {
  const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((t, r) => t + pick(r), 0);
  const enrolled = sum((r) => r.enrolled);
  const completed = sum((r) => r.completed);
  const stalled = sum((r) => r.stalled);
  return {
    enrolled,
    completed,
    completionRate: percent(completed, enrolled),
    stalled,
    dropOffRate: percent(stalled, enrolled),
    activeLearners: sum((r) => r.activeLearners),
  };
};

// ---------------------------------------------------------------------------
// Student side
// ---------------------------------------------------------------------------

// Mean progress across everything the student is in. A finished course counts as 100.
export const averageProgress = (enrollments: { status: string; completionPercentage: number }[]) =>
  average(enrollments.map((e) => (e.status === "completed" ? 100 : e.completionPercentage || 0)));

// "Continue learning": the unfinished course the student touched most recently
// (or, if they never started any, the one they joined most recently).
export const pickContinueLearning = <T extends IEnrollRow & { completionPercentage: number }>(
  enrollments: T[],
  lastActivityByCourse: Map<string, Date | string>
): T | null => {
  const inProgress = enrollments.filter((e) => e.status === "active" && e.completionPercentage < 100);
  if (inProgress.length === 0) return null;
  const touched = (e: T) => +new Date(lastActivityByCourse.get(String(e.course)) || e.createdAt);
  return [...inProgress].sort((a, b) => touched(b) - touched(a))[0];
};

// Assignments still to do that fall due within the next `days` days, soonest first.
export const upcomingDeadlines = <T extends { _id: any; deadline: Date | string }>(
  assignments: T[],
  submittedIds: Set<string>,
  now: Date = new Date(),
  days: number = 14
): T[] =>
  assignments
    .filter((a) => {
      const due = +new Date(a.deadline);
      return !submittedIds.has(String(a._id)) && due >= +now && due <= +now + days * DAY_MS;
    })
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline));

export interface ICandidate {
  _id: any;
  name: string;
  category?: string;
  ratings?: number;
  enrolled: number;
}

// Courses to suggest: not already taken, those in categories the student has
// already shown interest in first, then by rating, then by popularity.
export const recommendCourses = <T extends ICandidate>(
  candidates: T[],
  takenCourseIds: Set<string>,
  interestCategoryIds: Set<string>,
  limit: number = 4
): T[] => {
  const inInterest = (c: T) => (c.category && interestCategoryIds.has(String(c.category)) ? 1 : 0);
  return candidates
    .filter((c) => !takenCourseIds.has(String(c._id)))
    .sort(
      (a, b) =>
        inInterest(b) - inInterest(a) ||
        (b.ratings || 0) - (a.ratings || 0) ||
        b.enrolled - a.enrolled ||
        a.name.localeCompare(b.name)
    )
    .slice(0, limit);
};
