import express from "express";
import {
  authorizeCourseOwner,
  authorizeRoles,
  isAuthenticated,
  requirePermission,
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
enrollmentRouter.post("/enroll", isAuthenticated, requirePermission("enroll.self"), authorizeRoles("student"), enrollInFreeCourse);
enrollmentRouter.post("/enroll-with-code", isAuthenticated, requirePermission("enroll.self"), authorizeRoles("student"), enrollWithCode);
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
  requirePermission("student.enroll"),
  authorizeRoles("instructor", "admin"),
  authorizeCourseOwner,
  enrollStudentByInstructor
);
enrollmentRouter.delete(
  "/instructor/courses/:id/students/:studentId",
  isAuthenticated,
  requirePermission("student.enroll"),
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
