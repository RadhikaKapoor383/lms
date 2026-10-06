import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { generateLast12MonthsData } from "../utils/analyticsGenerator";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import OrderModel from "../models/order.model";
import EnrollmentModel from "../models/enrollment.model";
import LessonProgressModel from "../models/lessonProgress.model";
import QuizAttemptModel from "../models/quizAttempt.model";
import AssignmentModel from "../models/assignment.model";
import AssignmentSubmissionModel from "../models/assignmentSubmission.model";
import AuditLogModel from "../models/auditLog.model";
import { loadCourseAnalytics } from "../services/analyticsData.service";
import {
  averageProgress,
  monthlyBuckets,
  summarizeAssignments,
  summarizeQuizzes,
  weeklyBuckets,
} from "../services/analytics.service";

export const getUserAnalytics = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const users = await generateLast12MonthsData(userModel);
      res.status(200).json({ success: true, users });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getCoursesAnalytics = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await generateLast12MonthsData(CourseModel);
      res.status(200).json({ success: true, courses });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getOrdersAnalytics = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orders = await generateLast12MonthsData(OrderModel);
      res.status(200).json({ success: true, orders });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);


// ------------------- Admin analytics (whole platform) -------------------

const topN = <T>(rows: T[], by: (r: T) => number, n: number) =>
  [...rows].sort((a, b) => by(b) - by(a)).slice(0, n);

export const getAdminAnalytics = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const yearAgo = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1));
      const monthAgo = new Date(+now - 30 * 24 * 60 * 60 * 1000);

      const data = await loadCourseAnalytics({}, now);

      const [students, instructors] = await Promise.all([
        userModel.find({ role: "student", createdAt: { $gte: yearAgo } }).select("createdAt").lean(),
        userModel.find({ role: "instructor" }).select("name").lean(),
      ]);
      const instructorName = new Map(instructors.map((i: any) => [String(i._id), i.name]));

      // what instructors did in the last 30 days (from the audit log), busiest first
      const logs = await AuditLogModel.find({
        userId: { $in: instructors.map((i: any) => String(i._id)) },
        createdAt: { $gte: monthAgo },
      })
        .select("userId")
        .lean();
      const actions = new Map<string, number>();
      for (const l of logs as any[]) actions.set(l.userId, (actions.get(l.userId) || 0) + 1);
      const instructorActivity = topN(
        [...actions.entries()].map(([id, count]) => ({ name: instructorName.get(id) || "Instructor", actions: count })),
        (r) => r.actions,
        5
      );

      res.status(200).json({
        success: true,
        registrations: monthlyBuckets((students as any[]).map((s) => s.createdAt), 12, now),
        courseCreation: monthlyBuckets(data.courses.map((c: any) => c.createdAt), 12, now),
        enrollmentsByMonth: monthlyBuckets(data.enrollments.map((e: any) => e.createdAt), 12, now),
        instructorActivity,
        popularCourses: topN(data.rows, (r) => r.enrolled, 5).map((r) => ({ _id: r._id, name: r.name, enrolled: r.enrolled })),
        completion: data.totals,
        engagement: data.engagement,
        weeklyLessons: data.weeklyLessons,
        quiz: data.quiz,
        assignment: data.assignment,
        // the 10 biggest courses, with their own numbers
        courses: topN(data.rows, (r) => r.enrolled, 10),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor analytics (my courses only) -------------------

export const getInstructorAnalytics = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await loadCourseAnalytics({ instructor: req.user?._id });
      res.status(200).json({
        success: true,
        students: data.engagement.learners,
        completion: data.totals,
        engagement: data.engagement,
        weeklyLessons: data.weeklyLessons,
        quiz: data.quiz,
        assignment: data.assignment,
        courses: topN(data.rows, (r) => r.enrolled, 50),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student analytics (my own learning) -------------------

export const getStudentAnalytics = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.user?._id;
      // find() turns a string id into an ObjectId for us; aggregate() does NOT.
      // req.user comes from the Redis session, where _id is a plain string, so
      // an aggregate matching on it directly would quietly match nothing.
      const studentObjectId = new mongoose.Types.ObjectId(String(studentId));
      const now = new Date();

      const enrollments = await EnrollmentModel.find({ student: studentId, status: { $in: ["active", "completed"] } })
        .populate("course", "name")
        .sort({ createdAt: -1 })
        .lean();
      const courseIds = enrollments.map((e: any) => e.course?._id).filter(Boolean);

      const [lastRows, lessonCount, recentLessons, attempts, assignments, submissions] = await Promise.all([
        LessonProgressModel.aggregate([
          { $match: { student: studentObjectId } },
          { $group: { _id: "$course", last: { $max: "$completedAt" } } },
        ]),
        LessonProgressModel.countDocuments({ student: studentId }),
        LessonProgressModel.find({ student: studentId, completedAt: { $gte: new Date(+now - 8 * 7 * 86400000) } })
          .select("completedAt")
          .lean(),
        QuizAttemptModel.find({ student: studentId }).select("quiz student percentage passed").lean(),
        AssignmentModel.find({ course: { $in: courseIds } }).select("maxMarks").lean(),
        AssignmentSubmissionModel.find({ student: studentId }).select("assignment marks isLate").lean(),
      ]);
      const lastByCourse = new Map(lastRows.map((r: any) => [String(r._id), r.last]));
      const maxMarks = new Map<string, number>(assignments.map((a: any) => [String(a._id), a.maxMarks]));

      res.status(200).json({
        success: true,
        summary: {
          coursesEnrolled: enrollments.length,
          coursesCompleted: enrollments.filter((e: any) => e.status === "completed").length,
          averageProgress: averageProgress(enrollments as any),
          lessonsCompleted: lessonCount,
        },
        courses: enrollments
          .filter((e: any) => e.course)
          .map((e: any) => ({
            courseId: e.course._id,
            name: e.course.name,
            status: e.status,
            completionPercentage: e.status === "completed" ? 100 : e.completionPercentage,
            completedAt: e.completedAt,
            lastActivity: lastByCourse.get(String(e.course._id)) || null,
          })),
        quiz: summarizeQuizzes(attempts as any),
        assignment: summarizeAssignments(submissions as any, maxMarks),
        weeklyLessons: weeklyBuckets(
          recentLessons.map((l: any) => l.completedAt),
          8,
          now
        ),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
