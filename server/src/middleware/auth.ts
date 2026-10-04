import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import CourseModel from "../models/course.model";
import AssignmentModel from "../models/assignment.model";
import QuizModel from "../models/quiz.model";

export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token;

    if (!access_token) {
      return next(
        new ErrorHandler("Please login to access this resource", 400)
      );
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        access_token,
        process.env.ACCESS_TOKEN as string
      ) as JwtPayload;
    } catch (err) {
      return next(new ErrorHandler("Access token is not valid", 400));
    }

    const user = await redis.get(decoded.id);

    if (!user) {
      return next(new ErrorHandler("User not found", 400));
    }

    req.user = JSON.parse(user);
    // sessions cached before the toJSON fix may still hold the hash
    delete (req.user as any).password;
    next();
  }
);

export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user?.role || "")) {
      return next(
        new ErrorHandler(
          `Role: ${req.user?.role} is not allowed to access this resource`,
          403
        )
      );
    }
    next();
  };
};

// Layer 3: ownership. Roles say *what kind* of user you are; this says whether
// the course in the URL (/:id) is actually yours. Admins can manage any course.
// Use it AFTER isAuthenticated (and normally after authorizeRoles).
export const authorizeCourseOwner = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === "admin") {
      return next();
    }

    const courseId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return next(new ErrorHandler("Invalid course id", 400));
    }

    const course = await CourseModel.findById(courseId).select("instructor");
    if (!course) {
      return next(new ErrorHandler("Course not found", 404));
    }

    // req.user comes from the Redis session, so _id is a plain string here.
    const isOwner =
      !!course.instructor &&
      String(course.instructor) === String(req.user?._id);

    if (!isOwner) {
      return next(
        new ErrorHandler("You can only manage your own courses", 403)
      );
    }

    next();
  }
);

// Same idea as authorizeCourseOwner, but for a route keyed by an assignment's
// own :id (creating an assignment for a course still goes through
// authorizeCourseOwner - this is for editing/deleting/grading an assignment
// that already exists).
export const authorizeAssignmentOwner = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === "admin") {
      return next();
    }

    const assignmentId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
      return next(new ErrorHandler("Invalid assignment id", 400));
    }

    const assignment = await AssignmentModel.findById(assignmentId).select("instructor");
    if (!assignment) {
      return next(new ErrorHandler("Assignment not found", 404));
    }

    const isOwner = String(assignment.instructor) === String(req.user?._id);
    if (!isOwner) {
      return next(
        new ErrorHandler("You can only manage your own assignments", 403)
      );
    }

    next();
  }
);

// Same idea as authorizeAssignmentOwner, for a route keyed by a quiz's own :id.
export const authorizeQuizOwner = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === "admin") {
      return next();
    }

    const quizId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(quizId)) {
      return next(new ErrorHandler("Invalid quiz id", 400));
    }

    const quiz = await QuizModel.findById(quizId).select("instructor");
    if (!quiz) {
      return next(new ErrorHandler("Quiz not found", 404));
    }

    const isOwner = String(quiz.instructor) === String(req.user?._id);
    if (!isOwner) {
      return next(new ErrorHandler("You can only manage your own quizzes", 403));
    }

    next();
  }
);
