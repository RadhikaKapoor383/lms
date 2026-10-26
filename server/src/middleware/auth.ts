import { Request, Response, NextFunction } from "express";
import { CatchAsyncError } from "./catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import jwt, { JwtPayload } from "jsonwebtoken";
import { redis } from "../utils/redis";
import mongoose from "mongoose";
import CourseModel from "../models/course.model";
import AssignmentModel from "../models/assignment.model";
import QuizModel from "../models/quiz.model";
import { getPermission, isAllowed } from "../services/permissions.service";
import { loadDeniedPermissions } from "../services/rolePermissionsStore.service";
import {
  endSession,
  getSessionLimits,
  isPastMax,
  sessionEndedError,
  touchSession,
} from "../utils/session";

export const isAuthenticated = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    const access_token = req.cookies.access_token;

    // 401 = "not logged in (any more)". The website reacts to it: an expired
    // access token is renewed quietly, a finished session sends you to login.
    if (!access_token) {
      return next(
        new ErrorHandler("Please login to access this resource", 401, "AUTH_REQUIRED")
      );
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        access_token,
        process.env.ACCESS_TOKEN as string
      ) as JwtPayload;
    } catch (err) {
      return next(new ErrorHandler("Access token is not valid", 401, "TOKEN_EXPIRED"));
    }

    // Tokens from before sessions existed carry no session id: log in again.
    if (typeof decoded.sid !== "string" || typeof decoded.loginAt !== "number") {
      return next(new ErrorHandler("Please log in again", 401, "AUTH_REQUIRED"));
    }

    const { maxSeconds } = getSessionLimits();
    if (isPastMax(decoded.loginAt, maxSeconds)) {
      await endSession(decoded.sid);
      return next(sessionEndedError("max"));
    }
    // Still within the cap: is the login alive (not idle too long, not logged
    // out)? This also restarts the idle clock.
    if (!(await touchSession(decoded.sid, String(decoded.id)))) {
      return next(sessionEndedError("idle"));
    }

    const user = await redis.get(decoded.id);

    if (!user) {
      return next(new ErrorHandler("User not found", 401, "AUTH_REQUIRED"));
    }

    req.sessionInfo = { sid: decoded.sid, loginAt: decoded.loginAt };

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

// Role permissions an admin can switch off (see services/permissions.service.ts).
// Use AFTER isAuthenticated. Admins always pass; a permission of another role
// doesn't apply to this user. The key is checked when the route is defined,
// so a typo fails at startup instead of silently allowing everything.
export const requirePermission = (key: string) => {
  const permission = getPermission(key);
  if (!permission) throw new Error(`requirePermission: unknown permission "${key}"`);
  return CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    const role = req.user?.role;
    if (role === "admin" || role !== permission.role) return next();
    if (!isAllowed(role, key, await loadDeniedPermissions())) {
      return next(
        new ErrorHandler(
          `On this platform ${role}s are not allowed to ${permission.label}. Ask an admin if you need this.`,
          403,
          "PERMISSION_DENIED"
        )
      );
    }
    next();
  });
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
