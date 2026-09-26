import express from "express";
import {
  authorizeCourseOwner,
  authorizeRoles,
  isAuthenticated,
} from "../middleware/auth";
import {
  enrollInFreeCourse,
  enrollStudentByInstructor,
  enrollWithCode,
  getAllEnrollmentsAdmin,
  getCourseProgress,
  getCourseStudents,
  getMyEnrollments,
  unenrollStudent,
  updateLessonProgress,
} from "../controllers/enrollment.controller";

const enrollmentRouter = express.Router();

// ---- Student ----
enrollmentRouter.post("/enroll", isAuthenticated, authorizeRoles("student"), enrollInFreeCourse);
enrollmentRouter.post("/enroll-with-code", isAuthenticated, authorizeRoles("student"), enrollWithCode);
enrollmentRouter.get("/my-enrollments", isAuthenticated, authorizeRoles("student"), getMyEnrollments);
enrollmentRouter.get("/progress/:courseId", isAuthenticated, authorizeRoles("student"), getCourseProgress);
enrollmentRouter.put(
  "/progress/:courseId/lessons/:lessonId",
  isAuthenticated,
  authorizeRoles("student"),
  updateLessonProgress
);

// ---- Instructor (own courses) / Admin ----
enrollmentRouter.get(
  "/instructor/courses/:id/students",
  isAuthenticated,
  authorizeRoles("instructor", "admin"),
  authorizeCourseOwner,
  getCourseStudents
);
enrollmentRouter.post(
  "/instructor/courses/:id/enroll",
  isAuthenticated,
  authorizeRoles("instructor", "admin"),
  authorizeCourseOwner,
  enrollStudentByInstructor
);
enrollmentRouter.delete(
  "/instructor/courses/:id/students/:studentId",
  isAuthenticated,
  authorizeRoles("instructor", "admin"),
  authorizeCourseOwner,
  unenrollStudent
);

// ---- Admin ----
enrollmentRouter.get(
  "/admin/enrollments",
  isAuthenticated,
  authorizeRoles("admin"),
  getAllEnrollmentsAdmin
);

export default enrollmentRouter;
