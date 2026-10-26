// Role permissions against the REAL running server (npm run test:api; see
// departments.api.ts for setup). Everything switched off here is switched
// back on at the end.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import dotenv from "dotenv";
dotenv.config();

const API = process.env.API_URL || "http://localhost:8000/api/v1";
const ADMIN = { email: process.env.API_ADMIN_EMAIL || "admin@ledger.dev", password: process.env.API_ADMIN_PASSWORD || "admin1234" };
const INSTRUCTOR = { email: "sana.ahmed@faculty.ledger.example", password: process.env.SEED_PASSWORD || "Learn@2026" };

const login = async (who: { email: string; password: string }) => {
  const res = await fetch(`${API}/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(who) });
  if (res.status !== 200) throw new Error(`login ${who.email} -> ${res.status}`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
};
const call = async (method: string, p: string, cookie: string, body?: unknown) => {
  const res = await fetch(`${API}${p}`, { method, headers: { "Content-Type": "application/json", Cookie: cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

let admin = "";
let instructor = "";
let ownCourseId = "";

beforeAll(async () => {
  admin = await login(ADMIN);
  instructor = await login(INSTRUCTOR);
  const mine = await call("GET", "/instructor/courses", instructor);
  ownCourseId = mine.body.courses?.[0]?._id;
  if (!ownCourseId) throw new Error("The seeded instructor has no course. Run: npm run seed:stats -- --yes --reset");
});

afterAll(async () => {
  await call("PUT", "/admin/permissions", admin, { instructor: {}, student: {} }); // everything back on
});

describe("role permissions", () => {
  it("lists every permission, all on by default", async () => {
    await call("PUT", "/admin/permissions", admin, { instructor: {}, student: {} });
    const r = await call("GET", "/admin/permissions", admin);
    expect(r.status).toBe(200);
    expect(r.body.permissions.length).toBeGreaterThan(5);
    expect(r.body.permissions.every((p: any) => p.allowed)).toBe(true);
  });

  it("switching one off stops instructors at once, with a clear reason, and on again restores it", async () => {
    const off = await call("PUT", "/admin/permissions", admin, { instructor: { "quiz.manage": false } });
    expect(off.status).toBe(200);
    expect(off.body.permissions.find((p: any) => p.key === "quiz.manage").allowed).toBe(false);

    const quiz = { title: "zz-api-test quiz", questions: [] };
    const blocked = await call("POST", `/courses/${ownCourseId}/quizzes`, instructor, quiz);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe("PERMISSION_DENIED");
    expect(blocked.body.message).toMatch(/quizzes/);

    const mine = await call("GET", "/my-permissions", instructor);
    expect(mine.body.allowed).not.toContain("quiz.manage");
    expect(mine.body.allowed).toContain("assignment.manage");

    // an admin is never stopped (this fails validation, not permission)
    const asAdmin = await call("POST", `/courses/${ownCourseId}/quizzes`, admin, quiz);
    expect(asAdmin.body.code).not.toBe("PERMISSION_DENIED");

    await call("PUT", "/admin/permissions", admin, { instructor: {} });
    const again = await call("POST", `/courses/${ownCourseId}/quizzes`, instructor, quiz);
    expect(again.body.code).not.toBe("PERMISSION_DENIED");
  });

  it("refuses bad input and non-admins", async () => {
    expect((await call("PUT", "/admin/permissions", admin, { instructor: { "make.coffee": false } })).status).toBe(400);
    expect((await call("PUT", "/admin/permissions", instructor, { instructor: {} })).status).toBe(403);
  });
});
