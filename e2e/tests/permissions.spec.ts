import { test, expect } from "@playwright/test";
import { ADMIN, INSTRUCTOR, login } from "./helpers";

test.afterEach(async ({ request }) => {
  // put every permission back on, whatever happened in the test
  const api = process.env.E2E_API_URL || "http://localhost:8000/api/v1";
  const res = await request.post(`${api}/login`, { data: ADMIN });
  expect(res.ok()).toBeTruthy();
  await request.put(`${api}/admin/permissions`, { data: { instructor: {}, student: {} } });
});

test("switching off 'create courses' hides it from instructors", async ({ browser }) => {
  const adminPage = await (await browser.newContext()).newPage();
  await login(adminPage, ADMIN);
  await adminPage.goto("/admin/permissions");
  await adminPage.getByLabel("Instructors may create new courses").uncheck();
  await adminPage.getByRole("button", { name: "Save permissions" }).click();
  await expect(adminPage.getByRole("status")).toContainText("Saved");

  const instructorPage = await (await browser.newContext()).newPage();
  await login(instructorPage, INSTRUCTOR);
  await expect(instructorPage.getByRole("link", { name: "Students" })).toBeVisible();
  await expect(instructorPage.getByRole("link", { name: "Create course" })).toHaveCount(0);

  await adminPage.getByLabel("Instructors may create new courses").check();
  await adminPage.getByRole("button", { name: "Save permissions" }).click();
  await instructorPage.reload();
  await expect(instructorPage.getByRole("link", { name: "Create course" })).toBeVisible();
});
