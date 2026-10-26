import { test, expect } from "@playwright/test";
import { ADMIN, login } from "./helpers";

test("on a phone the admin menu folds behind a Menu button", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/admin");
  const menu = page.getByRole("button", { name: "Menu" });
  await expect(menu).toBeVisible();
  await expect(page.getByRole("link", { name: "Departments" })).toBeHidden();
  await menu.click();
  await page.getByRole("link", { name: "Departments" }).click();
  await expect(page).toHaveURL(/\/admin\/departments/);
  await expect(page.getByRole("button", { name: "Menu" })).toBeVisible(); // folded again after picking a page
  // nothing is wider than the screen
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
