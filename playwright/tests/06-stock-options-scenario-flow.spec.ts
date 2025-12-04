import { test, expect } from '../fixtures/base';
import { SELECTORS, TIMEOUTS } from '../utils/test-data';

/**
 * Test Suite: Complete Scenario Analysis with Stock Options
 *
 * These tests verify the complete end-to-end flow with Stock Options:
 * - Fill all forms with stock options
 * - Wait for calculations
 * - Verify results are displayed
 */

test.describe('Complete Stock Options Scenario Analysis', () => {
  test('should complete full Stock Options scenario and display results', async ({ page, helpers }) => {
    await page.goto('/');

    // Wait for API connection
    await helpers.waitForAPIConnection();

    // Complete the Stock Options scenario
    await helpers.completeStockOptionsScenario();

    // Verify scenario results are displayed
    await expect(page.locator(SELECTORS.results.scenarioResults)).toBeVisible({
      timeout: TIMEOUTS.calculation,
    });
  });

  test('should display options profit calculation', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeStockOptionsScenario();

    // Verify financial metrics are displayed
    await expect(page.getByText(/Net Financial Impact/i)).toBeVisible();
  });

  test('should show exercise cost impact for stock options', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeStockOptionsScenario();

    // The results should be visible with options-specific calculations
    await expect(page.locator(SELECTORS.results.scenarioResults)).toBeVisible();
    await expect(page.getByText(/Startup Total/i)).toBeVisible();
  });

  test('should handle early exercise strategy', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Fill forms but select early exercise
    await helpers.fillGlobalSettings();
    await helpers.fillCurrentJobForm();

    // Select Stock Options and fill form
    await helpers.selectStockOptionsEquityType();

    // Fill in basic fields - wait for salary input to be visible
    const salaryInput = page.locator('input[name="monthly_salary"]').last();
    await salaryInput.waitFor({ state: 'visible' });
    await salaryInput.fill('12500');

    const numOptionsInput = page.locator('input[name="num_options"]');
    await numOptionsInput.fill('50000');

    const strikePriceInput = page.locator('input[name="strike_price"]');
    await strikePriceInput.fill('1.0');

    const exitPriceInput = page.locator('input[name="exit_price_per_share"]');
    await exitPriceInput.fill('10.0');

    // Select "Early Exercise" strategy
    const strategySection = page.getByText('Exercise Strategy').locator('..');
    const combobox = strategySection.locator('button[role="combobox"]').first();
    await combobox.click();
    await page.getByRole('option', { name: 'Early Exercise' }).click();

    // Wait for results
    await helpers.waitForScenarioResults();

    // Verify results are displayed
    await expect(page.locator(SELECTORS.results.scenarioResults)).toBeVisible();
  });

  test('should compare Stock Options vs RSU by switching between them', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // First, complete Stock Options scenario
    await helpers.completeStockOptionsScenario();
    const resultsSelector = page.locator(SELECTORS.results.scenarioResults);
    await expect(resultsSelector).toBeVisible();

    // Now switch to RSU
    await helpers.selectRSUEquityType();

    // Fill RSU form - wait for equity input to appear
    const equityInput = page.locator('input[name="total_equity_grant_pct"]');
    await equityInput.waitFor({ state: 'visible' });
    await equityInput.fill('0.5');

    const valuationInput = page.locator('input[name="exit_valuation"]');
    await valuationInput.fill('100000000');

    // Results should still be visible
    await expect(resultsSelector).toBeVisible();
  });

  test('should take screenshot of complete Stock Options scenario', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeStockOptionsScenario();

    // Wait for results to be fully rendered
    await expect(page.locator(SELECTORS.results.scenarioResults)).toBeVisible();

    // Take screenshot
    await page.screenshot({
      path: 'playwright/screenshots/stock-options-scenario-complete.png',
      fullPage: true,
    });
  });
});
