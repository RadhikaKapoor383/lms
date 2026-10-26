import { test, expect } from "@playwright/test";

test("the catalogue filters by department and length, and cards show both", async ({ page }) => {
  await page.goto("/courses");
  const department = page.getByLabel("Department");
  await expect(department).toBeVisible();
  await department.selectOption({ label: "Data & Analytics" });
  await expect(page.getByText(/course(s)? found/)).toBeVisible();
  const cards = page.locator('a[href^="/course/"]');
  await expect(cards.first()).toContainText("Data & Analytics");

  const length = page.getByLabel("Duration");
  await expect(length.locator("option")).toHaveText(["Any length", "Up to 2 hours", "2 to 10 hours", "Over 10 hours"]);
  await department.selectOption({ label: "All departments" });
  await length.selectOption({ label: "Over 10 hours" });
  await expect(cards.first()).toBeVisible();
  // every card in "Over 10 hours" shows more than 10 hours
  for (const text of await cards.allInnerTexts()) {
    const hours = Number(text.match(/(\d+)h/)?.[1] || 0);
    expect(hours).toBeGreaterThan(10);
  }

  await cards.first().click();
  await expect(page).toHaveURL(/\/course\//);
  await expect(page.getByText(/^Department: /)).toBeVisible();
});
