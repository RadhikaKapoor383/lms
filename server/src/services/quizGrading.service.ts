// Grading and validation rules for quiz questions, kept free of Express and
// Mongoose so they can be tested on their own.

export const QUESTION_TYPES = ["single", "multiple", "trueFalse", "shortAnswer"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const MAX_ACCEPTED_ANSWERS = 10;
export const MAX_ANSWER_LENGTH = 200;
export const MAX_TEXT_ANSWER_LENGTH = 500;

// "  Photo   Synthesis " and "photo synthesis" count as the same answer.
export const normalizeAnswer = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

export const isShortAnswerCorrect = (given: unknown, accepted: string[]): boolean => {
  if (typeof given !== "string") return false;
  const g = normalizeAnswer(given);
  if (!g) return false;
  return accepted.some((a) => normalizeAnswer(a) === g);
};

// A choice question is right only if the student picked EXACTLY the correct set.
export const isChoiceCorrect = (selected: Set<number>, correct: Set<number>): boolean =>
  selected.size === correct.size && [...selected].every((i) => correct.has(i));

// Returns an error message for a bad question, or null if it's fine.
export const validateQuestion = (q: any): string | null => {
  if (!q || typeof q !== "object") return "Invalid question";
  const label = `"${typeof q.questionText === "string" ? q.questionText : "A question"}"`;

  if (typeof q.questionText !== "string" || !q.questionText.trim()) {
    return "Every question needs some text";
  }
  if (!(QUESTION_TYPES as readonly string[]).includes(q.type)) {
    return `${label} has an unknown question type`;
  }
  if (q.marks !== undefined && !(typeof q.marks === "number" && q.marks >= 1)) {
    return `${label}: marks must be at least 1`;
  }

  if (q.type === "shortAnswer") {
    if (!Array.isArray(q.acceptedAnswers)) return `${label} needs at least one accepted answer`;
    const answers = q.acceptedAnswers.filter(
      (a: unknown) => typeof a === "string" && a.trim() !== ""
    );
    if (answers.length === 0) return `${label} needs at least one accepted answer`;
    if (answers.length > MAX_ACCEPTED_ANSWERS) {
      return `${label} can have at most ${MAX_ACCEPTED_ANSWERS} accepted answers`;
    }
    if (answers.some((a: string) => a.length > MAX_ANSWER_LENGTH)) {
      return `${label}: each accepted answer can be at most ${MAX_ANSWER_LENGTH} characters`;
    }
    return null;
  }

  if (!Array.isArray(q.options) || q.options.length < 2) {
    return "Every question needs at least 2 options";
  }
  if (q.options.some((o: any) => typeof o?.text !== "string" || !o.text.trim())) {
    return `${label} has an empty option`;
  }
  const correctCount = q.options.filter((o: any) => o.isCorrect === true).length;
  if (correctCount === 0) return `${label} has no correct option set`;
  if (q.type !== "multiple" && correctCount !== 1) {
    return `${label} must have exactly one correct option`;
  }
  if (q.type === "trueFalse" && q.options.length !== 2) {
    return `${label} must have exactly 2 options`;
  }
  return null;
};

// Keeps only the fields a question is allowed to have for its type, so a
// short-answer question can't carry stray options and vice versa.
export const normalizeQuestion = (q: any) => {
  const base = {
    questionText: q.questionText.trim(),
    type: q.type as QuestionType,
    marks: typeof q.marks === "number" ? q.marks : 1,
  };
  if (q.type === "shortAnswer") {
    return {
      ...base,
      options: [],
      acceptedAnswers: q.acceptedAnswers
        .filter((a: unknown) => typeof a === "string" && a.trim() !== "")
        .map((a: string) => a.trim()),
    };
  }
  return {
    ...base,
    acceptedAnswers: [],
    options: q.options.map((o: any) => ({ text: o.text.trim(), isCorrect: o.isCorrect === true })),
  };
};
