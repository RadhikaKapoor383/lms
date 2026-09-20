import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import AnnouncementModel from "../models/announcement.model";
import { logActivity } from "../utils/auditLog";

// Public/student-facing: anyone can see current announcements
export const getAnnouncements = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const announcements = await AnnouncementModel.find().sort({
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