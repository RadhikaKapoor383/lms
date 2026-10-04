import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import AnnouncementModel from "../models/announcement.model";
import CourseModel from "../models/course.model";
import EnrollmentModel from "../models/enrollment.model";
import { logActivity } from "../utils/auditLog";
import { hasCourseContentAccess, isObjectId } from "../services/enrollment.service";
import { notifyCourseStudents } from "../services/notification.service";

const MAX_TITLE = 150;
const MAX_MESSAGE = 5000;

// Public/student-facing: anyone can see current announcements
export const getAnnouncements = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // { course: null } also matches documents with no course field, i.e. all
      // the platform-wide ones (including those created before courses existed).
      // Course announcements are private to their course.
      const announcements = await AnnouncementModel.find({ course: null }).sort({
        createdAt: -1,
      });
      res.status(200).json({ success: true, announcements });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Admin only
export const createAnnouncement = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, message } = req.body;

      if (!title || !message) {
        return next(new ErrorHandler("Title and message are required", 400));
      }

      const announcement = await AnnouncementModel.create({
        title,
        message,
        createdBy: req.user?._id,
      });

      logActivity(req, "announcement.create", `Posted announcement "${title}"`, {
        announcementId: announcement._id,
      });

      res.status(201).json({ success: true, announcement });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Admin only
export const deleteAnnouncement = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const announcement = await AnnouncementModel.findById(id);

      if (!announcement) {
        return next(new ErrorHandler("Announcement not found", 404));
      }

      await announcement.deleteOne({ _id: id });

      logActivity(req, "announcement.delete", `Deleted announcement "${announcement.title}"`, {
        announcementId: id,
      });

      res
        .status(200)
        .json({ success: true, message: "Announcement deleted successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Course announcements -------------------

// Admin or the owning instructor posts to ONE course's students.
// Ownership is enforced by authorizeCourseOwner on the route.
export const createCourseAnnouncement = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const title = String(req.body.title || "").trim();
      const message = String(req.body.message || "").trim();

      if (!title || !message) {
        return next(new ErrorHandler("Title and message are required", 400));
      }
      if (title.length > MAX_TITLE) {
        return next(new ErrorHandler(`Title can be at most ${MAX_TITLE} characters`, 400));
      }
      if (message.length > MAX_MESSAGE) {
        return next(new ErrorHandler(`Message can be at most ${MAX_MESSAGE} characters`, 400));
      }

      const course = await CourseModel.findById(courseId).select("name");
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const announcement = await AnnouncementModel.create({
        title,
        message,
        course: courseId,
        createdBy: req.user?._id,
        authorName: req.user?.name,
      });

      // Tell the students it exists - the announcement itself waits on the
      // course's announcements page.
      await notifyCourseStudents(
        courseId,
        `New announcement in ${course.name}`,
        title,
        `/course-access/${courseId}/announcements`
      );

      logActivity(req, "announcement.create", `Posted "${title}" in "${course.name}"`, {
        announcementId: announcement._id,
        courseId,
      });

      res.status(201).json({ success: true, announcement });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Anyone allowed into the course: its students, its instructor, admins.
export const getCourseAnnouncements = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      if (!isObjectId(courseId)) {
        return next(new ErrorHandler("Invalid course id", 400));
      }

      const allowed = await hasCourseContentAccess(
        req.user?.role,
        String(req.user?._id),
        courseId
      );
      if (!allowed) {
        return next(new ErrorHandler("You are not eligible to access this course", 404));
      }

      const announcements = await AnnouncementModel.find({ course: courseId })
        .sort({ createdAt: -1 })
        .limit(100);

      res.status(200).json({ success: true, announcements });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const deleteCourseAnnouncement = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: courseId, announcementId } = req.params;
      if (!isObjectId(announcementId)) {
        return next(new ErrorHandler("Invalid announcement id", 400));
      }

      // Matching on course too means an instructor can't delete another
      // course's announcement by pairing their own course id with its id.
      const announcement = await AnnouncementModel.findOneAndDelete({
        _id: announcementId,
        course: courseId,
      });
      if (!announcement) {
        return next(new ErrorHandler("Announcement not found", 404));
      }

      logActivity(req, "announcement.delete", `Deleted announcement "${announcement.title}"`, {
        announcementId,
        courseId,
      });

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Student dashboard: latest platform-wide announcements plus those from the
// courses I'm learning in.
export const getMyAnnouncements = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const enrollments = await EnrollmentModel.find({
        student: req.user?._id,
        status: { $in: ["active", "completed"] },
      }).select("course");
      const courseIds = enrollments.map((e) => e.course);

      const announcements = await AnnouncementModel.find({
        $or: [{ course: null }, { course: { $in: courseIds } }],
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("course", "name");

      res.status(200).json({ success: true, announcements });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
