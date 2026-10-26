import { defineConfig, devices } from "@playwright/test";

// The tests drive the real website, so the server and client must be running
// with seeded data (see README.md in this folder). They don't start them.
export default defineConfig({
  testDir: "./tests",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // tests share one database
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /phone\.spec/ },
    { name: "phone", use: { ...devices["Pixel 7"] }, testMatch: /phone\.spec/ },
  ],
});
