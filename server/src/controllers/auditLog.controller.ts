import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import AuditLogModel from "../models/auditLog.model";

export const getAuditLogs = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const logs = await AuditLogModel.find().sort({ createdAt: -1 }).limit(200);
      res.status(200).json({ success: true, logs });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);