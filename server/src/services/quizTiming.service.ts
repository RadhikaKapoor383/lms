// When does a timed quiz attempt run out? Kept free of Express/Mongoose so the
// rule can be tested on its own.

// A little extra time for the network: the page auto-submits the moment its
// countdown hits zero, and that request needs a moment to arrive.
export const QUIZ_GRACE_MS = 10 * 1000;

export const quizDeadline = (startedAt: Date, limitMinutes: number): number =>
  startedAt.getTime() + limitMinutes * 60 * 1000 + QUIZ_GRACE_MS;

// A quiz with no time limit never runs out.
export const isPastQuizDeadline = (
  startedAt: Date,
  limitMinutes: number | undefined | null,
  now: number = Date.now()
): boolean => !!limitMinutes && now > quizDeadline(startedAt, limitMinutes);
