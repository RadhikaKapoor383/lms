import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { getMyPermissions, getRolePermissions, updateRolePermissions } from "../controllers/permissions.controller";

const permissionsRouter = express.Router();

permissionsRouter.get("/admin/permissions", isAuthenticated, authorizeRoles("admin"), getRolePermissions);
permissionsRouter.put("/admin/permissions", isAuthenticated, authorizeRoles("admin"), updateRolePermissions);
permissionsRouter.get("/my-permissions", isAuthenticated, getMyPermissions);

export default permissionsRouter;
