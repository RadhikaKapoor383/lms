import express, { NextFunction, Request, Response } from "express";
export const app = express();
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import { ErrorMiddleware } from "./middleware/error";
import userRouter from "./routes/user.route";
import courseRouter from "./routes/course.route";
import orderRouter from "./routes/order.route";
import notificationRouter from "./routes/notification.route";
import analyticsRouter from "./routes/analytics.route";
import layoutRouter from "./routes/layout.route";
import announcementRouter from "./routes/announcement.route";
import auditLogRouter from "./routes/auditLog.route";
import enrollmentRouter from "./routes/enrollment.route";
import categoryRouter from "./routes/category.route";
import assignmentRouter from "./routes/assignment.route";
import quizRouter from "./routes/quiz.route";
import certificateRouter from "./routes/certificate.route";
import discussionRouter from "./routes/discussion.route";
import reviewRouter from "./routes/review.route";

// body parser
app.use(express.json({ limit: "50mb" }));

// cookie parser
app.use(cookieParser());

// cors - only allow requests from our own frontend
app.use(
  cors({
    origin: process.env.ORIGIN,
    credentials: true,
  })
);

// routes
app.use(
  "/api/v1",
  userRouter,
  courseRouter,
  orderRouter,
  notificationRouter,
  analyticsRouter,
  layoutRouter,
  announcementRouter,
  auditLogRouter,
  enrollmentRouter,
  categoryRouter,
  assignmentRouter,
  quizRouter,
  certificateRouter,
  discussionRouter,
  reviewRouter
);

// testing route
app.get("/test", (req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "API is working" });
});

// unknown route
app.all("*", (req: Request, res: Response, next: NextFunction) => {
  const err = new Error(`Route ${req.originalUrl} not found`) as any;
  err.statusCode = 404;
  next(err);
});

app.use(ErrorMiddleware);