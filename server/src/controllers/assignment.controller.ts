import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import AssignmentModel from "../models/assignment.model";
import AssignmentSubmissionModel from "../models/assignmentSubmission.model";
import EnrollmentModel from "../models/enrollment.model";
import CourseModel from "../models/course.model";
import NotificationModel from "../models/notification.model";
import { notifyCourseStudents } from "../services/notification.service";
import { hasCourseContentAccess } from "../services/enrollment.service";
import { logActivity } from "../utils/auditLog";
import { parseHttpsUrl } from "../utils/safeUrl";

const MAX_SUBMISSION_TEXT = 20000;

// ------------------- Create (admin, or the instructor who owns the course) -------------------
// Route is keyed by :id = courseId, guarded by authorizeCourseOwner.

export const createAssignment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const { title, instructions, resources, maxMarks, deadline, allowResubmission } = req.body;

      if (!title || !maxMarks || !deadline) {
        return next(new ErrorHandler("title, maxMarks and deadline are required", 400));
      }

      const course = await CourseModel.findById(courseId).select("instructor name");
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      // For an admin creating an assignment on a course with no instructor
      // assigned yet, fall back to the admin as the owner - otherwise nothing
      // could ever own (or grade) it.
      const instructor = course.instructor || req.user?._id;

      const assignment = await AssignmentModel.create({
        course: courseId,
        instructor,
        title,
        instructions,
        resources: resources || [],
        maxMarks,
        deadline,
        allowResubmission: !!allowResubmission,
      });

      logActivity(req, "assignment.create", `Created assignment "${title}" for "${course.name}"`, {
        assignmentId: assignment._id,
        courseId,
      });

      await notifyCourseStudents(
        courseId,
        "New assignment",
        `"${title}" was posted in ${course.name}, due ${new Date(deadline).toLocaleDateString()}`,
        `/course-access/${courseId}/assignments`
      );

      res.status(201).json({ success: true, assignment });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Edit (admin, or the owning instructor) -------------------

export const editAssignment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, instructions, resources, maxMarks, deadline, allowResubmission } = req.body;

      const assignment = await AssignmentModel.findByIdAndUpdate(
        req.params.id,
        {
          ...(title !== undefined && { title }),
          ...(instructions !== undefined && { instructions }),
          ...(resources !== undefined && { resources }),
          ...(maxMarks !== undefined && { maxMarks }),
          // a new deadline deserves a fresh reminder
          ...(deadline !== undefined && { deadline, deadlineReminderSent: false }),
          ...(allowResubmission !== undefined && { allowResubmission: !!allowResubmission }),
        },
        { new: true, runValidators: true }
      );

      if (!assignment) {
        return next(new ErrorHandler("Assignment not found", 404));
      }

      res.status(200).json({ success: true, assignment });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Delete (admin, or the owning instructor) -------------------

export const deleteAssignment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignment = await AssignmentModel.findByIdAndDelete(req.params.id);
      if (!assignment) {
        return next(new ErrorHandler("Assignment not found", 404));
      }

      await AssignmentSubmissionModel.deleteMany({ assignment: assignment._id });

      res.status(200).json({ success: true, message: "Assignment deleted" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- List a course's assignments -------------------
// admin/owning-instructor/enrolled-student only (same gate as lesson content).
// A student's own submission (if any) is embedded per assignment so the
// client doesn't need a second round trip per assignment.

export const getCourseAssignments = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;

      const allowed = await hasCourseContentAccess(req.user?.role, String(req.user?._id), courseId);
      if (!allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      const assignments = await AssignmentModel.find({ course: courseId }).sort({ deadline: 1 });

      if (req.user?.role === "student") {
        const submissions = await AssignmentSubmissionModel.find({
          course: courseId,
          student: req.user._id,
        });
        const byAssignment = new Map(submissions.map((s) => [String(s.assignment), s]));

        const withSubmissions = assignments.map((a) => ({
          ...a.toObject(),
          mySubmission: byAssignment.get(String(a._id)) || null,
        }));
        return res.status(200).json({ success: true, assignments: withSubmissions });
      }

      // instructor/admin: a quick submission count per assignment, not the
      // full list (that's getAssignmentSubmissions, for the grading screen)
      const counts = await AssignmentSubmissionModel.aggregate([
        { $match: { course: new mongoose.Types.ObjectId(courseId) } },
        { $group: { _id: "$assignment", count: { $sum: 1 } } },
      ]);
      const countByAssignment = new Map(counts.map((c) => [String(c._id), c.count]));

      const withCounts = assignments.map((a) => ({
        ...a.toObject(),
        submissionCount: countByAssignment.get(String(a._id)) || 0,
      }));

      res.status(200).json({ success: true, assignments: withCounts });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- List submissions for one assignment (grading screen) -------------------

export const getAssignmentSubmissions = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const submissions = await AssignmentSubmissionModel.find({ assignment: req.params.id })
        .populate("student", "name email")
        .sort({ submittedAt: -1 });

      res.status(200).json({ success: true, submissions });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student: submit or resubmit -------------------

export const submitAssignment = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignmentId = req.params.id;
      const { submissionText: rawText, fileUrl: rawUrl } = req.body ?? {};

      if (rawText !== undefined && rawText !== null && typeof rawText !== "string") {
        return next(new ErrorHandler("Submission text must be text", 400));
      }
      if (typeof rawText === "string" && rawText.length > MAX_SUBMISSION_TEXT) {
        return next(
          new ErrorHandler(`Submission text can be at most ${MAX_SUBMISSION_TEXT} characters`, 400)
        );
      }
      const submissionText = typeof rawText === "string" ? rawText.trim() || undefined : undefined;

      // The link is shown to the instructor as a clickable link, so it has to
      // be a plain https:// link (no javascript:, data:, file: ...).
      let fileUrl: string | undefined;
      if (rawUrl !== undefined && rawUrl !== null && rawUrl !== "") {
        const clean = parseHttpsUrl(rawUrl);
        if (!clean) {
          return next(new ErrorHandler("The file link must be a valid https:// link", 400));
        }
        fileUrl = clean;
      }

      if (!submissionText && !fileUrl) {
        return next(new ErrorHandler("Submit some text or a file link", 400));
      }

      const assignment = await AssignmentModel.findById(assignmentId);
      if (!assignment) {
        return next(new ErrorHandler("Assignment not found", 404));
      }

      const allowed = await hasCourseContentAccess(
        req.user?.role,
        String(req.user?._id),
        String(assignment.course)
      );
      if (!allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      const existing = await AssignmentSubmissionModel.findOne({
        assignment: assignmentId,
        student: req.user?._id,
      });

      if (existing && !assignment.allowResubmission) {
        return next(
          new ErrorHandler("This assignment doesn't allow resubmission", 409)
        );
      }

      const isLate = new Date() > new Date(assignment.deadline);

      const submission = await AssignmentSubmissionModel.findOneAndUpdate(
        { assignment: assignmentId, student: req.user?._id },
        {
          assignment: assignmentId,
          course: assignment.course,
          student: req.user?._id,
          submissionText,
          fileUrl,
          submittedAt: new Date(),
          isLate,
          // A resubmission invalidates whatever grade was already given
          $unset: { marks: "", feedback: "", gradedBy: "", gradedAt: "" },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await NotificationModel.create({
        userId: assignment.instructor,
        title: "New assignment submission",
        message: `${req.user?.name} submitted "${assignment.title}"`,
        link: `/instructor/assignments/${assignment._id}/submissions`,
      });

      res.status(existing ? 200 : 201).json({ success: true, submission });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor/admin: grade a submission -------------------
// Route is keyed by :id = assignmentId (so authorizeAssignmentOwner applies)
// plus :studentId identifying which student's submission to grade.

export const gradeSubmission = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: assignmentId, studentId } = req.params;
      const { marks, feedback } = req.body;

      if (marks === undefined || marks === null) {
        return next(new ErrorHandler("marks is required", 400));
      }

      const assignment = await AssignmentModel.findById(assignmentId).select("maxMarks title");
      if (!assignment) {
        return next(new ErrorHandler("Assignment not found", 404));
      }
      if (marks < 0 || marks > assignment.maxMarks) {
        return next(new ErrorHandler(`marks must be between 0 and ${assignment.maxMarks}`, 400));
      }

      const submission = await AssignmentSubmissionModel.findOneAndUpdate(
        { assignment: assignmentId, student: studentId },
        { marks, feedback, gradedBy: req.user?._id, gradedAt: new Date() },
        { new: true }
      );

      if (!submission) {
        return next(new ErrorHandler("This student hasn't submitted yet", 404));
      }

      await NotificationModel.create({
        userId: studentId,
        title: "Assignment graded",
        message: `Your submission for "${assignment.title}" was graded`,
        link: `/course-access/${assignment.course}/assignments`,
      });

      res.status(200).json({ success: true, submission });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student: upcoming deadlines across every enrolled course -------------------

export const getMyAssignments = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const enrollments = await EnrollmentModel.find({
        student: req.user?._id,
        status: { $ne: "revoked" },
      }).select("course");
      const courseIds = enrollments.map((e) => e.course);

      const assignments = await AssignmentModel.find({ course: { $in: courseIds } })
        .populate("course", "name")
        .sort({ deadline: 1 });

      const submissions = await AssignmentSubmissionModel.find({ student: req.user?._id });
      const byAssignment = new Map(submissions.map((s) => [String(s.assignment), s]));

      const withSubmissions = assignments.map((a) => ({
        ...a.toObject(),
        mySubmission: byAssignment.get(String(a._id)) || null,
      }));

      res.status(200).json({ success: true, assignments: withSubmissions });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
