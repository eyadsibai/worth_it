import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Worth It E2E Tests
 *
 * NOTE: The webServer configuration is commented out below.
 * You need to manually start the backend and frontend servers before running tests:
 *
 * Terminal 1 (Backend): cd backend && python3 -m uvicorn worth_it.api:app --port 8000
 * Terminal 2 (Frontend): cd frontend && npm run dev
 * Terminal 3 (Tests): npm run test:e2e
 *
 * Alternatively, uncomment the webServer configuration to have Playwright
 * automatically start the servers (requires Python 3.13+).
 */

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './playwright/tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'playwright-report/results.json' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    /* Video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  // NOTE: Uncomment when testing locally or in CI with Python 3.13+
  // The backend command requires Python 3.13+ (use 'python3.13' explicitly if needed)
  // webServer: [
  //   {
  //     command: 'cd backend && python3 -m uvicorn worth_it.api:app --host 0.0.0.0 --port 8000',
  //     url: 'http://localhost:8000/health',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120 * 1000,
  //   },
  //   {
  //     command: 'cd frontend && npm run dev',
  //     url: 'http://localhost:3000',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 120 * 1000,
  //   },
  // ],
});
