import { test, expect } from "@playwright/test";
import { ADMIN, TAG, login, withDb } from "./helpers";

test.afterAll(async () => {
  await withDb((db) => db.collection("departments").deleteMany({ name: { $regex: `^${TAG}` } }));
});

test("an admin adds, renames and deletes a department", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/departments");
  await expect(page.getByRole("heading", { name: "Departments" })).toBeVisible();

  await page.getByLabel("New department name").fill(`${TAG} Philosophy`);
  await page.getByRole("button", { name: "Add" }).click();
  const row = page.getByRole("listitem").filter({ hasText: `${TAG} Philosophy` });
  await expect(row).toContainText("0 courses · 0 instructors");

  await row.getByRole("button", { name: "Rename" }).click();
  await page.getByLabel(`New name for ${TAG} Philosophy`).fill(`${TAG} Ethics`);
  await page.getByRole("button", { name: "Save" }).click();
  const renamed = page.getByRole("listitem").filter({ hasText: `${TAG} Ethics` });
  await expect(renamed).toBeVisible();

  await renamed.getByRole("button", { name: "Delete" }).click();
  await renamed.getByRole("button", { name: "Confirm delete" }).click();
  await expect(renamed).toHaveCount(0);
});

test("a department in use can't be deleted", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin/departments");
  const used = page.getByRole("listitem").filter({ hasText: "Computer Science" });
  await expect(used.getByRole("button", { name: "Delete" })).toBeDisabled();
});
