import { defineConfig, devices } from "@playwright/test";

// Design system checks: accessibility (axe), keyboard behaviour, and screenshots of /admin/design.
// Locally you can reuse a running dev server: PW_BASE_URL=http://localhost:4000 npm run test:e2e
const PORT = 4100;
const external = process.env.PW_BASE_URL;

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  expect: {
    timeout: 15_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: "disabled" },
  },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  // Baselines are made on CI (Linux) only, so they never differ between laptops. See e2e/README.md.
  snapshotPathTemplate: "e2e/__screenshots__/{projectName}/{arg}{ext}",
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // WebKit stands in for Safari, the oldest engine on our support list.
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: external
    ? undefined
    : {
        command: `npx next dev --hostname localhost --port ${PORT}`,
        url: `http://localhost:${PORT}/admin/design`,
        reuseExistingServer: !process.env.CI,
        timeout: 240_000,
      },
});
