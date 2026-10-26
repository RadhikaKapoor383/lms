import { Page, expect } from "@playwright/test";
import { MongoClient } from "mongodb";

export const ADMIN = { email: process.env.E2E_ADMIN_EMAIL || "admin@ledger.dev", password: process.env.E2E_ADMIN_PASSWORD || "admin1234" };
export const SEED_PASSWORD = process.env.SEED_PASSWORD || "Learn@2026";
export const INSTRUCTOR = { email: "sana.ahmed@faculty.ledger.example", password: SEED_PASSWORD };
export const TAG = "zz-e2e";

export const login = async (page: Page, who: { email: string; password: string }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password", { exact: true }).fill(who.password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
};

// The tests read the database (the same DB_URL as the server) to find seeded
// people and courses, and to clean up what they created.
export const withDb = async <T>(fn: (db: ReturnType<MongoClient["db"]>) => Promise<T>): Promise<T> => {
  const url = process.env.DB_URL || "mongodb://localhost:27017/lms";
  const client = new MongoClient(url);
  await client.connect();
  try {
    return await fn(client.db());
  } finally {
    await client.close();
  }
};

// A seeded student actively enrolled in one of the seeded instructor's published courses.
export const findEnrolledStudent = () =>
  withDb(async (db) => {
    const instructor = await db.collection("users").findOne({ email: INSTRUCTOR.email });
    if (!instructor) throw new Error("Seeded data missing: run npm run seed:stats -- --yes --reset in server/");
    const course = await db.collection("courses").findOne({ instructor: instructor._id, status: "Published" });
    const enrollment = await db.collection("enrollments").findOne({ course: course!._id, status: "active" });
    const student = await db.collection("users").findOne({ _id: enrollment!.student });
    return { email: student!.email as string, password: SEED_PASSWORD, courseId: String(course!._id), courseName: course!.name as string };
  });
