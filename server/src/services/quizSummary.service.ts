// How a student is doing on one quiz, worked out from their attempts. Pure
// (no database), so the rules can be tested on their own.

export interface IAttemptLite {
  percentage: number;
  passed: boolean;
  submittedAt: Date;
}

export type QuizStatus = "not_started" | "in_progress" | "passed" | "no_attempts_left";

export interface IQuizSummary {
  attemptsUsed: number;
  attemptsRemaining: number;
  bestPercentage: number | null; // null = never attempted
  passed: boolean;
  lastAttemptAt: Date | null;
  status: QuizStatus;
}

export const summarizeAttempts = (attempts: IAttemptLite[], maxAttempts: number): IQuizSummary => {
  const attemptsUsed = attempts.length;
  const attemptsRemaining = Math.max(0, maxAttempts - attemptsUsed);
  const passed = attempts.some((a) => a.passed);
  const bestPercentage = attemptsUsed ? Math.max(...attempts.map((a) => a.percentage)) : null;
  const lastAttemptAt = attemptsUsed
    ? new Date(Math.max(...attempts.map((a) => new Date(a.submittedAt).getTime())))
    : null;

  const status: QuizStatus = passed
    ? "passed"
    : attemptsUsed === 0
    ? "not_started"
    : attemptsRemaining === 0
    ? "no_attempts_left"
    : "in_progress";

  return { attemptsUsed, attemptsRemaining, bestPercentage, passed, lastAttemptAt, status };
};
