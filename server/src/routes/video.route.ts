import express from "express";
import { authorizeCourseOwner, authorizeRoles, isAuthenticated, requirePermission } from "../middleware/auth";
import {
  attachUploadedVideo,
  getVideoLink,
  removeUploadedVideo,
  startVideoUpload,
  streamVideo,
} from "../controllers/video.controller";

const videoRouter = express.Router();

// :id = courseId. Uploading changes the course, so it needs the course.edit permission.
const owner = [isAuthenticated, requirePermission("course.edit"), authorizeRoles("admin", "instructor"), authorizeCourseOwner];

videoRouter.post("/courses/:id/lessons/:lessonId/video-upload", ...owner, startVideoUpload);
videoRouter.put("/courses/:id/lessons/:lessonId/video", ...owner, attachUploadedVideo);
videoRouter.delete("/courses/:id/lessons/:lessonId/video", ...owner, removeUploadedVideo);

// anyone who may see the course (checked in the controller)
videoRouter.get("/courses/:id/lessons/:lessonId/video-link", isAuthenticated, getVideoLink);
// the link itself carries the permission (short-lived, signed), so a <video> tag can use it
videoRouter.get("/videos/stream/:token", streamVideo);

export default videoRouter;
