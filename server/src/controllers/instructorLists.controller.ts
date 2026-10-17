import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import EnrollmentModel from "../models/enrollment.model";
import LessonProgressModel from "../models/lessonProgress.model";
import AssignmentModel from "../models/assignment.model";
import AssignmentSubmissionModel from "../models/assignmentSubmission.model";
import QuizModel from "../models/quiz.model";
import QuizAttemptModel from "../models/quizAttempt.model";
import userModel from "../models/user.model";
import {
  containsRegex,
  parseStudentListQuery,
  tallyQuizAttempts,
  tallySubmissions,
} from "../services/instructorLists.service";

// Everything here is limited to the logged-in instructor's OWN courses.

// ------------------- All my students, across all my courses -------------------

export const getInstructorStudents = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = parseStudentListQuery(req.query);
      if ("error" in parsed) return next(new ErrorHandler(parsed.error, 400));
      const { page, limit, q, courseId, status } = parsed.value;

      const myCourses = await CourseModel.find({ instructor: req.user?._id }).select("name").lean();
      const myCourseIds = myCourses.map((c) => c._id);

      // A course that isn't theirs looks the same as one that doesn't exist.
      if (courseId && !myCourseIds.some((id) => String(id) === courseId)) {
        return next(new ErrorHandler("Course not found", 404));
      }
      const scope = courseId ? [new mongoose.Types.ObjectId(courseId)] : myCourseIds;

      // numbers for the cards at the top: the whole scope, whatever is searched
      const scopeRows = await EnrollmentModel.find({ course: { $in: scope }, status: { $ne: "revoked" } })
        .select("student status")
        .lean();
      const summary = {
        students: new Set(scopeRows.map((e) => String(e.student))).size,
        enrolments: scopeRows.length,
        completed: scopeRows.filter((e) => e.status === "completed").length,
      };

      const filter: Record<string, any> = {
        course: { $in: scope },
        status: status ?? { $ne: "revoked" },
      };
      if (q) {
        const rx = containsRegex(q);
        const matches = await userModel
          .find({ role: "student", $or: [{ name: rx }, { email: rx }] })
          .select("_id")
          .limit(2000)
          .lean();
        filter.student = { $in: matches.map((u) => u._id) };
      }

      const total = await EnrollmentModel.countDocuments(filter);
      const rows = await EnrollmentModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("student", "name email avatar")
        .populate("course", "name")
        .lean();

      // when each of these students last finished a lesson in that course
      const activity = rows.length
        ? await LessonProgressModel.aggregate([
            {
              $match: {
                course: { $in: rows.map((r: any) => r.course?._id).filter(Boolean) },
                student: { $in: rows.map((r: any) => r.student?._id).filter(Boolean) },
              },
            },
            { $group: { _id: { student: "$student", course: "$course" }, last: { $max: "$completedAt" } } },
          ])
        : [];
      const lastBy = new Map<string, Date>(
        activity.map((a: any) => [`${a._id.student}:${a._id.course}`, a.last])
      );

      res.status(200).json({
        success: true,
        summary,
        total,
        page,
        pages: Math.max(1, Math.ceil(total / limit)),
        students: rows
          .filter((r: any) => r.student && r.course)
          .map((r: any) => ({
            enrollmentId: r._id,
            student: { _id: r.student._id, name: r.student.name, email: r.student.email, avatar: r.student.avatar },
            course: { _id: r.course._id, name: r.course.name },
            status: r.status,
            completionPercentage: r.completionPercentage || 0,
            enrolledAt: r.createdAt,
            completedAt: r.completedAt || null,
            lastActivityAt: lastBy.get(`${r.student._id}:${r.course._id}`) || null,
          })),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- All my assignments -------------------

export const getInstructorAssignments = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignments = await AssignmentModel.find({ instructor: req.user?._id })
        .sort({ deadline: -1 })
        .populate("course", "name")
        .lean();
      const ids = assignments.map((a) => a._id);
      const courseIds = assignments.map((a: any) => a.course?._id).filter(Boolean);

      const submissions = await AssignmentSubmissionModel.find({ assignment: { $in: ids } })
        .select("assignment gradedAt isLate")
        .lean();
      const enrolled = await EnrollmentModel.find({ course: { $in: courseIds }, status: { $ne: "revoked" } })
        .select("course")
        .lean();

      const subsBy = new Map<string, any[]>();
      for (const s of submissions) subsBy.set(String(s.assignment), [...(subsBy.get(String(s.assignment)) || []), s]);
      const enrolledBy = new Map<string, number>();
      for (const e of enrolled) enrolledBy.set(String(e.course), (enrolledBy.get(String(e.course)) || 0) + 1);

      const list = assignments
        .filter((a: any) => a.course)
        .map((a: any) => ({
          _id: a._id,
          title: a.title,
          course: { _id: a.course._id, name: a.course.name },
          deadline: a.deadline,
          maxMarks: a.maxMarks,
          enrolledStudents: enrolledBy.get(String(a.course._id)) || 0,
          ...tallySubmissions(subsBy.get(String(a._id)) || []),
        }));

      res.status(200).json({
        success: true,
        totalToGrade: list.reduce((sum, a) => sum + a.toGrade, 0),
        assignments: list,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- All my quizzes -------------------

export const getInstructorQuizzes = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const quizzes = await QuizModel.find({ instructor: req.user?._id })
        .sort({ createdAt: -1 })
        .populate("course", "name")
        .lean();
      const attempts = await QuizAttemptModel.find({ quiz: { $in: quizzes.map((q) => q._id) } })
        .select("quiz student percentage passed timedOut")
        .lean();

      const byQuiz = new Map<string, any[]>();
      for (const a of attempts) byQuiz.set(String(a.quiz), [...(byQuiz.get(String(a.quiz)) || []), a]);

      res.status(200).json({
        success: true,
        quizzes: quizzes
          .filter((q: any) => q.course)
          .map((q: any) => ({
            _id: q._id,
            title: q.title,
            course: { _id: q.course._id, name: q.course.name },
            questionCount: q.questions.length,
            timeLimitMinutes: q.timeLimitMinutes || null,
            maxAttempts: q.maxAttempts,
            passingScore: q.passingScore,
            ...tallyQuizAttempts(byQuiz.get(String(q._id)) || []),
          })),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
