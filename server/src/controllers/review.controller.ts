import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import CourseModel from "../models/course.model";
import { redis } from "../utils/redis";
import { logActivity } from "../utils/auditLog";
import { hasActiveEnrollment, isObjectId } from "../services/enrollment.service";
import { notifyUser } from "../services/notification.service";
import { toPublicReview, toPublicUser } from "../utils/publicProfile";

const MAX_COMMENT = 2000;

// ---------------------------------------------------------------------------
// Pure helpers (no database - exported so they can be tested on their own)
// ---------------------------------------------------------------------------

// Average of the star ratings, one decimal place; 0 when there are none.
export const computeAverageRating = (ratings: number[]): number => {
  if (ratings.length === 0) return 0;
  const sum = ratings.reduce((total, r) => total + r, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
};

// Reviews from several courses as one flat, newest-first list.
// Reviews saved before timestamps existed have no date and sort last.
export const flattenReviews = (courses: { _id: any; name: string; reviews?: any[] }[]) =>
  courses
    .flatMap((course) =>
      (course.reviews || []).map((review) => ({
        courseId: course._id,
        courseName: course.name,
        ...toPublicReview(review),
      }))
    )
    .sort(
      (a, b) =>
        (b.createdAt ? +new Date(b.createdAt) : 0) - (a.createdAt ? +new Date(a.createdAt) : 0)
    );

// Recalculate a course's average from its reviews and drop the cached copies
// (the public course pages are cached in Redis for a week).
const refreshRatings = async (courseId: string) => {
  const course = await CourseModel.findById(courseId).select("reviews");
  const ratings = (course?.reviews || []).map((r: any) => Number(r.rating) || 0);
  await CourseModel.updateOne({ _id: courseId }, { ratings: computeAverageRating(ratings) });
  await redis.del(courseId);
  await redis.del("allCourses");
};

const reviewerIdOf = (review: any): string | undefined =>
  review?.user?._id ? String(review.user._id) : undefined;

// ------------------- Student: leave (or edit) a review -------------------
// One review per student: sending again updates it, so ratings can't be
// inflated by posting repeatedly.

export const addReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      const rating = Number(req.body.rating);
      const comment = String(req.body.review ?? req.body.comment ?? "").trim();

      if (!isObjectId(courseId)) {
        return next(new ErrorHandler("Invalid course id", 400));
      }
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return next(new ErrorHandler("Rating must be a whole number from 1 to 5", 400));
      }
      if (comment.length > MAX_COMMENT) {
        return next(new ErrorHandler(`Review can be at most ${MAX_COMMENT} characters`, 400));
      }

      // Checked against the enrollment record in the database - the copy of the
      // user kept in the Redis session can be stale right after enrolling.
      const userId = String(req.user?._id);
      if (!(await hasActiveEnrollment(userId, courseId))) {
        return next(new ErrorHandler("Only enrolled students can review this course", 403));
      }

      const course = await CourseModel.findById(courseId).select("name instructor reviews");
      if (!course) {
        return next(new ErrorHandler("Course not found", 404));
      }

      const existing = course.reviews.find((r: any) => reviewerIdOf(r) === userId);

      if (existing) {
        await CourseModel.updateOne(
          { _id: courseId, "reviews._id": existing._id },
          { $set: { "reviews.$.rating": rating, "reviews.$.comment": comment } }
        );
      } else {
        // Only inserts while no review from this student exists: if two requests
        // race, one of them matches nothing instead of creating a duplicate.
        const inserted = await CourseModel.updateOne(
          { _id: courseId, "reviews.user._id": { $ne: userId } },
          {
            $push: {
              reviews: {
                // just who wrote it - never the whole session user (email etc.)
                user: { _id: userId, name: req.user?.name, avatar: req.user?.avatar },
                rating,
                comment,
                createdAt: new Date(),
                commentReplies: [],
              },
            },
          }
        );
        if (inserted.modifiedCount === 0) {
          return next(new ErrorHandler("You already reviewed this course - try again to edit it", 409));
        }
      }

      await refreshRatings(courseId);

      if (course.instructor && String(course.instructor) !== userId) {
        await notifyUser(
          String(course.instructor),
          existing ? "Review updated" : "New review",
          `${req.user?.name} rated ${course.name} ${rating}/5`,
          "/instructor/reviews"
        );
      }

      res.status(200).json({ success: true, updated: !!existing });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Student: my review of a course (to prefill the form) -------------------

export const getMyReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courseId = req.params.id;
      if (!isObjectId(courseId)) {
        return next(new ErrorHandler("Invalid course id", 400));
      }

      const course = await CourseModel.findById(courseId).select("reviews");
      const mine = course?.reviews.find((r: any) => reviewerIdOf(r) === String(req.user?._id));

      res.status(200).json({ success: true, review: mine ? toPublicReview(mine) : null });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor / admin: reply to a review -------------------
// Ownership of the course is enforced by authorizeCourseOwner on the route.

export const replyToReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: courseId, reviewId } = req.params;
      const comment = String(req.body.comment || "").trim();

      if (!isObjectId(reviewId)) {
        return next(new ErrorHandler("Invalid review id", 400));
      }
      if (!comment) {
        return next(new ErrorHandler("Reply can't be empty", 400));
      }
      if (comment.length > MAX_COMMENT) {
        return next(new ErrorHandler(`Reply can be at most ${MAX_COMMENT} characters`, 400));
      }

      const course = await CourseModel.findOneAndUpdate(
        { _id: courseId, "reviews._id": reviewId },
        {
          $push: {
            "reviews.$.commentReplies": {
              user: toPublicUser(req.user),
              comment,
              createdAt: new Date(),
            },
          },
        },
        { new: true }
      ).select("name reviews");
      if (!course) {
        return next(new ErrorHandler("Review not found", 404));
      }

      await redis.del(courseId);
      await redis.del("allCourses");

      const review = course.reviews.find((r: any) => String(r._id) === reviewId);
      const reviewerId = reviewerIdOf(review);
      if (reviewerId && reviewerId !== String(req.user?._id)) {
        await notifyUser(
          reviewerId,
          "Reply to your review",
          `${req.user?.name} replied to your review of ${course.name}`,
          `/course/${courseId}`
        );
      }

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Admin: remove a review (moderation) -------------------

export const deleteReview = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id: courseId, reviewId } = req.params;
      if (!isObjectId(courseId) || !isObjectId(reviewId)) {
        return next(new ErrorHandler("Invalid id", 400));
      }

      // returns the course as it was BEFORE the pull, so we still know who wrote it
      const before = await CourseModel.findOneAndUpdate(
        { _id: courseId, "reviews._id": reviewId },
        { $pull: { reviews: { _id: reviewId } } }
      ).select("name reviews");
      if (!before) {
        return next(new ErrorHandler("Review not found", 404));
      }

      await refreshRatings(courseId);

      const removed = before.reviews.find((r: any) => String(r._id) === reviewId);
      const reviewerId = reviewerIdOf(removed);
      if (reviewerId) {
        await notifyUser(
          reviewerId,
          "Your review was removed",
          `Your review of ${before.name} was removed by a moderator`
        );
      }

      logActivity(req, "review.delete", `Removed a review on "${before.name}"`, {
        courseId,
        reviewId,
      });

      res.status(200).json({ success: true });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Instructor: reviews on MY courses -------------------

export const getInstructorReviews = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await CourseModel.find({ instructor: req.user?._id }).select("name reviews");
      res.status(200).json({ success: true, reviews: flattenReviews(courses).slice(0, 300) });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

// ------------------- Admin: every review -------------------

export const getAdminReviews = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const courses = await CourseModel.find({ "reviews.0": { $exists: true } }).select(
        "name reviews"
      );
      res.status(200).json({ success: true, reviews: flattenReviews(courses).slice(0, 300) });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
