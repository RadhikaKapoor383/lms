import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import EnrollmentModel from "../models/enrollment.model";
import AssignmentModel from "../models/assignment.model";
import AssignmentSubmissionModel from "../models/assignmentSubmission.model";
import QuizAttemptModel from "../models/quizAttempt.model";
import LessonProgressModel from "../models/lessonProgress.model";
import CertificateModel from "../models/certificate.model";
import AuditLogModel from "../models/auditLog.model";
import { buildCourseStats, summarizeInstructor, percent } from "../services/adminStats.service";
import {
  DAY_MS,
  averageProgress,
  pickContinueLearning,
  recommendCourses,
  upcomingDeadlines,
} from "../services/analytics.service";

const IN_COURSE = ["active", "completed"];
const NOT_GRADED = { $or: [{ marks: { $exists: false } }, { marks: null }] };

// NOTE on ids: find()/countDocuments() cast a string id to an ObjectId, but
// aggregate() does not - and req.user._id (from the Redis session) is a string.
// So user ids are only ever used in find()/count queries below, never in an
// aggregate $match.

// ------------------- Admin dashboard -------------------

export const getAdminDashboard = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [
        students,
        activeStudents,
        instructors,
        activeInstructors,
        courseStatusRows,
        enrollmentStatusRows,
        recentCourses,
        pendingCourses,
        instructorIds,
        recentEnrollments,
      ] = await Promise.all([
        userModel.countDocuments({ role: "student" }),
        userModel.countDocuments({ role: "student", isActive: { $ne: false } }),
        userModel.countDocuments({ role: "instructor" }),
        userModel.countDocuments({ role: "instructor", isActive: { $ne: false } }),
        CourseModel.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
        EnrollmentModel.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
        CourseModel.find().sort({ createdAt: -1 }).limit(5).select("name status createdAt instructor").populate("instructor", "name").lean(),
        CourseModel.find({ status: "Pending Approval" }).sort({ updatedAt: 1 }).limit(5).select("name updatedAt instructor").populate("instructor", "name").lean(),
        userModel.find({ role: "instructor" }).select("_id").lean(),
        EnrollmentModel.find({ status: { $in: IN_COURSE } })
          .sort({ createdAt: -1 })
          .limit(8)
          .select("student course createdAt")
          .populate("student", "name")
          .populate("course", "name")
          .lean(),
      ]);

      const courseCount = (status: string) => courseStatusRows.find((r: any) => r._id === status)?.n || 0;
      const enrollCount = (status: string) => enrollmentStatusRows.find((r: any) => r._id === status)?.n || 0;
      const totalEnrollments = enrollCount("active") + enrollCount("completed");

      const recentInstructorActivity = await AuditLogModel.find({
        userId: { $in: instructorIds.map((i: any) => String(i._id)) },
      })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("userName action targetLabel createdAt")
        .lean();

      res.status(200).json({
        success: true,
        cards: {
          students,
          activeStudents,
          instructors,
          activeInstructors,
          courses: courseStatusRows.reduce((t: number, r: any) => t + r.n, 0),
          published: courseCount("Published"),
          pending: courseCount("Pending Approval"),
          draft: courseCount("Draft"),
          enrollments: totalEnrollments,
          completionRate: percent(enrollCount("completed"), totalEnrollments),
        },
        recentCourses,
        pendingApprovals: pendingCourses,
        recentInstructorActivity,
        recentEnrollments,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor dashboard -------------------

export const getInstructorDashboard = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const courses = await CourseModel.find({ instructor: req.user?._id }).select("name status instructor ratings updatedAt").lean();
      const ids = courses.map((c: any) => c._id);

      const [enrollments, ungraded, ungradedCount, upcoming, recentSubmissions, recentAttempts, recentLessons] =
        await Promise.all([
          EnrollmentModel.find({ course: { $in: ids }, status: { $in: IN_COURSE } }).select("course student status").lean(),
          AssignmentSubmissionModel.find({ course: { $in: ids }, ...NOT_GRADED })
            .sort({ submittedAt: 1 })
            .limit(5)
            .populate("student", "name")
            .populate("assignment", "title")
            .lean(),
          AssignmentSubmissionModel.countDocuments({ course: { $in: ids }, ...NOT_GRADED }),
          AssignmentModel.find({ course: { $in: ids }, deadline: { $gte: now, $lte: new Date(+now + 14 * DAY_MS) } })
            .sort({ deadline: 1 })
            .limit(6)
            .select("title course deadline")
            .populate("course", "name")
            .lean(),
          AssignmentSubmissionModel.find({ course: { $in: ids } }).sort({ submittedAt: -1 }).limit(6).populate("student", "name").populate("assignment", "title").lean(),
          QuizAttemptModel.find({ course: { $in: ids } }).sort({ submittedAt: -1 }).limit(6).populate("student", "name").populate("quiz", "title").lean(),
          LessonProgressModel.find({ course: { $in: ids } }).sort({ completedAt: -1 }).limit(6).populate("student", "name").populate("course", "name").lean(),
        ]);

      const stats = summarizeInstructor(buildCourseStats(courses as any, enrollments as any), enrollments as any);

      // how many students already handed each upcoming assignment in
      const submittedCounts = await Promise.all(
        upcoming.map((a: any) => AssignmentSubmissionModel.countDocuments({ assignment: a._id }))
      );

      // one feed from three sources, newest first
      const activity = [
        ...recentSubmissions.map((s: any) => ({
          type: "submission",
          student: s.student?.name,
          text: `submitted "${s.assignment?.title}"`,
          at: s.submittedAt,
        })),
        ...recentAttempts.map((a: any) => ({
          type: "quiz",
          student: a.student?.name,
          text: `took "${a.quiz?.title}" (${Math.round(a.percentage)}%)`,
          at: a.submittedAt,
        })),
        ...recentLessons.map((l: any) => ({
          type: "lesson",
          student: l.student?.name,
          text: `finished a lesson in ${l.course?.name}`,
          at: l.completedAt,
        })),
      ]
        .sort((a, b) => +new Date(b.at) - +new Date(a.at))
        .slice(0, 8);

      res.status(200).json({
        success: true,
        cards: {
          courses: stats.courses,
          activeCourses: stats.published,
          pendingCourses: stats.pending,
          students: stats.students,
          completionRate: stats.completionRate,
          pendingToGrade: ungradedCount,
        },
        pendingToGrade: ungraded.map((s: any) => ({
          _id: s._id,
          assignmentId: s.assignment?._id,
          student: s.student?.name,
          assignment: s.assignment?.title,
          submittedAt: s.submittedAt,
          isLate: s.isLate,
        })),
        upcomingDeadlines: upcoming.map((a: any, i: number) => ({
          _id: a._id,
          title: a.title,
          course: a.course?.name,
          deadline: a.deadline,
          submitted: submittedCounts[i],
        })),
        recentActivity: activity,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student dashboard -------------------

export const getStudentDashboard = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studentId = req.user?._id;
      const now = new Date();

      const enrollments = await EnrollmentModel.find({ student: studentId, status: { $in: IN_COURSE } })
        .populate({ path: "course", select: "name category" })
        .lean();
      const live = enrollments.filter((e: any) => e.course) as any[];
      const courseIds = live.map((e) => e.course._id);

      const [progressRows, assignments, mySubmissions, gradedSubmissions, attempts, certificates, certificateCount, published] =
        await Promise.all([
          LessonProgressModel.find({ student: studentId }).select("course completedAt").lean(),
          AssignmentModel.find({ course: { $in: courseIds } }).select("title course deadline maxMarks").populate("course", "name").lean(),
          AssignmentSubmissionModel.find({ student: studentId }).select("assignment").lean(),
          AssignmentSubmissionModel.find({ student: studentId, marks: { $ne: null, $exists: true } })
            .sort({ gradedAt: -1 })
            .limit(5)
            .populate("assignment", "title maxMarks")
            .lean(),
          QuizAttemptModel.find({ student: studentId }).sort({ submittedAt: -1 }).limit(5).populate("quiz", "title").lean(),
          CertificateModel.find({ student: studentId }).sort({ issuedAt: -1 }).limit(3).select("certificateId courseName status issuedAt").lean(),
          CertificateModel.countDocuments({ student: studentId, status: "valid" }),
          CourseModel.find({ status: "Published" }).select("name level category ratings price thumbnail").populate("category", "name").lean(),
        ]);

      // latest finished lesson per course
      const lastByCourse = new Map<string, Date>();
      for (const p of progressRows as any[]) {
        const key = String(p.course);
        const current = lastByCourse.get(key);
        if (!current || +new Date(p.completedAt) > +current) lastByCourse.set(key, p.completedAt);
      }

      const continuing = pickContinueLearning(
        live.map((e) => ({ ...e, course: e.course._id, student: e.student })),
        lastByCourse
      );
      const continueCourse = continuing ? live.find((e) => String(e.course._id) === String(continuing.course)) : null;

      const submittedIds = new Set((mySubmissions as any[]).map((s) => String(s.assignment)));
      const deadlines = upcomingDeadlines(assignments as any[], submittedIds, now, 14).slice(0, 6);

      const grades = [
        ...(gradedSubmissions as any[]).map((s) => ({
          type: "assignment",
          title: s.assignment?.title,
          percentage: s.assignment?.maxMarks ? Math.round((s.marks / s.assignment.maxMarks) * 100) : null,
          marks: s.marks,
          outOf: s.assignment?.maxMarks,
          at: s.gradedAt || s.submittedAt,
        })),
        ...(attempts as any[]).map((a) => ({
          type: "quiz",
          title: a.quiz?.title,
          percentage: Math.round(a.percentage),
          passed: a.passed,
          at: a.submittedAt,
        })),
      ]
        .sort((a, b) => +new Date(b.at) - +new Date(a.at))
        .slice(0, 6);

      // How many people are in each published course, for ranking suggestions
      const enrolledCounts = await EnrollmentModel.aggregate([
        { $match: { status: { $in: IN_COURSE } } },
        { $group: { _id: "$course", n: { $sum: 1 } } },
      ]);
      const enrolledOf = new Map(enrolledCounts.map((r: any) => [String(r._id), r.n as number]));

      const interest = new Set(live.map((e) => String(e.course.category)).filter((c) => c && c !== "undefined"));
      const recommended = recommendCourses(
        (published as any[]).map((c) => ({
          ...c,
          category: c.category?._id ? String(c.category._id) : undefined,
          categoryName: c.category?.name,
          enrolled: enrolledOf.get(String(c._id)) || 0,
        })),
        new Set(courseIds.map(String)),
        interest,
        4
      );

      res.status(200).json({
        success: true,
        cards: {
          courses: live.length,
          completed: live.filter((e) => e.status === "completed").length,
          overallProgress: averageProgress(live),
          certificates: certificateCount,
        },
        continueLearning: continueCourse
          ? {
              courseId: continueCourse.course._id,
              name: continueCourse.course.name,
              completionPercentage: continueCourse.completionPercentage,
            }
          : null,
        upcomingDeadlines: deadlines.map((a: any) => ({
          _id: a._id,
          title: a.title,
          course: a.course?.name,
          courseId: a.course?._id,
          deadline: a.deadline,
        })),
        recentGrades: grades,
        certificates,
        recommended: recommended.map((c: any) => ({
          _id: c._id,
          name: c.name,
          level: c.level,
          category: c.categoryName,
          ratings: c.ratings || 0,
          price: c.price,
        })),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
