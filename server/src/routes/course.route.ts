import express from "express";
import { getCourseFilters, searchCourses } from "../controllers/courseSearch.controller";
import { getCompletionRules, updateCompletionRules } from "../controllers/completionRules.controller";
import {
  authorizeCourseOwner,
  authorizeRoles,
  isAuthenticated,
  requirePermission,
} from "../middleware/auth";
import {
  deleteCourse,
  editCourse,
  getAdminAllCourses,
  getAllCourses,
  getCourseForEdit,
  getInstructorCourses,
  getCourseByUser,
  getSingleCourse,
  submitCourseForApproval,
  updateCourseStatus,
  uploadCourse,
  withdrawCourseSubmission,
} from "../controllers/course.controller";

const courseRouter = express.Router();

// Admin can create/edit any course; an instructor only their own
// (authorizeCourseOwner checks the course's instructor against the logged-in user).
courseRouter.post(
  "/create-course",
  isAuthenticated,
  requirePermission("course.create"),
  authorizeRoles("admin", "instructor"),
  uploadCourse
);

courseRouter.get(
  "/edit-course/:id",
  isAuthenticated,
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  getCourseForEdit
);

courseRouter.put(
  "/edit-course/:id",
  isAuthenticated,
  requirePermission("course.edit"),
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  editCourse
);

courseRouter.put(
  "/courses/:id/submit-for-approval",
  isAuthenticated,
  requirePermission("course.submit"),
  authorizeRoles("instructor"),
  authorizeCourseOwner,
  submitCourseForApproval
);

courseRouter.put(
  "/courses/:id/withdraw-submission",
  isAuthenticated,
  authorizeRoles("instructor"),
  authorizeCourseOwner,
  withdrawCourseSubmission
);

courseRouter.get(
  "/instructor/courses",
  isAuthenticated,
  authorizeRoles("instructor"),
  getInstructorCourses
);

courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-courses", getAllCourses);

// what a student must do to complete the course (owner or admin)
courseRouter.get(
  "/courses/:id/completion-rules",
  isAuthenticated,
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  getCompletionRules
);
courseRouter.put(
  "/courses/:id/completion-rules",
  isAuthenticated,
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  updateCompletionRules
);

// public search + the options for its filter dropdowns
courseRouter.get("/courses/search", searchCourses);
courseRouter.get("/courses/filters", getCourseFilters);
courseRouter.get("/get-course-content/:id", isAuthenticated, getCourseByUser);

courseRouter.get(
  "/admin/courses",
  isAuthenticated,
  authorizeRoles("admin"),
  getAdminAllCourses
);

courseRouter.put(
  "/admin/course-status/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  updateCourseStatus
);

courseRouter.delete(
  "/delete-course/:id",
  isAuthenticated,
  authorizeRoles("admin"),
  deleteCourse
);

export default courseRouter;