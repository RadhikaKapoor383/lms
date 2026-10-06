import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  assignCourseInstructor,
  getCourseApprovals,
  getInstructorDetail,
  getInstructors,
  setUserActive,
} from "../controllers/adminManagement.controller";

const adminManagementRouter = express.Router();

const adminOnly = [isAuthenticated, authorizeRoles("admin")];

adminManagementRouter.put("/admin/users/:id/status", ...adminOnly, setUserActive);

adminManagementRouter.get("/admin/instructors", ...adminOnly, getInstructors);
adminManagementRouter.get("/admin/instructors/:id", ...adminOnly, getInstructorDetail);

adminManagementRouter.put("/admin/courses/:id/instructor", ...adminOnly, assignCourseInstructor);
adminManagementRouter.get("/admin/course-approvals", ...adminOnly, getCourseApprovals);

export default adminManagementRouter;
