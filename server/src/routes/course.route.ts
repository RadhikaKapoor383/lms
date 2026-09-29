import express from "express";
import {
  authorizeCourseOwner,
  authorizeRoles,
  isAuthenticated,
} from "../middleware/auth";
import {
  addAnswer,
  addQuestion,
  addReplyToReview,
  addReview,
  deleteCourse,
  editCourse,
  getAdminAllCourses,
  getAllCourses,
  getCourseForEdit,
  getInstructorCourses,
  getCourseByUser,
  getSingleCourse,
  updateCourseStatus,
  uploadCourse,
} from "../controllers/course.controller";

const courseRouter = express.Router();

// Admin can create/edit any course; an instructor only their own
// (authorizeCourseOwner checks the course's instructor against the logged-in user).
courseRouter.post(
  "/create-course",
  isAuthenticated,
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
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  editCourse
);

courseRouter.get(
  "/instructor/courses",
  isAuthenticated,
  authorizeRoles("instructor"),
  getInstructorCourses
);

courseRouter.get("/get-course/:id", getSingleCourse);
courseRouter.get("/get-courses", getAllCourses);
courseRouter.get("/get-course-content/:id", isAuthenticated, getCourseByUser);

courseRouter.put("/add-question", isAuthenticated, addQuestion);
courseRouter.put("/add-answer", isAuthenticated, addAnswer);
courseRouter.put("/add-review/:id", isAuthenticated, addReview);
courseRouter.put(
  "/add-reply-review",
  isAuthenticated,
  authorizeRoles("admin"),
  addReplyToReview
);

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