import crypto from "crypto";

// Uploaded lesson videos, without Express or Cloudinary, so the rules can be
// tested on their own.
//
// Upload: the browser sends the file STRAIGHT to Cloudinary (videos are far too
// big to pass through this server), using a one-time signature from us that
// fixes where it goes (a private "authenticated" asset under this course's
// folder). The browser then tells us the upload finished; we look the asset up
// at Cloudinary ourselves and only then attach it to the lesson.
//
// Watching: there is no public link to the file. A student who may see the
// course gets a short-lived link to OUR server, signed for them and that one
// lesson; the server checks it, checks they still have access, and streams the
// video from Cloudinary (seeking works). The storage address never reaches the
// browser, and a shared link stops working when it expires.

export const VIDEO_ROOT = "lms/videos";
export const DEFAULT_MAX_VIDEO_MB = 500;
export const DEFAULT_MAX_VIDEO_MINUTES = 240;
export const DEFAULT_LINK_MINUTES = 120;
export const UPLOAD_WINDOW_SECONDS = 3 * 60 * 60; // a started upload must be attached within 3 hours
export const CHUNK_BYTES = 20 * 1024 * 1024; // sent to Cloudinary in 20 MB pieces

const positive = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const getVideoLimits = (env: NodeJS.ProcessEnv = process.env) => ({
  maxBytes: Math.round(positive(env.VIDEO_MAX_MB, DEFAULT_MAX_VIDEO_MB) * 1024 * 1024),
  maxSeconds: Math.round(positive(env.VIDEO_MAX_MINUTES, DEFAULT_MAX_VIDEO_MINUTES) * 60),
  linkSeconds: Math.round(positive(env.VIDEO_LINK_MINUTES, DEFAULT_LINK_MINUTES) * 60),
});

// lms/videos/<courseId>/<random> - the folder ties an upload to its course.
export const buildVideoPublicId = (courseId: string) =>
  `${VIDEO_ROOT}/${courseId}/${crypto.randomBytes(12).toString("hex")}`;

export const isVideoOfCourse = (publicId: unknown, courseId: string): publicId is string =>
  typeof publicId === "string" && new RegExp(`^${VIDEO_ROOT}/${courseId}/[0-9a-f]{24}$`).test(publicId);

// What Cloudinary tells us about the uploaded asset, checked before it is attached.
export const checkUploadedVideo = (
  resource: any,
  limits: { maxBytes: number; maxSeconds: number }
): { ok: true; video: { duration: number; bytes: number; format: string } } | { ok: false; error: string } => {
  if (!resource || resource.resource_type !== "video") return { ok: false, error: "The upload is not a video" };
  if (resource.type !== "authenticated") return { ok: false, error: "The upload was not stored privately" };
  const bytes = Number(resource.bytes);
  const duration = Number(resource.duration);
  if (!(bytes > 0) || !(duration > 0)) return { ok: false, error: "The video could not be read (is the file complete?)" };
  if (bytes > limits.maxBytes) return { ok: false, error: `The video is larger than ${Math.round(limits.maxBytes / 1024 / 1024)} MB` };
  if (duration > limits.maxSeconds) return { ok: false, error: `The video is longer than ${Math.round(limits.maxSeconds / 60)} minutes` };
  return { ok: true, video: { duration, bytes, format: String(resource.format || "mp4") } };
};

// ------------------- Watch links -------------------
// token = base64url(JSON payload) + "." + base64url(HMAC-SHA256)

export interface IVideoToken {
  u: string; // user id
  r: string; // role
  c: string; // course id
  l: string; // lesson id
  exp: number; // seconds
}

const b64 = (b: Buffer) => b.toString("base64url");
const sign = (body: string, secret: string) => b64(crypto.createHmac("sha256", secret).update(body).digest());

export const videoSecret = (env: NodeJS.ProcessEnv = process.env) => {
  const s = env.VIDEO_TOKEN_SECRET || (env.ACCESS_TOKEN ? `${env.ACCESS_TOKEN}:video-links` : "");
  if (!s) throw new Error("VIDEO_TOKEN_SECRET (or ACCESS_TOKEN) must be set");
  return s;
};

export const createVideoToken = (payload: IVideoToken, secret: string): string => {
  const body = b64(Buffer.from(JSON.stringify(payload)));
  return `${body}.${sign(body, secret)}`;
};

export const readVideoToken = (token: unknown, secret: string, now = Math.floor(Date.now() / 1000)): IVideoToken | null => {
  if (typeof token !== "string" || token.length > 1000) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = sign(body, secret);
  // constant-time compare (lengths differ = forged)
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof p?.u !== "string" || typeof p?.c !== "string" || typeof p?.l !== "string" || typeof p?.r !== "string") return null;
    if (typeof p.exp !== "number" || p.exp <= now) return null;
    return p as IVideoToken;
  } catch {
    return null;
  }
};

// Only a single "bytes=a-b" / "bytes=a-" range is passed on to storage.
export const safeRangeHeader = (value: unknown): string | undefined =>
  typeof value === "string" && /^bytes=\d{0,15}-\d{0,15}$/.test(value) && value !== "bytes=-" ? value : undefined;
