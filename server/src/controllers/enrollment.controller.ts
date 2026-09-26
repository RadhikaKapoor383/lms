import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import userModel from "../models/user.model";
import EnrollmentModel from "../models/enrollment.model";
import { logActivity } from "../utils/auditLog";
import {
  createEnrollment,
  isObjectId,
  revokeEnrollment,
} from "../services/enrollment.service";
import { getProgress, setLessonCompleted } from "../services/progress.service";

// ------------------- Student: enroll in a free, open course -------------------

export const enrollInFreeCourse = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.body;

      if (!isObjectId(courseId)) {
        return next(new ErrorHandler("Invalid course id", 400));
      }

      const course = await CourseModel.findOne({
        _id: courseId,
        status: "Published",
      }).select("price enrollmentMode");

      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }
      if (course.enrollmentMode === "manual") {
        return next(
          new ErrorHandler("This course only accepts students added by its instructor", 403)
        );
      }
      if (course.enrollmentMode === "code") {
        return next(new ErrorHandler("This course needs an enrollment code", 403));
      }
      if (course.price > 0) {
        return next(new ErrorHandler("This is a paid course - purchase it to enroll", 402));
      }

      const { enrollment } = await createEnrollment({
        studentId: String(req.user?._id),
        courseId,
        method: "self",
      });

      res.status(201).json({ success: true, enrollment });
    } catch (error: any) {
      return next(error instanceof ErrorHandler ? error : new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student: enroll with an invite/enrollment code -------------------

export const enrollWithCode = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, code } = req.body;

      if (!isObjectId(courseId) || typeof code !== "string" || !code.trim()) {
        return next(new ErrorHandler("Course and enrollment code are required", 400));
      }

      const course = await CourseModel.findOne({
        _id: courseId,
        status: "Published",
      }).select("+enrollmentCodeHash enrollmentMode");

      // Same message for "no such course", "not a code course" and "wrong code",
      // so nobody can probe which courses exist or use codes.
      const invalid = new ErrorHandler("Invalid course or enrollment code", 400);

      if (!course || course.enrollmentMode !== "code" || !course.enrollmentCodeHash) {
        return next(invalid);
      }

      const matches = await bcrypt.compare(code.trim(), course.enrollmentCodeHash);
      if (!matches) {
        return next(invalid);
      }

      const { enrollment } = await createEnrollment({
        studentId: String(req.user?._id),
        courseId,
        method: "code",
      });

      res.status(201).json({ success: true, enrollment });
    } catch (error: any) {
      return next(error instanceof ErrorHandler ? error : new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student: my enrollments (with progress) -------------------

export const getMyEnrollments = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const enrollments = await EnrollmentModel.find({
        student: req.user?._id,
        status: { $ne: "revoked" },
      })
        .populate("course", "name thumbnail level tags price")
        .populate("instructor", "name")
        .sort({ createdAt: -1 });

      // a course may have been deleted since - hide those rows
      res.status(200).json({
        success: true,
        enrollments: enrollments.filter((e) => e.course),
      });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student: progress in one course -------------------

export const getCourseProgress = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const progress = await getProgress(String(req.user?._id), req.params.courseId);
      res.status(200).json({ success: true, progress });
    } catch (error: any) {
      return next(error instanceof ErrorHandler ? error : new ErrorHandler(error.message, 500));
    }
  }
);

export const updateLessonProgress = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId, lessonId } = req.params;
      const completed = req.body?.completed !== false; // default: mark as complete

      const progress = await setLessonCompleted(
        String(req.user?._id),
        courseId,
        lessonId,
        completed
      );
      res.status(200).json({ success: true, progress });
    } catch (error: any) {
      return next(error instanceof ErrorHandler ? error : new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor/admin: students of a course -------------------
// Route uses authorizeCourseOwner, so :id is a course this instructor owns (or admin).

export const getCourseStudents = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const enrollments = await EnrollmentModel.find({
        course: req.params.id,
        status: { $ne: "revoked" },
      })
        .populate("student", "name email avatar")
        .sort({ createdAt: -1 });

      res.status(200).json({ success: true, enrollments });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const enrollStudentByInstructor = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const courseId = req.params.id;

      if (typeof email !== "string" || !email.trim()) {
        return next(new ErrorHandler("Student email is required", 400));
      }

      // case-insensitive exact match (special characters escaped so "a+b@x.com" stays literal)
      const escaped = email.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const student = await userModel.findOne({
        email: { $regex: new RegExp(`^${escaped}$`, "i") },
      });

      if (!student) {
        return next(new ErrorHandler("No account found with that email", 404));
      }
      if (student.role !== "student") {
        return next(new ErrorHandler("That account is not a student", 400));
      }

      const { enrollment, course } = await createEnrollment({
        studentId: String(student._id),
        courseId,
        method: "instructor",
      });

      logActivity(req, "enrollment.create", `Enrolled ${student.email} in "${course.name}"`, {
        courseId,
        studentId: student._id,
      });

      res.status(201).json({ success: true, enrollment });
    } catch (error: any) {
      return next(error instanceof ErrorHandler ? error : new ErrorHandler(error.message, 500));
    }
  }
);

export const unenrollStudent = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: courseId, studentId } = req.params;
      await revokeEnrollment(studentId, courseId);

      logActivity(req, "enrollment.revoke", `Removed a student from a course`, {
        courseId,
        studentId,
      });

      res.status(200).json({ success: true, message: "Student removed from course" });
    } catch (error: any) {
      return next(error instanceof ErrorHandler ? error : new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Admin: monitor all enrollments -------------------

export const getAllEnrollmentsAdmin = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, course } = req.query;
      const filter: Record<string, any> = {};
      if (typeof status === "string") filter.status = status;
      if (typeof course === "string" && isObjectId(course)) filter.course = course;

      const enrollments = await EnrollmentModel.find(filter)
        .populate("student", "name email")
        .populate("course", "name")
        .populate("instructor", "name")
        .sort({ createdAt: -1 })
        .limit(200);

      res.status(200).json({ success: true, enrollments });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
