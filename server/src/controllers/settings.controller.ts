import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import SettingsModel from "../models/settings.model";
import { logActivity } from "../utils/auditLog";
import { getSettings, parseSettingsUpdate } from "../services/settings.service";

const toResponse = (s: any) => ({
  platformName: s.platformName,
  requireCourseApproval: s.requireCourseApproval,
  allowSelfEnrollment: s.allowSelfEnrollment,
  updatedAt: s.updatedAt,
});

export const getPlatformSettings = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json({ success: true, settings: toResponse(await getSettings()) });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const updatePlatformSettings = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = parseSettingsUpdate(req.body);
      if ("error" in parsed) {
        return next(new ErrorHandler(parsed.error, 400));
      }

      await getSettings(); // make sure it exists before updating
      const settings = await SettingsModel.findOneAndUpdate(
        { key: "platform" },
        { ...parsed.update, updatedBy: String(req.user?._id) },
        { new: true }
      );

      logActivity(
        req,
        "settings.update",
        `Changed platform settings: ${Object.keys(parsed.update).join(", ")}`,
        { changes: parsed.update }
      );

      res.status(200).json({ success: true, settings: toResponse(settings) });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
