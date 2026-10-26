import { describe, expect, it } from "vitest";
import {
  VIDEO_ROOT, buildVideoPublicId, checkUploadedVideo, createVideoToken, getVideoLimits, isVideoOfCourse,
  readVideoToken, safeRangeHeader, videoSecret,
} from "../src/services/videoUpload.service";

const COURSE = "64b7f0c2a1b2c3d4e5f60718";
const SECRET = "test-secret";
const now = 1_800_000_000;
const token = (over: Partial<Record<string, any>> = {}) =>
  createVideoToken({ u: "user1", r: "student", c: COURSE, l: "lesson1", exp: now + 60, ...over } as any, SECRET);

describe("upload ids", () => {
  it("are random and inside the course's folder", () => {
    const a = buildVideoPublicId(COURSE);
    expect(a).toMatch(new RegExp(`^${VIDEO_ROOT}/${COURSE}/[0-9a-f]{24}$`));
    expect(buildVideoPublicId(COURSE)).not.toBe(a);
    expect(isVideoOfCourse(a, COURSE)).toBe(true);
  });
  it("an id from another course, another folder or a path trick is refused", () => {
    expect(isVideoOfCourse(buildVideoPublicId("64b7f0c2a1b2c3d4e5f60799"), COURSE)).toBe(false);
    expect(isVideoOfCourse(`courses/${COURSE}/abc`, COURSE)).toBe(false);
    expect(isVideoOfCourse(`${VIDEO_ROOT}/${COURSE}/../other/aaaaaaaaaaaaaaaaaaaaaaaa`, COURSE)).toBe(false);
    expect(isVideoOfCourse({ $ne: 1 }, COURSE)).toBe(false);
  });
});

describe("checking the uploaded video", () => {
  const limits = { maxBytes: 100 * 1024 * 1024, maxSeconds: 3600 };
  const ok = { resource_type: "video", type: "authenticated", bytes: 5_000_000, duration: 312.4, format: "mp4" };
  it("accepts a private video within the limits", () => {
    expect(checkUploadedVideo(ok, limits)).toEqual({ ok: true, video: { duration: 312.4, bytes: 5_000_000, format: "mp4" } });
  });
  it("refuses non-videos, public uploads, broken files and over-limit videos", () => {
    expect(checkUploadedVideo({ ...ok, resource_type: "image" }, limits)).toMatchObject({ ok: false });
    expect(checkUploadedVideo({ ...ok, type: "upload" }, limits)).toMatchObject({ ok: false, error: "The upload was not stored privately" });
    expect(checkUploadedVideo({ ...ok, duration: 0 }, limits)).toMatchObject({ ok: false });
    expect(checkUploadedVideo({ ...ok, bytes: 200 * 1024 * 1024 }, limits)).toMatchObject({ ok: false, error: "The video is larger than 100 MB" });
    expect(checkUploadedVideo({ ...ok, duration: 3601 }, limits)).toMatchObject({ ok: false, error: "The video is longer than 60 minutes" });
    expect(checkUploadedVideo(null, limits)).toMatchObject({ ok: false });
  });
  it("limits come from the environment with defaults", () => {
    expect(getVideoLimits({} as any)).toEqual({ maxBytes: 500 * 1024 * 1024, maxSeconds: 240 * 60, linkSeconds: 120 * 60 });
    expect(getVideoLimits({ VIDEO_MAX_MB: "50", VIDEO_MAX_MINUTES: "x", VIDEO_LINK_MINUTES: "30" } as any)).toEqual({
      maxBytes: 50 * 1024 * 1024, maxSeconds: 240 * 60, linkSeconds: 30 * 60,
    });
  });
});

describe("watch links", () => {
  it("a fresh link reads back as signed", () => {
    expect(readVideoToken(token(), SECRET, now)).toEqual({ u: "user1", r: "student", c: COURSE, l: "lesson1", exp: now + 60 });
  });
  it("an expired link, another secret, or any change to it is refused", () => {
    expect(readVideoToken(token({ exp: now }), SECRET, now)).toBeNull();
    expect(readVideoToken(token(), "other-secret", now)).toBeNull();
    const [body, mac] = token().split(".");
    const forged = Buffer.from(JSON.stringify({ u: "user1", r: "admin", c: COURSE, l: "lesson1", exp: now + 60 })).toString("base64url");
    expect(readVideoToken(`${forged}.${mac}`, SECRET, now)).toBeNull();
    expect(readVideoToken(`${body}.${mac.slice(0, -2)}xx`, SECRET, now)).toBeNull();
    expect(readVideoToken("nonsense", SECRET, now)).toBeNull();
    expect(readVideoToken(undefined, SECRET, now)).toBeNull();
  });
  it("uses its own secret, or one derived from ACCESS_TOKEN", () => {
    expect(videoSecret({ VIDEO_TOKEN_SECRET: "v" } as any)).toBe("v");
    expect(videoSecret({ ACCESS_TOKEN: "a" } as any)).toBe("a:video-links");
    expect(() => videoSecret({} as any)).toThrow();
  });
});

describe("range header passed to storage", () => {
  it("only a single byte range", () => {
    expect(safeRangeHeader("bytes=0-")).toBe("bytes=0-");
    expect(safeRangeHeader("bytes=100-200")).toBe("bytes=100-200");
    expect(safeRangeHeader("bytes=-500")).toBe("bytes=-500");
    expect(safeRangeHeader("bytes=-")).toBeUndefined();
    expect(safeRangeHeader("bytes=0-1,5-9")).toBeUndefined();
    expect(safeRangeHeader("bytes=0-\r\nX-Evil: 1")).toBeUndefined();
    expect(safeRangeHeader(undefined)).toBeUndefined();
  });
});
