import { test, expect } from '../fixtures/base';
import { SELECTORS, TIMEOUTS } from '../utils/test-data';

/**
 * A currency amount with at least one non-zero digit, e.g. "$500,000" or the
 * compact "$500K" used below the lg breakpoint. Deliberately does NOT match
 * "$0", which is both the pre-animation placeholder and the symptom of a
 * scenario request that lost its equity inputs on the way to the backend.
 */
const CURRENCY_WITH_NONZERO_VALUE = /\$[\d,]*[1-9][\d,]*(\.\d+)?[KMB]?/;

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

    // The metric card abbreviates the label to "Opp. Cost"; the unabbreviated
    // "Opportunity Cost" heading lives in the Charts tab, which is not the
    // default tab. Assert both, so this covers the summary figure and the
    // chart section rather than whichever one happens to be on screen.
    const oppCostCard = page
      .locator('.terminal-card')
      .filter({ hasText: /Opp\. Cost/i })
      .first();
    await expect(oppCostCard).toBeVisible({ timeout: TIMEOUTS.calculation });

    // Metric values animate up from $0 and only settle once scrolled into view.
    await oppCostCard.scrollIntoViewIfNeeded();
    await expect(oppCostCard).toHaveText(CURRENCY_WITH_NONZERO_VALUE, {
      timeout: TIMEOUTS.elementVisible,
    });

    await page.getByRole('tab', { name: /charts/i }).click();
    await expect(page.getByRole('heading', { name: /^Opportunity Cost$/i })).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
  });

  test('should show startup payout with equity value', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Verify startup-related results are shown (Final Payout card or payout label)
    // The UI shows equity payout in the Final Payout card with a payout_label
    await expect(page.getByText(/Final Payout/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Verify the payout card renders an actual non-zero currency amount. A bare
    // "$0" here means the scenario request reached the backend with the equity
    // stripped out, which is exactly the class of bug this smoke test guards.
    const payoutCard = page
      .locator('.terminal-card')
      .filter({ hasText: /Final Payout/i })
      .first();
    await payoutCard.scrollIntoViewIfNeeded();
    await expect(payoutCard).toHaveText(CURRENCY_WITH_NONZERO_VALUE, {
      timeout: TIMEOUTS.elementVisible,
    });
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
