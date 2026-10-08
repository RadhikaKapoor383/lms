import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import userModel from "../models/user.model";
import CourseModel from "../models/course.model";
import EnrollmentModel from "../models/enrollment.model";
import AssignmentModel from "../models/assignment.model";
import QuizModel from "../models/quiz.model";
import ModuleModel from "../models/module.model";
import LessonModel from "../models/lesson.model";
import LessonProgressModel from "../models/lessonProgress.model";
import AuditLogModel from "../models/auditLog.model";
import { redis } from "../utils/redis";
import { logActivity } from "../utils/auditLog";
import { isObjectId } from "../services/enrollment.service";
import { notifyUser } from "../services/notification.service";
import { getSettings } from "../services/settings.service";
import sendMail from "../utils/sendMail";
import {
  buildCourseStats,
  groupByInstructor,
  summarizeInstructor,
} from "../services/adminStats.service";

const IN_COURSE = ["active", "completed"]; // enrollment statuses still in the course

// ------------------- Activate / deactivate an account -------------------
// Deactivating signs the person out of every device at once (their session in
// Redis is deleted) and the login route refuses them until reactivated.
// Nothing is deleted: their courses, work and history stay as they were.

export const setUserActive = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!isObjectId(id)) {
        return next(new ErrorHandler("Invalid user id", 400));
      }
      if (typeof req.body?.active !== "boolean") {
        return next(new ErrorHandler("active must be true or false", 400));
      }
      if (String(req.user?._id) === id) {
        return next(new ErrorHandler("You can't deactivate your own account", 403));
      }

      const active: boolean = req.body.active;
      const user = await userModel.findByIdAndUpdate(id, { isActive: active }, { new: true });
      if (!user) {
        return next(new ErrorHandler("User not found", 404));
      }

      if (!active) {
        await redis.del(id);
      }

      logActivity(
        req,
        active ? "user.activate" : "user.deactivate",
        `${active ? "Reactivated" : "Deactivated"} ${user.role} "${user.name}" (${user.email})`,
        { targetUserId: id }
      );

      res.status(200).json({ success: true, isActive: user.isActive !== false });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Approve / reject a new student -------------------
// Only used when "Require approval for new students" is on. A student who has
// verified their email sits at "pending" until an admin decides. Approving lets
// them log in (and emails them); rejecting keeps the account but blocks login
// (delete the user afterwards if they should be able to sign up again).

export const setUserApproval = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!isObjectId(id)) {
        return next(new ErrorHandler("Invalid user id", 400));
      }
      if (typeof req.body?.approve !== "boolean") {
        return next(new ErrorHandler("approve must be true or false", 400));
      }
      const approve: boolean = req.body.approve;

      // One atomic step: it only matches a student who is STILL pending, so two
      // admins clicking at once can't both "decide", and nobody else's account
      // can be touched through this route.
      const user = await userModel.findOneAndUpdate(
        { _id: id, role: "student", approvalStatus: "pending" },
        { approvalStatus: approve ? "approved" : "rejected" },
        { new: true }
      );
      if (!user) {
        return next(new ErrorHandler("No pending student found with that id", 404));
      }

      logActivity(
        req,
        approve ? "user.approve" : "user.reject",
        `${approve ? "Approved" : "Rejected"} student \"${user.name}\" (${user.email})`,
        { targetUserId: id }
      );

      // The decision is saved even if the email can't be sent.
      let emailSent = true;
      try {
        const { platformName } = await getSettings();
        await sendMail({
          email: user.email,
          subject: approve
            ? `Your ${platformName} account is approved`
            : `Your ${platformName} registration`,
          template: "account-decision.ejs",
          data: {
            user: { name: user.name },
            approved: approve,
            platformName,
            loginUrl: `${process.env.ORIGIN || ""}/login`,
          },
        });
      } catch (mailError: any) {
        emailSent = false;
        console.error("Could not send approval email:", mailError.message);
      }

      res.status(200).json({
        success: true,
        approvalStatus: user.approvalStatus,
        emailSent,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructors: list with numbers -------------------

export const getInstructors = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const instructors = await userModel.find({ role: "instructor" }).sort({ name: 1 });
      const ids = instructors.map((i) => i._id);

      const courses = await CourseModel.find({ instructor: { $in: ids } })
        .select("name status instructor ratings updatedAt")
        .lean();
      const enrollments = await EnrollmentModel.find({
        course: { $in: courses.map((c) => c._id) },
        status: { $in: IN_COURSE },
      })
        .select("course student status")
        .lean();

      const grouped = groupByInstructor(courses as any, enrollments as any);

      res.status(200).json({
        success: true,
        instructors: instructors.map((i) => {
          const g = grouped.get(String(i._id)) || { courses: [], enrollments: [] };
          const stats = summarizeInstructor(buildCourseStats(g.courses, g.enrollments), g.enrollments);
          return {
            _id: i._id,
            name: i.name,
            email: i.email,
            avatar: i.avatar,
            isActive: i.isActive !== false,
            createdAt: i.createdAt,
            ...stats,
          };
        }),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- One instructor: profile, courses, engagement, activity -------------------

export const getInstructorDetail = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!isObjectId(id)) {
        return next(new ErrorHandler("Invalid instructor id", 400));
      }

      const instructor = await userModel.findOne({ _id: id, role: "instructor" });
      if (!instructor) {
        return next(new ErrorHandler("Instructor not found", 404));
      }

      const courses = await CourseModel.find({ instructor: id })
        .select("name status instructor ratings updatedAt")
        .sort({ updatedAt: -1 })
        .lean();
      const courseIds = courses.map((c) => c._id);

      const enrollments = await EnrollmentModel.find({
        course: { $in: courseIds },
        status: { $in: IN_COURSE },
      })
        .select("course student status")
        .lean();

      const courseStats = buildCourseStats(courses as any, enrollments as any);
      const summary = summarizeInstructor(courseStats, enrollments as any);

      // Engagement: how many of their students did something in the last 30 days
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recent = await LessonProgressModel.find({
        course: { $in: courseIds },
        completedAt: { $gte: since },
      })
        .select("student")
        .lean();

      const recentActivity = await AuditLogModel.find({ userId: id })
        .sort({ createdAt: -1 })
        .limit(10);

      res.status(200).json({
        success: true,
        instructor: {
          _id: instructor._id,
          name: instructor.name,
          email: instructor.email,
          avatar: instructor.avatar,
          isActive: instructor.isActive !== false,
          createdAt: instructor.createdAt,
        },
        summary,
        engagement: {
          lessonsCompleted30d: recent.length,
          activeStudents30d: new Set(recent.map((r) => String(r.student))).size,
        },
        courses: courseStats,
        recentActivity,
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Assign (or reassign) a course to an instructor -------------------
// "Instructor owns the course" is stored in more than one place: the course
// itself, and a copy on each of its assignments and quizzes (their ownership
// checks read that copy). All of them move together, otherwise the new
// instructor would own the course but be refused on its assignments.
// Enrollment.instructor and Certificate.instructor are left alone on purpose:
// they record who taught at the time.

export const assignCourseInstructor = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: courseId } = req.params;
      const { instructorId } = req.body || {};

      if (!isObjectId(courseId) || !isObjectId(instructorId)) {
        return next(new ErrorHandler("Invalid course or instructor id", 400));
      }

      const instructor = await userModel.findOne({ _id: instructorId, role: "instructor" });
      if (!instructor) {
        return next(new ErrorHandler("Instructor not found", 404));
      }
      if (instructor.isActive === false) {
        return next(new ErrorHandler("That instructor's account is deactivated", 400));
      }

      const course = await CourseModel.findById(courseId).select("name instructor");
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      if (course.instructor && String(course.instructor) === String(instructorId)) {
        return next(new ErrorHandler("That instructor already teaches this course", 400));
      }

      const previousInstructorId = course.instructor ? String(course.instructor) : null;

      await CourseModel.updateOne({ _id: courseId }, { instructor: instructorId });
      await AssignmentModel.updateMany({ course: courseId }, { instructor: instructorId });
      await QuizModel.updateMany({ course: courseId }, { instructor: instructorId });

      await redis.del(courseId);
      await redis.del("allCourses");

      await notifyUser(
        String(instructorId),
        "Course assigned to you",
        `You are now the instructor of "${course.name}"`,
        "/instructor"
      );
      if (previousInstructorId) {
        await notifyUser(
          previousInstructorId,
          "Course reassigned",
          `"${course.name}" is now taught by ${instructor.name}`
        );
      }

      logActivity(req, "course.assign_instructor", `Assigned "${course.name}" to ${instructor.name}`, {
        courseId,
        instructorId,
        previousInstructorId,
      });

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Course approvals queue -------------------
// Oldest first: whoever has waited longest is at the top. Approving or
// rejecting uses the existing PUT /admin/course-status/:id.

export const getCourseApprovals = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pending = await CourseModel.find({ status: "Pending Approval" })
        .select("name description level category instructor updatedAt")
        .populate("instructor", "name email")
        .populate("category", "name")
        .sort({ updatedAt: 1 })
        .lean();

      const ids = pending.map((c) => c._id);
      const [moduleCounts, lessonCounts] = await Promise.all([
        ModuleModel.aggregate([{ $match: { course: { $in: ids } } }, { $group: { _id: "$course", n: { $sum: 1 } } }]),
        LessonModel.aggregate([{ $match: { course: { $in: ids } } }, { $group: { _id: "$course", n: { $sum: 1 } } }]),
      ]);
      const countOf = (rows: any[], id: any) => rows.find((r) => String(r._id) === String(id))?.n || 0;

      res.status(200).json({
        success: true,
        courses: pending.map((c: any) => ({
          _id: c._id,
          name: c.name,
          description: c.description,
          level: c.level,
          category: c.category?.name,
          instructor: c.instructor ? { _id: c.instructor._id, name: c.instructor.name, email: c.instructor.email } : null,
          submittedAt: c.updatedAt,
          modules: countOf(moduleCounts, c._id),
          lessons: countOf(lessonCounts, c._id),
        })),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
