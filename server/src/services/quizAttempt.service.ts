import QuizAttemptModel from "../models/quizAttempt.model";
import QuizStartModel from "../models/quizStart.model";
import { IQuiz } from "../models/quiz.model";
import { QUIZ_GRACE_MS } from "./quizTiming.service";

// When the time on a quiz runs out, that attempt is USED UP. It is recorded
// with a score of 0 and "timedOut" = true. Answers that arrive after the
// deadline are not graded.
//
// This also covers a student who starts a timed quiz and just leaves: nobody
// has to submit anything - the next time the quiz is looked at or started, the
// expired attempt is settled (see settleExpiredStart). Without this, closing
// the tab would be a free way to read the questions without spending an attempt.

export const recordTimedOutAttempt = async (
  quiz: IQuiz,
  studentId: unknown,
  startedAt: Date
) => {
  const attemptsUsed = await QuizAttemptModel.countDocuments({
    quiz: quiz._id,
    student: studentId,
  });
  const totalMarks = quiz.questions.reduce((sum, q) => sum + q.marks, 0);

  return QuizAttemptModel.create({
    quiz: quiz._id,
    course: quiz.course,
    student: studentId,
    answers: [],
    score: 0,
    totalMarks,
    percentage: 0,
    passed: false,
    attemptNumber: attemptsUsed + 1,
    startedAt,
    submittedAt: new Date(),
    timedOut: true,
  });
};

// If this student has a timed attempt that has run past its deadline and was
// never submitted, record it as timed out. Returns true if it did.
//
// The delete is atomic AND conditional on the deadline, so if several requests
// arrive together only one of them gets the record - no double counting.
export const settleExpiredStart = async (quiz: IQuiz, studentId: unknown): Promise<boolean> => {
  if (!quiz.timeLimitMinutes) return false;

  const cutoff = new Date(Date.now() - quiz.timeLimitMinutes * 60 * 1000 - QUIZ_GRACE_MS);
  const expired = await QuizStartModel.findOneAndDelete({
    quiz: quiz._id,
    student: studentId,
    startedAt: { $lt: cutoff },
  });
  if (!expired) return false;

  await recordTimedOutAttempt(quiz, studentId, expired.startedAt);
  return true;
};
