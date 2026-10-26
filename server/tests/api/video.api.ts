// Protected video links against the REAL running server (npm run test:api).
// Without Cloudinary keys only the refusals can be checked; with them, set
// API_VIDEO_COURSE and API_VIDEO_LESSON to a lesson that has an uploaded video.

import { describe, expect, it } from "vitest";
import dotenv from "dotenv";
dotenv.config();

const API = process.env.API_URL || "http://localhost:8000/api/v1";
const ADMIN = { email: process.env.API_ADMIN_EMAIL || "admin@ledger.dev", password: process.env.API_ADMIN_PASSWORD || "admin1234" };
const COURSE = process.env.API_VIDEO_COURSE;
const LESSON = process.env.API_VIDEO_LESSON;

const login = async () => {
  const res = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ADMIN) });
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
};

describe("protected video links", () => {
  it("a made-up or tampered link is refused", async () => {
    expect((await fetch(`${API}/videos/stream/abc.def`)).status).toBe(401);
    expect((await fetch(`${API}/videos/stream/${"x".repeat(2000)}`)).status).toBe(401);
  });

  it.skipIf(!COURSE || !LESSON)("a real link streams the video and supports seeking; changed by one letter it doesn't", async () => {
    const cookie = await login();
    const r = await fetch(`${API}/courses/${COURSE}/lessons/${LESSON}/video-link`, { headers: { Cookie: cookie } });
    expect(r.status).toBe(200);
    const { url, expiresAt } = await r.json();
    expect(new Date(expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(url).not.toMatch(/cloudinary/);

    const part = await fetch(url, { headers: { Range: "bytes=0-1023" } });
    expect(part.status).toBe(206);
    expect(part.headers.get("content-type")).toMatch(/^video\//);
    expect((await part.arrayBuffer()).byteLength).toBe(1024);

    const broken = url.slice(0, -1) + (url.endsWith("A") ? "B" : "A");
    expect((await fetch(broken)).status).toBe(401);
  });
});
