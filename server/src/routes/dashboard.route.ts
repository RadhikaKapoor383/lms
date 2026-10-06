import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  getAdminDashboard,
  getInstructorDashboard,
  getStudentDashboard,
} from "../controllers/dashboard.controller";
import {
  getAdminAnalytics,
  getInstructorAnalytics,
  getStudentAnalytics,
} from "../controllers/analytics.controller";

const dashboardRouter = express.Router();

dashboardRouter.get("/admin/dashboard", isAuthenticated, authorizeRoles("admin"), getAdminDashboard);
dashboardRouter.get("/admin/analytics", isAuthenticated, authorizeRoles("admin"), getAdminAnalytics);

dashboardRouter.get("/instructor/dashboard", isAuthenticated, authorizeRoles("instructor"), getInstructorDashboard);
dashboardRouter.get("/instructor/analytics", isAuthenticated, authorizeRoles("instructor"), getInstructorAnalytics);

dashboardRouter.get("/student/dashboard", isAuthenticated, authorizeRoles("student"), getStudentDashboard);
dashboardRouter.get("/student/analytics", isAuthenticated, authorizeRoles("student"), getStudentAnalytics);

export default dashboardRouter;
