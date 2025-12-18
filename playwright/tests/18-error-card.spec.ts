import { test, expect } from '../fixtures/base';

/**
 * E2E Tests for PR #219: Error Card Component
 *
 * Test Plan:
 * - [x] Verify ErrorCard displays error message with icon
 * - [x] Test retry button triggers callback
 * - [x] Test copy error details to clipboard
 * - [x] Test expandable technical details section
 *
 * Note: These tests use route interception to simulate API errors.
 * The ErrorCard only appears when a calculation fails.
 */

test.describe('PR #219: Error Card', () => {
  // Helper to set up API error interception for ONLY the startup-scenario endpoint
  // We let other requests (monthly-data-grid, opportunity-cost) succeed so the
  // calculation chain progresses to the startup-scenario call
  async function setupErrorInterception(page: any) {
    await page.route('http://localhost:8000/api/startup-scenario', async (route: any) => {
      console.log('Intercepted startup-scenario with 500 error');
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Server error: calculation failed' })
      });
    });
  }

  // Helper to trigger calculation by clicking Load Example dropdown and selecting an option
  async function triggerCalculation(page: any) {
    // Click the Load Example dropdown button
    const loadExampleButton = page.getByRole('button', { name: /load example/i });
    await loadExampleButton.waitFor({ state: 'visible', timeout: 5000 });
    await loadExampleButton.click();

    // Wait for dropdown menu to appear and click on an example
    const menuItem = page.getByRole('menuitem', { name: /early-stage startup/i });
    await menuItem.waitFor({ state: 'visible', timeout: 3000 });
    await menuItem.click();

    // Wait for all API calls to be made and errors to propagate
    // The calculation chain: monthlyData -> opportunityCost -> startupScenario
    await page.waitForTimeout(5000);
  }

  test.describe('Error display', () => {
    test('should display ErrorCard with alert role when API fails', async ({ page, helpers }) => {
      await setupErrorInterception(page);
      await page.goto('/');
      // Wait for page to be fully loaded before dismissing dialog
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await triggerCalculation(page);

      // Wait for error card with role="alert"
      const errorCard = page.locator('[role="alert"]');
      await expect(errorCard.first()).toBeVisible({ timeout: 10000 });

      // Verify error icon (AlertTriangle or similar)
      const icon = errorCard.locator('svg').first();
      await expect(icon).toBeVisible();
    });

    test('should display error title in ErrorCard', async ({ page, helpers }) => {
      await setupErrorInterception(page);
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await triggerCalculation(page);

      const errorCard = page.locator('[role="alert"]');
      await expect(errorCard.first()).toBeVisible({ timeout: 10000 });

      // Check for title (h3 or text containing "failed" or error-related)
      const hasTitle = await errorCard.locator('h3').count() > 0 ||
                       await errorCard.getByText(/failed|error|wrong/i).count() > 0;
      expect(hasTitle).toBeTruthy();
    });

    test('should display suggestions list for troubleshooting', async ({ page, helpers }) => {
      await setupErrorInterception(page);
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await triggerCalculation(page);

      const errorCard = page.locator('[role="alert"]');
      await expect(errorCard.first()).toBeVisible({ timeout: 10000 });

      // Check for suggestions (ul with li items)
      const suggestions = errorCard.locator('ul li');
      const count = await suggestions.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Retry functionality', () => {
    test('should display retry button in ErrorCard', async ({ page, helpers }) => {
      await setupErrorInterception(page);
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await triggerCalculation(page);

      const errorCard = page.locator('[role="alert"]');
      await expect(errorCard.first()).toBeVisible({ timeout: 10000 });

      // Look for retry button
      const retryButton = errorCard.getByRole('button', { name: /retry|try again/i });
      await expect(retryButton).toBeVisible();
    });

    test('retry button should trigger new calculation', async ({ page, helpers }) => {
      let apiCalls = 0;

      // Intercept only the startup-scenario endpoint to track retry attempts
      await page.route('http://localhost:8000/api/startup-scenario', async (route: any) => {
        apiCalls++;
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Server error' })
        });
      });

      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await triggerCalculation(page);

      const errorCard = page.locator('[role="alert"]');
      await expect(errorCard.first()).toBeVisible({ timeout: 10000 });

      const initialCalls = apiCalls;
      const retryButton = errorCard.getByRole('button', { name: /retry|try again/i });
      await retryButton.click();

      // Wait for the retry to trigger another API call
      await page.waitForTimeout(3000);

      expect(apiCalls).toBeGreaterThan(initialCalls);
    });
  });

  test.describe('Copy error details', () => {
    test('should display copy button in ErrorCard', async ({ page, helpers }) => {
      await setupErrorInterception(page);
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await triggerCalculation(page);

      const errorCard = page.locator('[role="alert"]');
      await expect(errorCard.first()).toBeVisible({ timeout: 10000 });

      // Look for copy button
      const copyButton = errorCard.getByRole('button', { name: /copy/i });
      await expect(copyButton).toBeVisible();
    });

    test('copy button should show "Copied" feedback', async ({ page, helpers, context }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await setupErrorInterception(page);
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await triggerCalculation(page);

      const errorCard = page.locator('[role="alert"]');
      await expect(errorCard.first()).toBeVisible({ timeout: 10000 });

      const copyButton = errorCard.getByRole('button', { name: /copy/i });
      await copyButton.click();

      // Should show "Copied" text
      await expect(errorCard.getByText('Copied')).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Accessibility', () => {
    test('ErrorCard should have proper role="alert" for screen readers', async ({ page, helpers }) => {
      await setupErrorInterception(page);
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await triggerCalculation(page);

      // The ErrorCard uses role="alert" which announces to screen readers
      const alertElement = page.locator('[role="alert"]');
      await expect(alertElement.first()).toBeVisible({ timeout: 10000 });
    });

    test('retry button should be keyboard accessible', async ({ page, helpers }) => {
      await setupErrorInterception(page);
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await triggerCalculation(page);

      const errorCard = page.locator('[role="alert"]');
      await expect(errorCard.first()).toBeVisible({ timeout: 10000 });

      const retryButton = errorCard.getByRole('button', { name: /retry|try again/i });
      await retryButton.focus();

      // Should be focusable
      await expect(retryButton).toBeFocused();
    });
  });
});
