import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mocks";

// Screenshot tests for the main public pages, in light and dark mode, on a
// desktop and a phone. They catch layout / styling changes nobody meant to make.
//
//   npm run test:visual          compare with the saved screenshots
//   npm run test:visual:update   save new screenshots (after an intended change)
//
// Screenshots depend on fonts and the operating system, so they are created by
// the "Update visual baselines" GitHub workflow (Linux), not on your own laptop.

const SPLASH_SEEN_KEY = "ledger:splash-seen";

const pages = [
  { name: "home", path: "/", ready: (p: Page) => expect(p.getByText("JavaScript from Scratch")).toBeVisible() },
  { name: "about", path: "/about", ready: (p: Page) => expect(p.getByRole("heading", { level: 1 })).toContainText("built around finishing") },
  { name: "login", path: "/login", ready: (p: Page) => expect(p.getByRole("heading", { level: 1 })).toHaveText("Welcome back") },
  { name: "sign-up", path: "/sign-up", ready: (p: Page) => expect(p.getByRole("heading", { level: 1 })).toHaveText("Create your account") },
];

async function prepare(page: Page, theme: "light" | "dark", skipSplash = true) {
  await mockApi(page);
  // Scroll-reveal sections (and the sample dashboard) wait for IntersectionObserver.
  // For screenshots we want the finished page, whatever the scroll timing or machine
  // speed - so every observed element is reported as "in view" straight away.
  await page.addInitScript(() => {
    class AlwaysInView {
      private callback: IntersectionObserverCallback;
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback;
      }
      observe(target: Element) {
        setTimeout(() => this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver), 0);
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    (window as any).IntersectionObserver = AlwaysInView;
  });
  await page.addInitScript(
    ([key, t, skip]) => {
      if (skip) sessionStorage.setItem(key as string, "1");
      localStorage.setItem("theme", t as string);
    },
    [SPLASH_SEEN_KEY, theme, skipSplash]
  );
}

// Wait for fonts and let the page settle. A full-page screenshot starts from the top.
async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

for (const theme of ["light", "dark"] as const) {
  for (const p of pages) {
    test(`${p.name} page, ${theme} mode`, async ({ page }) => {
      await prepare(page, theme);
      await page.goto(p.path);
      await p.ready(page);
      await settle(page);
      await expect(page).toHaveScreenshot(`${p.name}-${theme}.png`, { fullPage: true });
    });
  }
}

test("phone menu, open", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "visual-phone", "only relevant on a phone");
  await prepare(page, "light");
  await page.goto("/");
  await expect(page.getByText("JavaScript from Scratch")).toBeVisible();
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await expect(page.getByRole("button", { name: "Toggle menu" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Courses" })).toBeVisible();
  await page.waitForTimeout(400);
  await expect(page).toHaveScreenshot("menu-open.png");
});

// Not a screenshot: the loading screen should play once, then stay away.
test("loading screen plays once per session", async ({ page }) => {
  await prepare(page, "light", false);
  const splash = page.getByRole("status", { name: "Loading Ledger" });
  await page.goto("/");
  await expect(splash).toBeVisible();
  await expect(splash).toBeHidden({ timeout: 10_000 });
  await page.goto("/about"); // a full reload in the same tab
  await expect(splash).toHaveCount(0);
});
