import express from "express";
import {
  authorizeCourseOwner,
  authorizeQuizOwner,
  authorizeRoles,
  isAuthenticated,
  requirePermission,
} from "../middleware/auth";
import {
  createQuiz,
  deleteQuiz,
  editQuiz,
  getCourseQuizzes,
  getQuiz,
  getMyQuizzes,
  getQuizAttempts,
  startQuizAttempt,
  submitQuizAttempt,
} from "../controllers/quiz.controller";

const quizRouter = express.Router();

// :id = courseId here, guarded the same way course editing is.
quizRouter.post(
  "/courses/:id/quizzes",
  isAuthenticated,
  requirePermission("quiz.manage"),
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  createQuiz
);

// Role-aware (student vs instructor/admin) inside the controller via
// hasCourseContentAccess, so no ownership middleware on this one.
quizRouter.get("/courses/:id/quizzes", isAuthenticated, getCourseQuizzes);
quizRouter.get("/my-quizzes", isAuthenticated, authorizeRoles("student"), getMyQuizzes);

// From here, :id = quizId.
quizRouter.get("/quizzes/:id", isAuthenticated, getQuiz);

quizRouter.put(
  "/quizzes/:id",
  isAuthenticated,
  requirePermission("quiz.manage"),
  authorizeRoles("admin", "instructor"),
  authorizeQuizOwner,
  editQuiz
);

quizRouter.delete(
  "/quizzes/:id",
  isAuthenticated,
  requirePermission("quiz.manage"),
  authorizeRoles("admin", "instructor"),
  authorizeQuizOwner,
  deleteQuiz
);

quizRouter.get(
  "/quizzes/:id/attempts",
  isAuthenticated,
  authorizeRoles("admin", "instructor"),
  authorizeQuizOwner,
  getQuizAttempts
);

quizRouter.post(
  "/quizzes/:id/start",
  isAuthenticated,
  authorizeRoles("student"),
  startQuizAttempt
);

quizRouter.post(
  "/quizzes/:id/attempts",
  isAuthenticated,
  authorizeRoles("student"),
  submitQuizAttempt
);

export default quizRouter;
