import { escapeRegex } from "./courseSearch.service";

// The instructor's "all my students / assignments / quizzes" pages. The rules
// below (reading the query string, counting) are kept free of Express and
// MongoDB so they can be tested on their own.

export const STUDENT_STATUS_FILTERS = ["active", "completed"] as const;
export type StudentStatusFilter = (typeof STUDENT_STATUS_FILTERS)[number];

export interface IStudentListQuery {
  page: number;
  limit: number;
  q?: string;
  courseId?: string;
  status?: StudentStatusFilter;
}

const asString = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

// Reads and validates the query string. A bad value is a clear error, not
// something quietly ignored (a typo in a filter silently showing everyone).
export const parseStudentListQuery = (
  query: Record<string, unknown>
): { value: IStudentListQuery } | { error: string } => {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1) return { error: "page must be a whole number from 1" };
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return { error: "limit must be a whole number from 1 to 100" };
  }

  const value: IStudentListQuery = { page, limit };

  if (query.q !== undefined) {
    const q = asString(query.q);
    if (q === undefined) return { error: "q must be text" };
    const trimmed = q.trim();
    if (trimmed.length > 100) return { error: "q can be at most 100 characters" };
    if (trimmed) value.q = trimmed;
  }
  if (query.courseId !== undefined && query.courseId !== "") {
    const id = asString(query.courseId);
    if (id === undefined || !/^[0-9a-fA-F]{24}$/.test(id)) return { error: "courseId is not valid" };
    value.courseId = id;
  }
  if (query.status !== undefined && query.status !== "") {
    const s = asString(query.status);
    if (!s || !(STUDENT_STATUS_FILTERS as readonly string[]).includes(s)) {
      return { error: `status must be one of: ${STUDENT_STATUS_FILTERS.join(", ")}` };
    }
    value.status = s as StudentStatusFilter;
  }
  return { value };
};

// Case-insensitive "contains" match that treats what was typed literally
// (so "a.b" doesn't mean "a, any letter, b").
export const containsRegex = (text: string): RegExp => new RegExp(escapeRegex(text), "i");

// ---------------------------------------------------------------- assignments
export interface IAssignmentCounts {
  submitted: number;
  graded: number;
  toGrade: number;
  late: number;
}

// Counts one assignment's submissions. "Graded" = the instructor has graded it.
export const tallySubmissions = (
  submissions: { gradedAt?: Date | null; isLate?: boolean }[]
): IAssignmentCounts => {
  const submitted = submissions.length;
  const graded = submissions.filter((s) => !!s.gradedAt).length;
  const late = submissions.filter((s) => s.isLate).length;
  return { submitted, graded, toGrade: submitted - graded, late };
};

// ---------------------------------------------------------------------- quizzes
export interface IQuizStats {
  attempts: number;
  studentsAttempted: number;
  averageBestPercentage: number | null; // average of each student's best score
  passRate: number | null; // % of students who passed at least once
  timedOut: number;
}

export const tallyQuizAttempts = (
  attempts: { student: unknown; percentage: number; passed: boolean; timedOut?: boolean }[]
): IQuizStats => {
  const byStudent = new Map<string, { best: number; passed: boolean }>();
  for (const a of attempts) {
    const key = String(a.student);
    const cur = byStudent.get(key) || { best: 0, passed: false };
    byStudent.set(key, { best: Math.max(cur.best, a.percentage), passed: cur.passed || a.passed });
  }
  const students = [...byStudent.values()];
  const n = students.length;
  return {
    attempts: attempts.length,
    studentsAttempted: n,
    averageBestPercentage: n ? Math.round((students.reduce((s, x) => s + x.best, 0) / n) * 10) / 10 : null,
    passRate: n ? Math.round((students.filter((x) => x.passed).length / n) * 1000) / 10 : null,
    timedOut: attempts.filter((a) => a.timedOut).length,
  };
};
