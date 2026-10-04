import { Request, Response, NextFunction } from "express";
import cron from "node-cron";

import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import NotificationModel from "../models/notification.model";
import { isObjectId } from "../services/enrollment.service";
import { sendDeadlineReminders } from "../services/deadlineReminder.service";

export const getNotifications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notifications = await NotificationModel.find().sort({
        createdAt: -1,
      });
      res.status(200).json({ success: true, notifications });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const updateNotification = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const notification = await NotificationModel.findById(req.params.id);

      if (!notification) {
        return next(new ErrorHandler("Notification not found", 404));
      }

      notification.status = "read";
      await notification.save();

      const notifications = await NotificationModel.find().sort({
        createdAt: -1,
      });

      res.status(200).json({ success: true, notifications });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Personal notifications (any logged-in user) -------------------
// The /admin/notifications endpoints above show EVERYONE's notifications to an
// admin. These show only the caller's own - they power the header bell.

export const getMyNotifications = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = String(req.user?._id);

      const [notifications, unreadCount] = await Promise.all([
        NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(50),
        NotificationModel.countDocuments({ userId, status: "unread" }),
      ]);

      res.status(200).json({ success: true, notifications, unreadCount });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const markNotificationRead = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      if (!isObjectId(id)) {
        return next(new ErrorHandler("Invalid notification id", 400));
      }

      // userId in the filter = you can only mark YOUR notifications. Someone
      // else's id simply doesn't match and looks like "not found".
      const updated = await NotificationModel.findOneAndUpdate(
        { _id: id, userId: String(req.user?._id) },
        { status: "read" },
        { new: true }
      );
      if (!updated) {
        return next(new ErrorHandler("Notification not found", 404));
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const markAllNotificationsRead = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await NotificationModel.updateMany(
        { userId: String(req.user?._id), status: "unread" },
        { status: "read" }
      );
      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// Every hour: remind students about assignments due within 24 hours.
cron.schedule("0 0 * * * *", async () => {
  try {
    const { assignments, reminded } = await sendDeadlineReminders();
    if (assignments > 0) {
      console.log(`Deadline reminders: ${assignments} assignment(s), ${reminded} notification(s)`);
    }
  } catch (error: any) {
    console.error("Deadline reminder job failed:", error.message);
  }
});

// Runs every night at midnight - deletes read notifications older than 30 days
// so the collection doesn't grow forever with stale data.
cron.schedule("0 0 0 * * *", async () => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await NotificationModel.deleteMany({
    status: "read",
    createdAt: { $lt: thirtyDaysAgo },
  });
  console.log("Deleted read notifications older than 30 days");
});
