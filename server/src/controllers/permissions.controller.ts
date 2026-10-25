import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import { logActivity } from "../utils/auditLog";
import { PERMISSIONS, allowedKeysFor, describePermissions, parsePermissionUpdate } from "../services/permissions.service";
import { loadDeniedPermissions, saveDeniedPermissions } from "../services/rolePermissionsStore.service";

// Admin: every permission with whether it is on.
export const getRolePermissions = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({ success: true, permissions: describePermissions(await loadDeniedPermissions()) });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// Admin: switch permissions on or off.
// Body: { instructor?: { "quiz.manage": false, ... }, student?: { ... } }
// A role that is sent replaces that role's whole list; a role left out is unchanged.
export const updateRolePermissions = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = parsePermissionUpdate(req.body);
    if ("error" in parsed) return next(new ErrorHandler(parsed.error, 400));
    const changes: Record<string, string[]> = {};
    for (const role of ["instructor", "student"] as const) {
      if (req.body?.[role] !== undefined) changes[role] = parsed.denied[role];
    }
    if (Object.keys(changes).length === 0) return next(new ErrorHandler("Nothing to update", 400));

    const denied = await saveDeniedPermissions(changes, String(req.user?._id));
    logActivity(
      req,
      "permissions.update",
      `Changed role permissions (${Object.entries(changes)
        .map(([role, list]) => `${role}: ${list.length ? `off - ${list.join(", ")}` : "everything on"}`)
        .join("; ")})`,
      { changes }
    );
    res.status(200).json({ success: true, permissions: describePermissions(denied) });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// Anyone signed in: what my role may do, so the website can hide the rest.
export const getMyPermissions = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = req.user?.role;
    res.status(200).json({
      success: true,
      role,
      // the permissions that apply to this role at all, and which of them are on
      governed: PERMISSIONS.filter((p) => p.role === role).map((p) => p.key),
      allowed: allowedKeysFor(role, await loadDeniedPermissions()),
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
});
