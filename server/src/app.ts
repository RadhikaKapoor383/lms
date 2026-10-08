import express, { NextFunction, Request, Response } from "express";
export const app = express();
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
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
import settingsRouter from "./routes/settings.route";
import reportRouter from "./routes/report.route";
import adminManagementRouter from "./routes/adminManagement.route";
import dashboardRouter from "./routes/dashboard.route";

// Behind a reverse proxy (Render, Railway, nginx...) every request looks like it
// comes from the proxy's IP unless Express is told how many proxies to trust.
// Set TRUST_PROXY to the NUMBER of proxy hops (usually 1). Leave it unset when
// running without a proxy. Don't use "true": it lets clients fake their IP.
if (process.env.TRUST_PROXY) {
  const v = process.env.TRUST_PROXY;
  app.set("trust proxy", /^\d+$/.test(v) ? Number(v) : v);
}

// Standard security headers (no sniffing, no framing, HSTS in production, ...)
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

// body parser
// Most requests are tiny JSON, so the default limit is small. Only the routes
// that carry a base64 image (course thumbnail, avatar, layout banners) get a
// bigger one - a 50 MB limit everywhere lets anyone make the server buffer
// 50 MB per request.
const smallJson = express.json({ limit: "1mb" });
const imageJson = express.json({ limit: "10mb" });
const IMAGE_BODY_ROUTES = [
  /^\/api\/v1\/create-course$/,
  /^\/api\/v1\/edit-course\/[^/]+$/,
  /^\/api\/v1\/update-user-avatar$/,
  /^\/api\/v1\/create-layout$/,
  /^\/api\/v1\/edit-layout$/,
];
app.use((req: Request, res: Response, next: NextFunction) =>
  IMAGE_BODY_ROUTES.some((r) => r.test(req.path))
    ? imageJson(req, res, next)
    : smallJson(req, res, next)
);

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
  reviewRouter,
  settingsRouter,
  reportRouter,
  adminManagementRouter,
  dashboardRouter
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