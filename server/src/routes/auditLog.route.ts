import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { getAuditLogs } from "../controllers/auditLog.controller";

const auditLogRouter = express.Router();

auditLogRouter.get(
  "/admin/audit-logs",
  isAuthenticated,
  authorizeRoles("admin"),
  getAuditLogs
);

export default auditLogRouter;
