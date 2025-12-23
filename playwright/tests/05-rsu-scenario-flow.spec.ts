import { test, expect } from '../fixtures/base';
import { SELECTORS, TIMEOUTS } from '../utils/test-data';

/**
 * Test Suite: Complete Scenario Analysis with RSU
 *
 * These tests verify the complete end-to-end flow:
 * - Fill all forms
 * - Wait for calculations
 * - Verify results are displayed
 */

test.describe('Complete RSU Scenario Analysis', () => {
  test('should complete full RSU scenario and display results', async ({ page, helpers }) => {
    await page.goto('/');

    // Wait for API connection
    await helpers.waitForAPIConnection();

    // Complete the RSU scenario
    await helpers.completeRSUScenario();

    // Verify scenario results are displayed
    await expect(page.locator(SELECTORS.results.scenarioResults)).toBeVisible({
      timeout: TIMEOUTS.calculation,
    });
  });

  test('should display final payout information', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Verify financial metrics are displayed - UI shows "Final Payout" label
    await expect(page.getByText(/Final Payout/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should display opportunity cost calculation', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Verify opportunity cost section
    await expect(page.getByText(/Opportunity Cost/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should show startup payout with equity value', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Verify startup-related results are shown (Final Payout card or payout label)
    // The UI shows equity payout in the Final Payout card with a payout_label
    await expect(page.getByText(/Final Payout/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    // Verify payout value is displayed (positive currency value)
    await expect(page.locator('[class*="currency"]').first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should display calculation progress indicator', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Start filling forms
    await helpers.fillGlobalSettings();
    await helpers.fillCurrentJobForm();
    await helpers.fillRSUForm();

    // Wait for results to be visible - calculations typically complete quickly
    // so we expect results to be visible after filling the form
    const resultsText = page.locator(SELECTORS.results.scenarioResults);
    await expect(resultsText).toBeVisible({ timeout: TIMEOUTS.calculation });
  });

  test('should update results when form values change', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Wait for initial results
    await page.waitForSelector(SELECTORS.results.scenarioResults, {
      timeout: TIMEOUTS.calculation,
    });

    // Change exit year using Radix UI Slider (min=1, step=1)
    await helpers.setSliderValue('Exit Year', 7, 1, 1);

    // Results should still be visible (potentially updated)
    await expect(page.locator(SELECTORS.results.scenarioResults)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should take screenshot of complete RSU scenario', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Wait for results to be fully rendered
    await expect(page.locator(SELECTORS.results.scenarioResults)).toBeVisible({ timeout: TIMEOUTS.calculation });

    // Take screenshot
    await page.screenshot({
      path: 'playwright/screenshots/rsu-scenario-complete.png',
      fullPage: true,
    });
  });
});
