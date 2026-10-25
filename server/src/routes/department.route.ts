import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  setInstructorDepartment,
  updateDepartment,
} from "../controllers/department.controller";

const departmentRouter = express.Router();

const adminOnly = [isAuthenticated, authorizeRoles("admin")];

// Any signed-in user can read the list (the course form needs it). The public
// course search gets its department options from /courses/filters instead.
departmentRouter.get("/departments", isAuthenticated, getDepartments);

departmentRouter.post("/admin/departments", ...adminOnly, createDepartment);
departmentRouter.put("/admin/departments/:id", ...adminOnly, updateDepartment);
departmentRouter.delete("/admin/departments/:id", ...adminOnly, deleteDepartment);

departmentRouter.put("/admin/instructors/:id/department", ...adminOnly, setInstructorDepartment);

export default departmentRouter;
