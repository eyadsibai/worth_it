import { test, expect } from '../fixtures/base';
import { SELECTORS } from '../utils/test-data';

/**
 * Test Suite: API Health and Basic Page Load
 *
 * These tests verify that:
 * - The application loads successfully
 * - The backend API is healthy and responsive
 * - The main UI components are rendered
 */

test.describe('API Health and Connection', () => {
  test('should load the home page successfully', async ({ page }) => {
    await page.goto('/');

    // Verify page title or main heading
    await expect(page.getByRole('heading', { name: /Job Offer Financial Analyzer/i })).toBeVisible();
  });

  test('should render main form sections', async ({ page, helpers }) => {
    await page.goto('/');

    // Wait for page to be ready
    await helpers.waitForAPIConnection();

    // Verify main form sections are visible
    await expect(page.getByText(/Global Settings/i)).toBeVisible();
    await expect(page.getByText(/Current Job/i)).toBeVisible();
    await expect(page.getByText(/Startup Offer/i)).toBeVisible();
  });

  test('should display results summary cards', async ({ page, helpers }) => {
    await page.goto('/');

    await helpers.waitForAPIConnection();

    // Verify result cards are displayed
    await expect(page.locator(SELECTORS.results.finalPayoutCard)).toBeVisible();
    await expect(page.locator(SELECTORS.results.opportunityCostCard)).toBeVisible();
    await expect(page.locator(SELECTORS.results.netBenefitCard)).toBeVisible();
  });

  test('API health endpoint should return 200', async ({ helpers }) => {
    await helpers.verifyAPIHealth();
  });
});
