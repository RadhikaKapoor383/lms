// Numbers for the admin's instructor monitoring. All the arithmetic is here, as
// plain functions with no database, so it can be tested on its own; the
// controller only fetches the rows and hands them over.

export const percent = (part: number, total: number): number =>
  total === 0 ? 0 : Math.round((part / total) * 100);

export interface ICourseRow {
  _id: any;
  name: string;
  status: string;
  instructor?: any;
  ratings?: number;
  updatedAt?: Date;
}

// One row per (course, student) that is still in the course. Students who were
// removed ("revoked") are left out before they get here.
export interface IEnrollmentRow {
  course: any;
  student: any;
  status: string; // "active" | "completed"
}

export const buildCourseStats = (courses: ICourseRow[], enrollments: IEnrollmentRow[]) => {
  const byCourse = new Map<string, { students: number; completed: number }>();
  for (const e of enrollments) {
    const key = String(e.course);
    const entry = byCourse.get(key) || { students: 0, completed: 0 };
    entry.students += 1;
    if (e.status === "completed") entry.completed += 1;
    byCourse.set(key, entry);
  }

  return courses.map((c) => {
    const { students = 0, completed = 0 } = byCourse.get(String(c._id)) || {};
    return {
      _id: c._id,
      name: c.name,
      status: c.status,
      ratings: c.ratings || 0,
      updatedAt: c.updatedAt,
      students,
      completed,
      completionRate: percent(completed, students),
    };
  });
};

// One instructor's totals. "students" counts each person once, even if they
// are in several of that instructor's courses.
export const summarizeInstructor = (
  courseStats: ReturnType<typeof buildCourseStats>,
  enrollments: IEnrollmentRow[]
) => {
  const count = (status: string) => courseStats.filter((c) => c.status === status).length;
  const learners = new Set(enrollments.map((e) => String(e.student)));
  const enrollmentCount = enrollments.length;
  const completedCount = enrollments.filter((e) => e.status === "completed").length;

  return {
    courses: courseStats.length,
    published: count("Published"),
    pending: count("Pending Approval"),
    draft: count("Draft"),
    rejected: count("Rejected"),
    archived: count("Archived"),
    students: learners.size,
    enrollments: enrollmentCount,
    completionRate: percent(completedCount, enrollmentCount),
  };
};

// Split the flat enrollment rows by the instructor who owns each course today.
// (Not by Enrollment.instructor: that is only the owner at enrollment time and
// goes stale when an admin reassigns a course.)
export const groupByInstructor = (courses: ICourseRow[], enrollments: IEnrollmentRow[]) => {
  const owner = new Map(courses.map((c) => [String(c._id), String(c.instructor)]));
  const result = new Map<string, { courses: ICourseRow[]; enrollments: IEnrollmentRow[] }>();

  for (const c of courses) {
    const key = String(c.instructor);
    if (!result.has(key)) result.set(key, { courses: [], enrollments: [] });
    result.get(key)!.courses.push(c);
  }
  for (const e of enrollments) {
    const key = owner.get(String(e.course));
    if (key && result.has(key)) result.get(key)!.enrollments.push(e);
  }
  return result;
};
