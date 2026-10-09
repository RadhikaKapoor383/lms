import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import QuizModel, { IQuizQuestion } from "../models/quiz.model";
import QuizAttemptModel from "../models/quizAttempt.model";
import QuizStartModel from "../models/quizStart.model";
import {
  MAX_TEXT_ANSWER_LENGTH,
  isChoiceCorrect,
  isShortAnswerCorrect,
  normalizeQuestion,
  validateQuestion,
} from "../services/quizGrading.service";
import CourseModel from "../models/course.model";
import NotificationModel from "../models/notification.model";
import { tryIssueCertificate } from "../services/certificate.service";
import { notifyCourseStudents } from "../services/notification.service";
import { hasCourseContentAccess } from "../services/enrollment.service";
import { logActivity } from "../utils/auditLog";

// ------------------- Strip answer keys before anything reaches a student -------------------
// Question ORDER is shuffled here when randomizeQuestions is on; each
// question's own options array is never reordered (see quizAttempt.model.ts
// for why that matters for grading-by-index).
const shuffle = <T>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const sanitizeQuizForStudent = (quiz: any) => {
  const questions = quiz.randomizeQuestions ? shuffle(quiz.questions) : quiz.questions;
  return {
    _id: quiz._id,
    course: quiz.course,
    title: quiz.title,
    description: quiz.description,
    timeLimitMinutes: quiz.timeLimitMinutes,
    maxAttempts: quiz.maxAttempts,
    passingScore: quiz.passingScore,
    questions: questions.map((q: IQuizQuestion) => ({
      _id: q._id,
      questionText: q.questionText,
      type: q.type,
      marks: q.marks,
      options: q.options.map((o) => ({ _id: o._id, text: o.text })),
    })),
  };
};

// ------------------- Create (admin, or the instructor who owns the course) -------------------
// Route is keyed by :id = courseId, guarded by authorizeCourseOwner.

export const createQuiz = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const {
        title,
        description,
        questions,
        timeLimitMinutes,
        maxAttempts,
        passingScore,
        randomizeQuestions,
        showResultsImmediately,
      } = req.body;

      if (!title || !Array.isArray(questions) || questions.length === 0) {
        return next(new ErrorHandler("title and at least one question are required", 400));
      }
      for (const q of questions) {
        const problem = validateQuestion(q);
        if (problem) {
          return next(new ErrorHandler(problem, 400));
        }
      }
      if (
        timeLimitMinutes !== undefined &&
        timeLimitMinutes !== null &&
        !(Number.isInteger(timeLimitMinutes) && timeLimitMinutes >= 0 && timeLimitMinutes <= 600)
      ) {
        return next(new ErrorHandler("Time limit must be 0 to 600 minutes", 400));
      }
      if (maxAttempts !== undefined && !(Number.isInteger(maxAttempts) && maxAttempts >= 1 && maxAttempts <= 20)) {
        return next(new ErrorHandler("Attempts must be a whole number from 1 to 20", 400));
      }
      if (passingScore !== undefined && !(typeof passingScore === "number" && passingScore >= 0 && passingScore <= 100)) {
        return next(new ErrorHandler("Passing score must be between 0 and 100", 400));
      }

      const course = await CourseModel.findById(courseId).select("instructor name");
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      const instructor = course.instructor || req.user?._id;

      const quiz = await QuizModel.create({
        course: courseId,
        instructor,
        title,
        description,
        questions: questions.map(normalizeQuestion),
        timeLimitMinutes: timeLimitMinutes || undefined,
        maxAttempts,
        passingScore,
        randomizeQuestions: !!randomizeQuestions,
        showResultsImmediately: showResultsImmediately !== false,
      });

      logActivity(req, "quiz.create", `Created quiz "${title}" for "${course.name}"`, {
        quizId: quiz._id,
        courseId,
      });

      await notifyCourseStudents(
        courseId,
        "New quiz available",
        `"${title}" is now available in ${course.name}`,
        `/course-access/${courseId}/quizzes`
      );

      res.status(201).json({ success: true, quiz });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Edit (admin, or the owning instructor) -------------------

export const editQuiz = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        title,
        description,
        questions,
        timeLimitMinutes,
        maxAttempts,
        passingScore,
        randomizeQuestions,
        showResultsImmediately,
      } = req.body;

      const quiz = await QuizModel.findByIdAndUpdate(
        req.params.id,
        {
          ...(title !== undefined && { title }),
          ...(description !== undefined && { description }),
          ...(questions !== undefined && { questions }),
          ...(timeLimitMinutes !== undefined && { timeLimitMinutes }),
          ...(maxAttempts !== undefined && { maxAttempts }),
          ...(passingScore !== undefined && { passingScore }),
          ...(randomizeQuestions !== undefined && { randomizeQuestions: !!randomizeQuestions }),
          ...(showResultsImmediately !== undefined && { showResultsImmediately: !!showResultsImmediately }),
        },
        { new: true, runValidators: true }
      );

      if (!quiz) {
        return next(new ErrorHandler("Quiz not found", 404));
      }

      res.status(200).json({ success: true, quiz });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Delete (admin, or the owning instructor) -------------------

export const deleteQuiz = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quiz = await QuizModel.findByIdAndDelete(req.params.id);
      if (!quiz) {
        return next(new ErrorHandler("Quiz not found", 404));
      }
      await QuizAttemptModel.deleteMany({ quiz: quiz._id });
      res.status(200).json({ success: true, message: "Quiz deleted" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- List a course's quizzes (metadata only - no questions) -------------------

export const getCourseQuizzes = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;

      const allowed = await hasCourseContentAccess(req.user?.role, String(req.user?._id), courseId);
      if (!allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      const quizzes = await QuizModel.find({ course: courseId }).select("-questions");

      if (req.user?.role === "student") {
        const attempts = await QuizAttemptModel.find({
          course: courseId,
          student: req.user._id,
        }).select("quiz score totalMarks percentage passed attemptNumber submittedAt");

        const attemptsByQuiz = new Map<string, any[]>();
        for (const a of attempts) {
          const key = String(a.quiz);
          if (!attemptsByQuiz.has(key)) attemptsByQuiz.set(key, []);
          attemptsByQuiz.get(key)!.push(a);
        }

        const withAttempts = quizzes.map((q) => ({
          ...q.toObject(),
          attempts: attemptsByQuiz.get(String(q._id)) || [],
        }));
        return res.status(200).json({ success: true, quizzes: withAttempts });
      }

      const counts = await QuizAttemptModel.aggregate([
        { $match: { course: new mongoose.Types.ObjectId(courseId) } },
        { $group: { _id: "$quiz", count: { $sum: 1 } } },
      ]);
      const countByQuiz = new Map(counts.map((c) => [String(c._id), c.count]));

      const withCounts = quizzes.map((q) => ({
        ...q.toObject(),
        attemptCount: countByQuiz.get(String(q._id)) || 0,
      }));

      res.status(200).json({ success: true, quizzes: withCounts });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Get one quiz -------------------
// admin/owning-instructor: full quiz, answer key included (for editing).
// student: sanitized (no isCorrect), question order possibly shuffled, plus
// how many attempts they have left.

export const getQuiz = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quiz = await QuizModel.findById(req.params.id);
      if (!quiz) {
        return next(new ErrorHandler("Quiz not found", 404));
      }

      const isOwner =
        req.user?.role === "admin" || String(quiz.instructor) === String(req.user?._id);

      if (isOwner) {
        return res.status(200).json({ success: true, quiz });
      }

      const allowed = await hasCourseContentAccess(
        req.user?.role,
        String(req.user?._id),
        String(quiz.course)
      );
      if (!allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      const attemptsUsed = await QuizAttemptModel.countDocuments({
        quiz: quiz._id,
        student: req.user?._id,
      });

      res.status(200).json({
        success: true,
        quiz: sanitizeQuizForStudent(quiz),
        attemptsUsed,
        attemptsRemaining: Math.max(0, quiz.maxAttempts - attemptsUsed),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student: start an attempt (server records the clock) -------------------
// The time limit is enforced from the start time stored here, never from
// anything the client sends. Calling this again while an attempt is still
// running (e.g. a page refresh) returns the ORIGINAL start time, so the clock
// can't be reset by reloading.

export const startQuizAttempt = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quiz = await QuizModel.findById(req.params.id);
      if (!quiz) {
        return next(new ErrorHandler("Quiz not found", 404));
      }

      const allowed = await hasCourseContentAccess(
        req.user?.role,
        String(req.user?._id),
        String(quiz.course)
      );
      if (!allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      const attemptsUsed = await QuizAttemptModel.countDocuments({
        quiz: quiz._id,
        student: req.user?._id,
      });
      if (attemptsUsed >= quiz.maxAttempts) {
        return next(new ErrorHandler("You've used all your attempts for this quiz", 403));
      }

      const limitMs = (quiz.timeLimitMinutes ?? 0) * 60 * 1000;
      const filter = { quiz: quiz._id, student: req.user?._id };

      const existing = await QuizStartModel.findOne(filter);

      // Still running = it exists AND (no time limit OR the limit hasn't passed).
      // A stale record from an abandoned attempt is replaced below.
      const stillRunning =
        !!existing &&
        (limitMs === 0 || Date.now() < existing.startedAt.getTime() + limitMs);

      let start = existing;
      if (!stillRunning) {
        start = await QuizStartModel.findOneAndUpdate(
          filter,
          { startedAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      res.status(200).json({
        success: true,
        startedAt: start!.startedAt,
        expiresAt: limitMs ? new Date(start!.startedAt.getTime() + limitMs) : null,
        // lets the client compute remaining time without trusting its own clock
        serverNow: new Date(),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student: submit an attempt (auto-graded) -------------------

export const submitQuizAttempt = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quizId = req.params.id;
      const { answers: rawAnswers } = req.body as {
        answers: { questionId: string; selectedOptionIndexes?: number[]; textAnswer?: string }[];
      };

      if (!Array.isArray(rawAnswers)) {
        return next(new ErrorHandler("answers must be an array", 400));
      }

      const quiz = await QuizModel.findById(quizId);
      if (!quiz) {
        return next(new ErrorHandler("Quiz not found", 404));
      }

      const allowed = await hasCourseContentAccess(
        req.user?.role,
        String(req.user?._id),
        String(quiz.course)
      );
      if (!allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      const attemptsUsed = await QuizAttemptModel.countDocuments({
        quiz: quizId,
        student: req.user?._id,
      });
      if (attemptsUsed >= quiz.maxAttempts) {
        return next(new ErrorHandler("You've used all your attempts for this quiz", 403));
      }

      // The start time comes from OUR record, not the request body.
      // findOneAndDelete is atomic: if two submits race, only one gets the
      // record, so a double-submit can't sneak past maxAttempts.
      const start = await QuizStartModel.findOneAndDelete({
        quiz: quizId,
        student: req.user?._id,
      });
      if (!start) {
        return next(new ErrorHandler("Start the quiz before submitting", 400));
      }

      if (quiz.timeLimitMinutes) {
        const GRACE_MS = 10 * 1000; // network delay allowance
        const deadline =
          start.startedAt.getTime() + quiz.timeLimitMinutes * 60 * 1000 + GRACE_MS;
        if (Date.now() > deadline) {
          return next(new ErrorHandler("Time is up - this attempt can't be submitted", 403));
        }
      }

      // Keep only the fields we know, with the right types, whatever the
      // client sent. This is what gets graded AND what gets stored.
      const answers = rawAnswers
        .filter((a) => a && typeof a === "object" && typeof a.questionId === "string")
        .map((a) => ({
        questionId: a.questionId,
        selectedOptionIndexes: Array.isArray(a.selectedOptionIndexes)
          ? a.selectedOptionIndexes.filter((i) => Number.isInteger(i))
          : [],
        textAnswer:
          typeof a.textAnswer === "string"
            ? a.textAnswer.slice(0, MAX_TEXT_ANSWER_LENGTH)
            : undefined,
      }));
      const answerByQuestion = new Map(answers.map((a) => [String(a.questionId), a]));

      let score = 0;
      let totalMarks = 0;

      for (const question of quiz.questions) {
        totalMarks += question.marks;

        const given = answerByQuestion.get(String(question._id));

        let isCorrect: boolean;
        if (question.type === "shortAnswer") {
          isCorrect = isShortAnswerCorrect(given?.textAnswer, question.acceptedAnswers || []);
        } else {
          const correctIndexes = new Set(
            question.options
              .map((o, i) => (o.isCorrect ? i : -1))
              .filter((i) => i !== -1)
          );
          isCorrect = isChoiceCorrect(new Set(given?.selectedOptionIndexes || []), correctIndexes);
        }

        if (isCorrect) score += question.marks;
      }

      const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
      const passed = percentage >= quiz.passingScore;

      const attempt = await QuizAttemptModel.create({
        quiz: quizId,
        course: quiz.course,
        student: req.user?._id,
        answers,
        score,
        totalMarks,
        percentage,
        passed,
        attemptNumber: attemptsUsed + 1,
        startedAt: start.startedAt,
        submittedAt: new Date(),
      });

      if (passed) {
        await NotificationModel.create({
          userId: req.user?._id,
          title: "Quiz passed",
          message: `You passed "${quiz.title}" with ${Math.round(percentage)}%`,
          link: `/course-access/${quiz.course}/quizzes`,
        });

        // This may have been the last quiz standing between the student and
        // their certificate.
        await tryIssueCertificate(String(req.user?._id), String(quiz.course));
      }

      res.status(201).json({
        success: true,
        attempt: quiz.showResultsImmediately
          ? attempt
          : { _id: attempt._id, submittedAt: attempt.submittedAt },
        attemptsRemaining: Math.max(0, quiz.maxAttempts - (attemptsUsed + 1)),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor/admin: every attempt on this quiz -------------------

export const getQuizAttempts = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const attempts = await QuizAttemptModel.find({ quiz: req.params.id })
        .populate("student", "name email")
        .sort({ submittedAt: -1 });

      res.status(200).json({ success: true, attempts });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
