import { Request, Response, NextFunction } from "express";
import { Readable } from "stream";
import cloudinary from "cloudinary";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import LessonModel from "../models/lesson.model";
import { redis } from "../utils/redis";
import { logActivity } from "../utils/auditLog";
import { hitRateLimit } from "../utils/rateLimit";
import { hasCourseContentAccess, isObjectId } from "../services/enrollment.service";
import {
  CHUNK_BYTES,
  UPLOAD_WINDOW_SECONDS,
  buildVideoPublicId,
  checkUploadedVideo,
  createVideoToken,
  getVideoLimits,
  isVideoOfCourse,
  readVideoToken,
  safeRangeHeader,
  videoSecret,
} from "../services/videoUpload.service";
import { VIDEO_STORAGE, removeVideoFromStorage } from "../services/videoStorage.service";

// Routes keyed by /courses/:id/lessons/:lessonId - ownership (the course's
// instructor, or an admin) is checked by authorizeCourseOwner on the route.

const pendingKey = (publicId: string) => `vup:${publicId}`;

const lessonOfCourse = async (courseId: string, lessonId: string) => {
  if (!isObjectId(courseId) || !isObjectId(lessonId)) return null;
  return LessonModel.findOne({ _id: lessonId, course: courseId });
};

// ------------------- 1. Start an upload: a one-time signature for Cloudinary -------------------

export const startVideoUpload = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: courseId, lessonId } = req.params;
    const lesson = await lessonOfCourse(courseId, lessonId);
    if (!lesson) return next(new ErrorHandler("Lesson not found in this course", 404));

    const limit = await hitRateLimit(`video-upload:${String(req.user?._id)}`, 20, 60 * 60);
    if (!limit.allowed) return next(new ErrorHandler("Too many uploads started. Try again later.", 429));

    const { CLOUD_NAME, CLOUD_API_KEY, CLOUD_SECRET_KEY } = process.env;
    if (!CLOUD_NAME || !CLOUD_API_KEY || !CLOUD_SECRET_KEY) {
      return next(new ErrorHandler("Video uploads are not set up on this server (Cloudinary keys missing)", 503));
    }

    const publicId = buildVideoPublicId(courseId);
    const timestamp = Math.floor(Date.now() / 1000);
    // Everything signed here is fixed: the browser can't change where the file
    // goes, or make it public.
    const params = { public_id: publicId, timestamp, type: "authenticated" };
    const signature = cloudinary.v2.utils.api_sign_request(params, CLOUD_SECRET_KEY);

    await redis.set(
      pendingKey(publicId),
      JSON.stringify({ user: String(req.user?._id), course: courseId, lesson: lessonId }),
      "EX",
      UPLOAD_WINDOW_SECONDS
    );

    const { maxBytes } = getVideoLimits();
    res.status(200).json({
      success: true,
      upload: {
        url: `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
        apiKey: CLOUD_API_KEY,
        publicId,
        timestamp,
        type: "authenticated",
        signature,
        maxBytes,
        chunkBytes: CHUNK_BYTES,
      },
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// ------------------- 2. Finish: check the upload and attach it to the lesson -------------------

export const attachUploadedVideo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: courseId, lessonId } = req.params;
    const publicId = req.body?.publicId;
    if (!isVideoOfCourse(publicId, courseId)) return next(new ErrorHandler("That upload doesn't belong to this course", 400));

    const lesson = await lessonOfCourse(courseId, lessonId);
    if (!lesson) return next(new ErrorHandler("Lesson not found in this course", 404));

    // only an upload we started, for this lesson, by this person
    const pending = await redis.get(pendingKey(publicId));
    const p = pending ? JSON.parse(pending) : null;
    if (!p || p.lesson !== lessonId || p.course !== courseId || p.user !== String(req.user?._id)) {
      return next(new ErrorHandler("That upload has expired or wasn't started here. Upload the video again.", 400));
    }

    let resource: any;
    try {
      resource = await cloudinary.v2.api.resource(publicId, { ...VIDEO_STORAGE });
    } catch {
      return next(new ErrorHandler("The upload hasn't reached storage. Upload the video again.", 400));
    }
    const check = checkUploadedVideo(resource, getVideoLimits());
    if (!check.ok) {
      await removeVideoFromStorage(publicId);
      await redis.del(pendingKey(publicId));
      return next(new ErrorHandler(check.error, 400));
    }

    const previous = lesson.video?.publicId;
    lesson.video = { publicId, ...check.video, uploadedAt: new Date() };
    // the length shown and used for the course's duration follows the real video
    lesson.videoLength = Math.max(1, Math.ceil(check.video.duration / 60));
    await lesson.save();
    await redis.del(pendingKey(publicId), courseId, "allCourses");
    if (previous && previous !== publicId) await removeVideoFromStorage(previous);

    logActivity(req, "lesson.video_upload", `Uploaded a video to lesson "${lesson.title}"`, { courseId, lessonId });
    res.status(200).json({
      success: true,
      video: { duration: check.video.duration, bytes: check.video.bytes },
      videoLength: lesson.videoLength,
    });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// ------------------- Remove a lesson's uploaded video -------------------

export const removeUploadedVideo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: courseId, lessonId } = req.params;
    const lesson = await lessonOfCourse(courseId, lessonId);
    if (!lesson) return next(new ErrorHandler("Lesson not found in this course", 404));
    const publicId = lesson.video?.publicId;
    if (!publicId) return next(new ErrorHandler("This lesson has no uploaded video", 404));

    await LessonModel.updateOne({ _id: lessonId }, { $unset: { video: 1 } });
    await removeVideoFromStorage(publicId);
    await redis.del(courseId, "allCourses");

    logActivity(req, "lesson.video_remove", `Removed the video of lesson "${lesson.title}"`, { courseId, lessonId });
    res.status(200).json({ success: true, message: "Video removed" });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// ------------------- A watch link (anyone who may see the course) -------------------

export const getVideoLink = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id: courseId, lessonId } = req.params;
    const userId = String(req.user?._id);
    const role = String(req.user?.role);
    if (!isObjectId(courseId) || !(await hasCourseContentAccess(role, userId, courseId))) {
      return next(new ErrorHandler("You are not eligible to access this course", 404));
    }
    const lesson = await LessonModel.findOne({ _id: lessonId, course: courseId }).select("video").lean();
    if (!lesson?.video) return next(new ErrorHandler("This lesson has no uploaded video", 404));

    const { linkSeconds } = getVideoLimits();
    const exp = Math.floor(Date.now() / 1000) + linkSeconds;
    const token = createVideoToken({ u: userId, r: role, c: courseId, l: lessonId, exp }, videoSecret());
    // an absolute address of this server (respects TRUST_PROXY for https / host)
    const url = `${req.protocol}://${req.get("host")}${req.baseUrl}/videos/stream/${token}`;
    res.status(200).json({ success: true, url, expiresAt: new Date(exp * 1000).toISOString() });
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
});

// ------------------- Streaming (the link above; no cookie needed) -------------------
// Range requests are passed on, so the player can seek without downloading
// the whole file. Access is checked again on every request, so a student who
// is removed from the course stops being able to watch even with a fresh link.

export const streamVideo = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
  try {
    const t = readVideoToken(req.params.token, videoSecret());
    if (!t) return next(new ErrorHandler("This video link has expired. Reload the page.", 401, "VIDEO_LINK_EXPIRED"));
    if (!(await hasCourseContentAccess(t.r, t.u, t.c))) {
      return next(new ErrorHandler("You are not eligible to access this course", 404));
    }
    const lesson = await LessonModel.findOne({ _id: t.l, course: t.c }).select("video").lean();
    if (!lesson?.video) return next(new ErrorHandler("This lesson has no uploaded video", 404));

    const signedUrl = cloudinary.v2.url(lesson.video.publicId, {
      ...VIDEO_STORAGE,
      format: lesson.video.format,
      sign_url: true,
      secure: true,
    });
    const range = safeRangeHeader(req.headers.range);
    const upstream = await fetch(signedUrl, { headers: range ? { Range: range } : {} });
    if (!(upstream.status === 200 || upstream.status === 206) || !upstream.body) {
      if (upstream.status === 416) return next(new ErrorHandler("Requested range not satisfiable", 416));
      return next(new ErrorHandler("The video is not available right now", 502));
    }

    res.status(upstream.status);
    for (const h of ["content-type", "content-length", "content-range", "accept-ranges"]) {
      const v = upstream.headers.get(h);
      if (v) res.setHeader(h, v);
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", "inline");

    const body = Readable.fromWeb(upstream.body as any);
    body.on("error", () => res.destroy());
    req.on("close", () => body.destroy()); // the player moved on (seek / pause): stop fetching
    body.pipe(res);
  } catch (error: any) {
    return next(new ErrorHandler(error.message, 500));
  }
});
