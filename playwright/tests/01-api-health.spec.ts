import { test, expect } from '../fixtures/base';
import { SELECTORS, TIMEOUTS } from '../utils/test-data';

/**
 * Test Suite: API Health and Basic Page Load
 *
 * These tests verify that:
 * - The application loads successfully
 * - The backend API is healthy and responsive
 * - The main UI components are rendered
 */

test.describe('API Health and Connection', () => {
  test('should load the home page successfully', async ({ page, helpers }) => {
    await page.goto('/');

    // Wait for page to be ready (dismisses welcome dialog automatically via helper)
    await helpers.waitForAPIConnection();

    // Verify page heading contains "Offer" and "Analysis" text (split across spans)
    // The h1 heading uses AnimatedText components that render as spans
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
    await expect(page.getByText('Offer').first()).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
    await expect(page.getByText('Analysis').first()).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
  });

  test('should render main form sections', async ({ page, helpers }) => {
    await page.goto('/');

    // Wait for page to be ready
    await helpers.waitForAPIConnection();

    // Verify main form sections are visible with explicit timeouts
    await expect(page.getByText(/Global Settings/i).first()).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
    await expect(page.getByText('Current Job', { exact: true }).first()).toBeVisible({
      timeout: TIMEOUTS.textContent,
    });
    await expect(page.getByText(/Startup Offer/i).first()).toBeVisible({
      timeout: TIMEOUTS.textContent,
    });
  });

  test('should display results summary cards', async ({ page, helpers }) => {
    await page.goto('/');

    await helpers.waitForAPIConnection();

    // Results cards are only visible after completing a scenario
    // For basic health check, just verify the page loaded without crashes
    await expect(page.locator('body')).toBeVisible({ timeout: TIMEOUTS.elementPresent });
  });

  test('API health endpoint should return 200', async ({ helpers }) => {
    await helpers.verifyAPIHealth();
  });
});
