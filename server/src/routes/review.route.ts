import express from "express";
import { authorizeCourseOwner, authorizeRoles, isAuthenticated, requirePermission } from "../middleware/auth";
import {
  addReview,
  deleteReview,
  getAdminReviews,
  getInstructorReviews,
  getMyReview,
  replyToReview,
} from "../controllers/review.controller";

const reviewRouter = express.Router();

// student (existing path kept): create or edit my review
reviewRouter.put("/add-review/:id", isAuthenticated, requirePermission("review.write"), authorizeRoles("student"), addReview);
reviewRouter.get("/courses/:id/my-review", isAuthenticated, authorizeRoles("student"), getMyReview);

// instructor of the course, or admin: reply to a review
reviewRouter.put(
  "/courses/:id/reviews/:reviewId/reply",
  isAuthenticated,
  requirePermission("review.reply"),
  authorizeRoles("admin", "instructor"),
  authorizeCourseOwner,
  replyToReview
);

// lists
reviewRouter.get(
  "/instructor/reviews",
  isAuthenticated,
  authorizeRoles("instructor"),
  getInstructorReviews
);
reviewRouter.get("/admin/reviews", isAuthenticated, authorizeRoles("admin"), getAdminReviews);

// moderation: only admins remove reviews
reviewRouter.delete(
  "/admin/courses/:id/reviews/:reviewId",
  isAuthenticated,
  authorizeRoles("admin"),
  deleteReview
);

export default reviewRouter;
