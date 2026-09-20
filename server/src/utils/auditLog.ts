import { Request } from "express";
import AuditLogModel from "../models/auditLog.model";

// Fire-and-forget: logging failures should never break the actual request.
// Called from admin-only controller actions after the real work succeeds.
export const logActivity = (
  req: Request,
  action: string,
  targetLabel: string,
  meta?: Record<string, any>
) => {
  AuditLogModel.create({
    userId: req.user?._id,
    userName: req.user?.name || "Unknown",
    action,
    targetLabel,
    meta,
  }).catch((err) => {
    console.error("Failed to write audit log:", err.message);
  });
};