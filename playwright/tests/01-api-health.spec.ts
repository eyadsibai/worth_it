import { test, expect } from '../fixtures/base';
import { SELECTORS } from '../utils/test-data';

/**
 * Test Suite: API Health and Basic Page Load
 *
 * These tests verify that:
 * - The application loads successfully
 * - The backend API is healthy and responsive
 * - The UI displays the API connection status
 */

test.describe('API Health and Connection', () => {
  test('should load the home page successfully', async ({ page }) => {
    await page.goto('/');

    // Verify page title or main heading
    await expect(page.getByRole('heading', { name: /Job Offer Financial Analyzer/i })).toBeVisible();
  });

  test('should connect to the API and show healthy status', async ({ page, helpers }) => {
    await page.goto('/');

    // Wait for API health check to complete
    await helpers.waitForAPIConnection();

    // Verify API status card shows connected
    await expect(page.locator(SELECTORS.results.connectedStatus)).toBeVisible();

    // Verify status shows "healthy"
    await expect(page.getByText(/Status:/i).locator('..').getByText(/healthy/i)).toBeVisible();
  });

  test('should display API version information', async ({ page, helpers }) => {
    await page.goto('/');

    await helpers.waitForAPIConnection();

    // Verify version is displayed
    await expect(page.getByText(/Version:/i)).toBeVisible();
  });

  test('API health endpoint should return 200', async ({ helpers }) => {
    await helpers.verifyAPIHealth();
  });
});
