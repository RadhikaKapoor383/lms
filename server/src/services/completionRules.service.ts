// What a student must do in a course to count as having completed it (and so
// earn its certificate). Set per course by its instructor or an admin. A course
// that never set any gets the defaults, which are the rule the platform always
// had: every lesson, every quiz passed, assignments not required.
// No database in here, so it can be tested on its own.

export const QUIZ_RULES = ["all", "none", "selected"] as const;
export const ASSIGNMENT_RULES = ["none", "submitted", "passed"] as const;

export interface ICompletionRules {
  lessonPercent: number; // 1-100: share of lessons to finish
  quizzes: (typeof QUIZ_RULES)[number]; // which quizzes must be passed
  quizIds: string[]; // only for "selected"
  assignments: (typeof ASSIGNMENT_RULES)[number]; // none / every one submitted / every one passed
  assignmentPassPercent: number; // 1-100, for "passed": marks / max marks
}

export const DEFAULT_COMPLETION_RULES: ICompletionRules = {
  lessonPercent: 100,
  quizzes: "all",
  quizIds: [],
  assignments: "none",
  assignmentPassPercent: 50,
};

// A stored value (possibly partial, or missing for an older course) as full rules.
export const withDefaults = (stored: any): ICompletionRules => {
  const s = stored && typeof stored === "object" ? stored : {};
  return {
    lessonPercent: typeof s.lessonPercent === "number" ? s.lessonPercent : DEFAULT_COMPLETION_RULES.lessonPercent,
    quizzes: (QUIZ_RULES as readonly string[]).includes(s.quizzes) ? s.quizzes : DEFAULT_COMPLETION_RULES.quizzes,
    quizIds: Array.isArray(s.quizIds) ? s.quizIds.map(String) : [],
    assignments: (ASSIGNMENT_RULES as readonly string[]).includes(s.assignments)
      ? s.assignments
      : DEFAULT_COMPLETION_RULES.assignments,
    assignmentPassPercent:
      typeof s.assignmentPassPercent === "number" ? s.assignmentPassPercent : DEFAULT_COMPLETION_RULES.assignmentPassPercent,
  };
};

const wholePercent = (v: unknown): number | null => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 100 ? n : null;
};

// Checks rules sent from the form. `courseQuizIds` are the quizzes that really
// belong to the course: a "selected" quiz must be one of them.
export const parseCompletionRules = (
  body: any,
  courseQuizIds: string[]
): { rules: ICompletionRules } | { error: string } => {
  if (!body || typeof body !== "object") return { error: "Send the completion rules" };
  const rules = withDefaults(undefined);

  if (body.lessonPercent !== undefined) {
    const n = wholePercent(body.lessonPercent);
    if (n === null) return { error: "Lessons to finish must be a whole percentage from 1 to 100" };
    rules.lessonPercent = n;
  }

  if (body.quizzes !== undefined) {
    if (!(QUIZ_RULES as readonly string[]).includes(body.quizzes)) {
      return { error: `Quizzes must be one of: ${QUIZ_RULES.join(", ")}` };
    }
    rules.quizzes = body.quizzes;
  }
  if (rules.quizzes === "selected") {
    if (!Array.isArray(body.quizIds) || body.quizIds.some((q: unknown) => typeof q !== "string")) {
      return { error: "Choose which quizzes must be passed" };
    }
    const known = new Set(courseQuizIds.map(String));
    const picked = [...new Set(body.quizIds as string[])];
    if (picked.some((q) => !known.has(q))) return { error: "A chosen quiz does not belong to this course" };
    if (picked.length === 0) return { error: "Choose at least one quiz, or pick \"none\"" };
    rules.quizIds = picked;
  }

  if (body.assignments !== undefined) {
    if (!(ASSIGNMENT_RULES as readonly string[]).includes(body.assignments)) {
      return { error: `Assignments must be one of: ${ASSIGNMENT_RULES.join(", ")}` };
    }
    rules.assignments = body.assignments;
  }
  if (body.assignmentPassPercent !== undefined) {
    const n = wholePercent(body.assignmentPassPercent);
    if (n === null) return { error: "Assignment pass mark must be a whole percentage from 1 to 100" };
    rules.assignmentPassPercent = n;
  }

  return { rules };
};

// One line per requirement, for the student ("what do I still need?") and the
// instructor ("what did I set?").
export const describeRules = (rules: ICompletionRules, quizTitles: Record<string, string> = {}): string[] => {
  const lines = [rules.lessonPercent >= 100 ? "Finish every lesson" : `Finish at least ${rules.lessonPercent}% of the lessons`];
  if (rules.quizzes === "all") lines.push("Pass every quiz");
  if (rules.quizzes === "selected") {
    const names = rules.quizIds.map((id) => quizTitles[id]).filter(Boolean);
    lines.push(names.length ? `Pass these quizzes: ${names.join(", ")}` : "Pass the chosen quizzes");
  }
  if (rules.assignments === "submitted") lines.push("Submit every assignment");
  if (rules.assignments === "passed") lines.push(`Score at least ${rules.assignmentPassPercent}% on every assignment`);
  return lines;
};
