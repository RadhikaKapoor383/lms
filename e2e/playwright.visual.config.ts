import { defineConfig, devices } from "@playwright/test";

// Visual (screenshot) tests. Unlike the main e2e suite they need no server,
// database or seeded data: they start the built client and mock every API call.
//
//   cd client && NEXT_PUBLIC_SERVER_URI=http://localhost:8000/api/v1 npm run build
//   cd e2e && npm run test:visual
const PORT = 3100;

export default defineConfig({
  testDir: "./visual",
  timeout: 60_000,
  fullyParallel: true,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-visual" }]],
  expect: {
    // A tiny absolute tolerance (anti-aliasing noise). A ratio of the page would let a
    // whole wrong-coloured button slip through on a tall full-page screenshot.
    toHaveScreenshot: { animations: "disabled", maxDiffPixels: 150 },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    reducedMotion: "reduce", // the site turns its animations off, so shots are stable
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    cwd: "../client",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: "visual-desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "visual-phone", use: { ...devices["Pixel 7"] } },
  ],
});
