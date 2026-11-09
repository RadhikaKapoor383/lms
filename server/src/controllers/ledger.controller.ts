import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import LessonProgressModel from "../models/lessonProgress.model";
import LessonModel from "../models/lesson.model";
import QuizAttemptModel from "../models/quizAttempt.model";
import QuizModel from "../models/quiz.model";
import AssignmentSubmissionModel from "../models/assignmentSubmission.model";
import AssignmentModel from "../models/assignment.model";
import CertificateModel from "../models/certificate.model";
import CourseModel from "../models/course.model";
import { LedgerEvent, buildLedger, clampLimit } from "../services/ledger.service";

// GET /student/ledger?limit=40
// Everything the signed-in student has finished, newest first, with a running
// total. (Ids are only used in find() queries, which turn a string id into an
// ObjectId; the session's _id is a plain string.)
export const getStudentLedger = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.user?._id;
      const limit = clampLimit(req.query.limit);

      const [progress, attempts, submissions, certificates] = await Promise.all([
        LessonProgressModel.find({ student: studentId }).select("lessonId course completedAt").lean(),
        // only passed attempts are "finished"; a later re-pass of the same quiz is dropped by its key
        QuizAttemptModel.find({ student: studentId, passed: true })
          .select("quiz course score totalMarks submittedAt")
          .lean(),
        AssignmentSubmissionModel.find({ student: studentId }).select("assignment course submittedAt").lean(),
        CertificateModel.find({ student: studentId, status: "valid" })
          .select("certificateId courseName issuedAt completionDate")
          .lean(),
      ]);

      const ids = (rows: any[], field: string) => Array.from(new Set(rows.map((r) => String(r[field]))));
      const courseIds = Array.from(
        new Set([...ids(progress, "course"), ...ids(attempts, "course"), ...ids(submissions, "course")])
      );

      const [lessons, quizzes, assignments, courses] = await Promise.all([
        LessonModel.find({ _id: { $in: ids(progress, "lessonId") } }).select("title").lean(),
        QuizModel.find({ _id: { $in: ids(attempts, "quiz") } }).select("title").lean(),
        AssignmentModel.find({ _id: { $in: ids(submissions, "assignment") } }).select("title").lean(),
        CourseModel.find({ _id: { $in: courseIds } }).select("name").lean(),
      ]);

      const nameOf = (rows: any[], field: string) => new Map(rows.map((r: any) => [String(r._id), String(r[field])]));
      const lessonTitle = nameOf(lessons, "title");
      const quizTitle = nameOf(quizzes, "title");
      const assignmentTitle = nameOf(assignments, "title");
      const courseName = nameOf(courses, "name");
      const course = (id: unknown) => courseName.get(String(id)) || "A course";

      const events: LedgerEvent[] = [
        ...progress.map((p: any) => ({
          kind: "lesson" as const,
          at: p.completedAt,
          title: lessonTitle.get(String(p.lessonId)) || "A lesson",
          courseName: course(p.course),
          key: String(p.lessonId),
        })),
        ...attempts.map((a: any) => ({
          kind: "quiz" as const,
          at: a.submittedAt,
          title: quizTitle.get(String(a.quiz)) || "A quiz",
          courseName: course(a.course),
          key: String(a.quiz),
          detail: `${a.score} / ${a.totalMarks}`,
        })),
        ...submissions.map((s: any) => ({
          kind: "assignment" as const,
          at: s.submittedAt,
          title: assignmentTitle.get(String(s.assignment)) || "An assignment",
          courseName: course(s.course),
          key: String(s.assignment),
        })),
        ...certificates.map((c: any) => ({
          kind: "certificate" as const,
          at: c.issuedAt || c.completionDate,
          title: c.courseName,
          courseName: c.courseName,
          certificateId: c.certificateId,
        })),
      ];

      res.status(200).json({ success: true, ledger: buildLedger(events, { limit }) });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
