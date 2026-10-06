import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  getPlatformSettings,
  updatePlatformSettings,
} from "../controllers/settings.controller";

const settingsRouter = express.Router();

settingsRouter.get("/admin/settings", isAuthenticated, authorizeRoles("admin"), getPlatformSettings);
settingsRouter.put("/admin/settings", isAuthenticated, authorizeRoles("admin"), updatePlatformSettings);

export default settingsRouter;
