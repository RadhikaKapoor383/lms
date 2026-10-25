// End-to-end checks of departments and the duration filter against a REAL
// running server and its MongoDB. Every answer from the API is compared with
// what the database itself says.
//
// Needs: the server running (npm run dev), seeded data (npm run seed, then
// npm run seed:stats -- --yes --reset), and the same DB_URL as the server.
//
//   npm run test:api                   (API_URL defaults to http://localhost:8000/api/v1)
//
// It creates a few records of its own (names starting with "zz-api-test") and
// removes them at the end. Seeded data is only read, except that one seeded
// instructor's department is changed and then put back.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import CourseModel from "../../src/models/course.model";
import LessonModel from "../../src/models/lesson.model";
import userModel from "../../src/models/user.model";
import DepartmentModel from "../../src/models/department.model";
import { DURATION_OPTIONS, effectiveDurationMinutes, matchesDuration } from "../../src/services/courseSearch.service";

const API = process.env.API_URL || "http://localhost:8000/api/v1";
const ADMIN = { email: process.env.API_ADMIN_EMAIL || "admin@ledger.dev", password: process.env.API_ADMIN_PASSWORD || "admin1234" };
const INSTRUCTOR = { email: "sana.ahmed@faculty.ledger.example", password: process.env.SEED_PASSWORD || "Learn@2026" };
const TAG = "zz-api-test";

type Session = { cookie: string };
const login = async (who: { email: string; password: string }): Promise<Session> => {
  const res = await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(who),
  });
  if (res.status !== 200) throw new Error(`login ${who.email} -> ${res.status} ${await res.text()}`);
  const cookies = res.headers.getSetCookie().map((c) => c.split(";")[0]);
  return { cookie: cookies.join("; ") };
};
const call = async (method: string, path: string, s?: Session, body?: unknown) => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(s ? { Cookie: s.cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, body: json };
};
const ids = (rows: any[]) => rows.map((r) => String(r._id)).sort();

// every page of a search, so totals and membership can be compared exactly
const searchAll = async (query: Record<string, string>) => {
  const all: any[] = [];
  for (let page = 1; ; page++) {
    const r = await call("GET", `/courses/search?${new URLSearchParams({ ...query, page: String(page), limit: "50" })}`);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    all.push(...r.body.courses);
    if (page >= r.body.totalPages) return { courses: all, total: r.body.total };
  }
};

let admin: Session;
let instructor: Session;
let instructorDoc: any;
let originalInstructorDepartment: any;
const created = { departments: [] as string[], courses: [] as string[] };

beforeAll(async () => {
  if (!process.env.DB_URL) throw new Error("DB_URL is not set (server/.env)");
  await mongoose.connect(process.env.DB_URL);
  const health = await fetch(`${API.replace(/\/api\/v1$/, "")}/test`).catch(() => null);
  if (!health) throw new Error(`The server at ${API} is not reachable. Start it with npm run dev.`);
  admin = await login(ADMIN);
  instructor = await login(INSTRUCTOR);
  instructorDoc = await userModel.findOne({ email: INSTRUCTOR.email }).lean();
  if (!instructorDoc) throw new Error("Seeded instructor not found. Run: npm run seed:stats -- --yes --reset");
  originalInstructorDepartment = instructorDoc.department || null;
}, 30000);

afterAll(async () => {
  if (instructorDoc) {
    await userModel.updateOne(
      { _id: instructorDoc._id },
      originalInstructorDepartment ? { $set: { department: originalInstructorDepartment } } : { $unset: { department: 1 } }
    );
  }
  for (const id of created.courses) await call("DELETE", `/delete-course/${id}`, admin);
  await CourseModel.deleteMany({ name: { $regex: `^${TAG}` } });
  await DepartmentModel.deleteMany({ name: { $regex: `^${TAG}` } });
  await mongoose.disconnect();
}, 30000);

describe("seeded data is there", () => {
  it("has departments, and published courses and instructors in them", async () => {
    expect(await DepartmentModel.countDocuments()).toBeGreaterThanOrEqual(4);
    expect(await CourseModel.countDocuments({ status: "Published", department: { $ne: null } })).toBeGreaterThan(5);
    expect(await userModel.countDocuments({ role: "instructor", department: { $ne: null } })).toBeGreaterThan(3);
  });
});

describe("filter options", () => {
  it("list exactly the departments that have a published course, with duration labels", async () => {
    const r = await call("GET", "/courses/filters");
    expect(r.status).toBe(200);
    const expected = (await CourseModel.distinct("department", { status: "Published", department: { $ne: null } })).map(String).sort();
    expect(ids(r.body.departments)).toEqual(expected);
    expect(r.body.durations).toEqual(DURATION_OPTIONS);
  });
});

describe("department filter", () => {
  it("returns exactly the published courses of each department", async () => {
    const departments = await DepartmentModel.find().lean();
    for (const d of departments) {
      const { courses, total } = await searchAll({ department: String(d._id) });
      const expected = await CourseModel.find({ status: "Published", department: d._id }).select("_id").lean();
      expect(ids(courses), d.name).toEqual(ids(expected));
      expect(total, d.name).toBe(expected.length);
      for (const c of courses) expect(c.department?.name, c.name).toBe(d.name);
    }
  });

  it("rejects a malformed id and an operator injection", async () => {
    expect((await call("GET", "/courses/search?department=abc")).status).toBe(400);
    expect((await call("GET", "/courses/search?department[$ne]=x")).status).toBe(400);
  });

  it("combines with other filters", async () => {
    const d = await DepartmentModel.findOne({ name: "Computer Science" }).lean();
    const { courses } = await searchAll({ department: String(d!._id), level: "Beginner" });
    const expected = await CourseModel.find({ status: "Published", department: d!._id, level: "Beginner" }).select("_id").lean();
    expect(ids(courses)).toEqual(ids(expected));
  });
});

describe("duration filter", () => {
  it("uses the instructor's hours (lesson minutes only when hours are empty), bucket by bucket", async () => {
    const published = await CourseModel.find({ status: "Published" }).select("_id durationHours").lean();
    const lessonRows = await LessonModel.aggregate([
      { $match: { course: { $in: published.map((c) => c._id) } } },
      { $group: { _id: "$course", minutes: { $sum: { $ifNull: ["$videoLength", 0] } } } },
    ]);
    const lessonMinutes = new Map(lessonRows.map((r: any) => [String(r._id), r.minutes]));
    const minutesOf = new Map(
      published.map((c: any) => [String(c._id), effectiveDurationMinutes(c.durationHours, lessonMinutes.get(String(c._id)) || 0)])
    );

    let seenNonEmpty = 0;
    for (const { value } of DURATION_OPTIONS) {
      const { courses } = await searchAll({ duration: value });
      const expected = [...minutesOf].filter(([, m]) => matchesDuration(m, value)).map(([id]) => id).sort();
      expect(ids(courses), value).toEqual(expected);
      for (const c of courses) expect(c.durationMinutes, c.name).toBe(minutesOf.get(String(c._id)));
      if (expected.length) seenNonEmpty++;
    }
    expect(seenNonEmpty).toBeGreaterThanOrEqual(2); // seeded data spreads over the buckets
  });

  it("a course with hours set is bucketed by those hours, not by its (much shorter) lessons", async () => {
    const c: any = await CourseModel.findOne({ status: "Published", durationHours: { $gt: 10 } }).lean();
    expect(c).toBeTruthy();
    const { courses } = await searchAll({ duration: "long" });
    expect(ids(courses)).toContain(String(c._id));
    const hit = courses.find((x: any) => String(x._id) === String(c._id));
    expect(hit.durationHours).toBe(c.durationHours);
    expect(hit.durationMinutes).toBe(Math.round(c.durationHours * 60));
  });

  it("the course page carries the same length and the department", async () => {
    const c: any = await CourseModel.findOne({ status: "Published", department: { $ne: null } }).populate("department", "name").lean();
    const r = await call("GET", `/get-course/${c._id}`);
    expect(r.status).toBe(200);
    expect(r.body.course.department.name).toBe(c.department.name);
    expect(r.body.course.durationMinutes).toBeGreaterThan(0);
  });
});

describe("department management (admin)", () => {
  it("creates, refuses duplicates in any case, renames, and deletes an unused department", async () => {
    const make = await call("POST", "/admin/departments", admin, { name: `  ${TAG} Philosophy ` });
    expect(make.status).toBe(201);
    expect(make.body.department.name).toBe(`${TAG} Philosophy`);
    const id = String(make.body.department._id);
    created.departments.push(id);
    expect(await DepartmentModel.exists({ _id: id })).toBeTruthy();

    expect((await call("POST", "/admin/departments", admin, { name: `${TAG} PHILOSOPHY` })).status).toBe(409);
    expect((await call("POST", "/admin/departments", admin, { name: "   " })).status).toBe(400);

    const rename = await call("PUT", `/admin/departments/${id}`, admin, { name: `${TAG} Ethics` });
    expect(rename.status).toBe(200);
    expect((await DepartmentModel.findById(id).lean())!.name).toBe(`${TAG} Ethics`);

    const list = await call("GET", "/departments", admin);
    const row = list.body.departments.find((d: any) => d._id === id);
    expect(row).toMatchObject({ name: `${TAG} Ethics`, courseCount: 0, instructorCount: 0 });

    expect((await call("DELETE", `/admin/departments/${id}`, admin)).status).toBe(200);
    expect(await DepartmentModel.exists({ _id: id })).toBeNull();
  });

  it("is admin only", async () => {
    expect((await call("POST", "/admin/departments", instructor, { name: `${TAG} Nope` })).status).toBe(403);
    expect((await call("POST", "/admin/departments", undefined, { name: `${TAG} Nope` })).status).toBe(401);
  });

  it("refuses to delete a department that courses or instructors belong to", async () => {
    const used: any = await DepartmentModel.findOne({ name: "Computer Science" }).lean();
    const r = await call("DELETE", `/admin/departments/${used._id}`, admin);
    expect(r.status).toBe(409);
    expect(r.body.message).toMatch(/course/);
    expect(await DepartmentModel.exists({ _id: used._id })).toBeTruthy();
  });

  it("a rename shows up on cached course pages straight away", async () => {
    const make = await call("POST", "/admin/departments", admin, { name: `${TAG} Cache` });
    const deptId = String(make.body.department._id);
    created.departments.push(deptId);
    const course: any = await CourseModel.findOne({ status: "Published", department: { $ne: null } }).lean();
    const before = course.department;
    await CourseModel.updateOne({ _id: course._id }, { department: deptId });
    try {
      await call("PUT", `/admin/departments/${deptId}`, admin, { name: `${TAG} Cache A` }); // clears the cache
      expect((await call("GET", `/get-course/${course._id}`)).body.course.department.name).toBe(`${TAG} Cache A`); // now cached
      await call("PUT", `/admin/departments/${deptId}`, admin, { name: `${TAG} Cache B` });
      expect((await call("GET", `/get-course/${course._id}`)).body.course.department.name).toBe(`${TAG} Cache B`);
    } finally {
      await CourseModel.updateOne({ _id: course._id }, { department: before });
      await call("PUT", `/admin/departments/${deptId}`, admin, { name: `${TAG} Cache` }); // clear the cache again
    }
  });
});

describe("instructors and their department", () => {
  it("an admin can put an instructor in a department and take them out", async () => {
    const target: any = await DepartmentModel.findOne({ name: "Business School" }).lean();
    const set = await call("PUT", `/admin/instructors/${instructorDoc._id}/department`, admin, { departmentId: String(target._id) });
    expect(set.status).toBe(200);
    expect(String((await userModel.findById(instructorDoc._id).lean())!.department)).toBe(String(target._id));

    const list = await call("GET", "/admin/instructors", admin);
    expect(list.body.instructors.find((i: any) => i._id === String(instructorDoc._id)).department.name).toBe("Business School");

    const clear = await call("PUT", `/admin/instructors/${instructorDoc._id}/department`, admin, { departmentId: null });
    expect(clear.status).toBe(200);
    expect((await userModel.findById(instructorDoc._id).lean())!.department).toBeUndefined();

    expect((await call("PUT", `/admin/instructors/${instructorDoc._id}/department`, admin, { departmentId: "nope" })).status).toBe(400);
    expect((await call("PUT", `/admin/instructors/${instructorDoc._id}/department`, instructor, { departmentId: null })).status).toBe(403);
  });

  it("an instructor's new course without a department gets theirs; a chosen one is kept", async () => {
    const own: any = await DepartmentModel.findOne({ name: "Data & Analytics" }).lean();
    const other: any = await DepartmentModel.findOne({ name: "Arts & Design" }).lean();
    const category: any = await mongoose.connection.collection("categories").findOne({});
    await call("PUT", `/admin/instructors/${instructorDoc._id}/department`, admin, { departmentId: String(own._id) });

    const course = (name: string, department: string) => ({
      name, department, description: "Created by the API test.", price: 0, level: "Beginner",
      category: String(category._id), demoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U", courseData: [],
    });

    const a = await call("POST", "/create-course", instructor, course(`${TAG} default dept`, ""));
    expect(a.status, JSON.stringify(a.body)).toBe(201);
    created.courses.push(String(a.body.course._id));
    expect(String((await CourseModel.findById(a.body.course._id).lean())!.department)).toBe(String(own._id));

    const b = await call("POST", "/create-course", instructor, course(`${TAG} chosen dept`, String(other._id)));
    expect(b.status).toBe(201);
    created.courses.push(String(b.body.course._id));
    expect(String((await CourseModel.findById(b.body.course._id).lean())!.department)).toBe(String(other._id));

    // editing to "No department" removes it
    const edit = await call("PUT", `/edit-course/${b.body.course._id}`, instructor, { department: "" });
    expect(edit.status).toBe(201);
    expect((await CourseModel.findById(b.body.course._id).lean())!.department).toBeUndefined();

    // a made-up department is refused
    const bad = await call("PUT", `/edit-course/${b.body.course._id}`, instructor, { department: "64b7f0c2a1b2c3d4e5f60718" });
    expect(bad.status).toBe(400);
  });

  it("an admin's new course with no department stays without one", async () => {
    const category: any = await mongoose.connection.collection("categories").findOne({});
    const r = await call("POST", "/create-course", admin, {
      name: `${TAG} admin no dept`, department: "", description: "x", price: 0, level: "Beginner",
      category: String(category._id), demoUrl: "https://www.youtube.com/embed/ysz5S6PUM-U", courseData: [],
    });
    expect(r.status).toBe(201);
    created.courses.push(String(r.body.course._id));
    expect((await CourseModel.findById(r.body.course._id).lean())!.department).toBeUndefined();
  });
});
