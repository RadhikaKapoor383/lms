// Real-time notifications against the REAL running server (npm run test:api).
// A seeded student keeps a socket open; their instructor posts a course
// announcement; the student's socket must receive it.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { io, Socket } from "socket.io-client";
import dotenv from "dotenv";
dotenv.config();

import EnrollmentModel from "../../src/models/enrollment.model";
import CourseModel from "../../src/models/course.model";
import userModel from "../../src/models/user.model";
import AnnouncementModel from "../../src/models/announcement.model";

const API = process.env.API_URL || "http://localhost:8000/api/v1";
const ORIGIN = new URL(API).origin;
const PASSWORD = process.env.SEED_PASSWORD || "Learn@2026";
const INSTRUCTOR = "sana.ahmed@faculty.ledger.example";

const login = async (email: string) => {
  const res = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: PASSWORD }) });
  if (res.status !== 200) throw new Error(`login ${email} -> ${res.status}`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
};
const connect = (cookie?: string) =>
  io(ORIGIN, { transports: ["websocket"], extraHeaders: cookie ? { Cookie: cookie } : {}, reconnection: false, timeout: 5000 });

let socket: Socket | null = null;
let courseId = "";
let studentCookie = "";
let instructorCookie = "";

beforeAll(async () => {
  await mongoose.connect(process.env.DB_URL as string);
  const instructor: any = await userModel.findOne({ email: INSTRUCTOR }).lean();
  const course: any = await CourseModel.findOne({ instructor: instructor._id, status: "Published" }).lean();
  const enrollment: any = await EnrollmentModel.findOne({ course: course._id, status: "active" }).lean();
  const student: any = await userModel.findById(enrollment.student).lean();
  courseId = String(course._id);
  studentCookie = await login(student.email);
  instructorCookie = await login(INSTRUCTOR);
}, 30000);

afterAll(async () => {
  socket?.disconnect();
  await AnnouncementModel.deleteMany({ title: /^zz-api-test/ });
  await mongoose.disconnect();
});

describe("real-time notifications", () => {
  it("a socket without a login is refused", async () => {
    const s = connect();
    const err = await new Promise<Error>((resolve) => s.on("connect_error", resolve));
    expect(err.message).toBe("AUTH_REQUIRED");
    s.disconnect();
  });

  it("a signed-in student receives a new notification at once", async () => {
    socket = connect(studentCookie);
    await new Promise<void>((resolve, reject) => {
      socket!.on("connect", () => resolve());
      socket!.on("connect_error", reject);
    });
    const received = new Promise<any>((resolve) => socket!.on("notification:new", resolve));

    const post = await fetch(`${API}/courses/${courseId}/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: instructorCookie },
      body: JSON.stringify({ title: "zz-api-test live", message: "Hello in real time" }),
    });
    expect(post.status).toBe(201);

    const event = await Promise.race([received, new Promise((_, rej) => setTimeout(() => rej(new Error("no push within 5 s")), 5000))]);
    expect(event).toMatchObject({ title: expect.any(String) });
    expect(JSON.stringify(event)).not.toMatch(/userId|email/);
  });
});
