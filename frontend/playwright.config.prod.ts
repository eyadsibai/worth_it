import { defineConfig, devices } from "@playwright/test";

/** Port the backend is expected on. 8000 is the project default; see webServer below. */
const BACKEND_PORT = process.env.BACKEND_PORT ?? "8000";

/**
 * Production environment testing configuration
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  /* Run production build before starting the tests */
  webServer: [
    {
      command: "pnpm build && pnpm start",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
      timeout: 120000, // Longer timeout for production build
    },
    {
      command: `cd ../backend && uv run uvicorn worth_it.api:app --port ${BACKEND_PORT}`,
      // Not /, which the API does not serve, and not /health, which is rate
      // limited at RATE_LIMIT_PER_MINUTE and so can 429 a continuous readiness
      // poll into a timeout. /openapi.json is unauthenticated, unlimited, and
      // only answers once every router is mounted. See playwright.config.ts.
      url: `http://localhost:${BACKEND_PORT}/openapi.json`,
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
