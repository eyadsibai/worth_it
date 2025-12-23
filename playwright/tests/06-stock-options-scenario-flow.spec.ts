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

    // Verify financial metrics are displayed (actual UI text)
    await expect(page.getByText(/Final Payout/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should show exercise cost impact for stock options', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeStockOptionsScenario();

    // The results should be visible with options-specific calculations
    await expect(page.locator(SELECTORS.results.scenarioResults)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    // Verify opportunity cost is displayed (shows alternative path value)
    await expect(page.getByText(/Opportunity Cost/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should handle after vesting exercise strategy', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Fill forms but select after vesting exercise
    await helpers.fillGlobalSettings();
    await helpers.fillCurrentJobForm();

    // Select Stock Options and fill form
    await helpers.selectStockOptionsEquityType();

    // Get Stock Options tabpanel and its inputs
    const optionsPanel = page.getByRole('tabpanel', { name: 'Stock Options' });
    await optionsPanel.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // Text inputs (formatDisplay=true): Monthly Salary, Number of Options
    const textInputs = optionsPanel.locator('input[type="text"]');
    await textInputs.first().waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // Monthly Salary - first textbox
    await textInputs.nth(0).click({ clickCount: 3 });
    await page.keyboard.type('12500');

    // Number of Options - second textbox
    await textInputs.nth(1).click({ clickCount: 3 });
    await page.keyboard.type('50000');

    // Number inputs: Strike Price, Exit Price
    const numberInputs = optionsPanel.locator('input[type="number"]');
    await numberInputs.first().waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // Strike Price - first number input
    await numberInputs.nth(0).fill('1.0');

    // Exit Price - second number input
    await numberInputs.nth(1).fill('10.0');

    // Select "After Vesting" strategy (UI label is "When to Exercise")
    const strategySection = optionsPanel.getByText('When to Exercise').locator('..');
    const combobox = strategySection.locator('button[role="combobox"]').first();
    await combobox.click();
    await page.getByRole('option', { name: 'After Vesting' }).click();

    // Wait for results
    await helpers.waitForScenarioResults();

    // Verify results are displayed
    await expect(page.locator(SELECTORS.results.scenarioResults)).toBeVisible({ timeout: TIMEOUTS.calculation });
  });

  test('should compare Stock Options vs RSU by switching between them', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // First, complete Stock Options scenario
    await helpers.completeStockOptionsScenario();
    const resultsSelector = page.locator(SELECTORS.results.scenarioResults);
    await expect(resultsSelector).toBeVisible({ timeout: TIMEOUTS.calculation });

    // Now switch to RSU
    await helpers.selectRSUEquityType();

    // Get RSU tabpanel and its inputs
    const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
    await rsuPanel.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // Total Equity Grant % - the only number input in RSU panel
    const numberInput = rsuPanel.locator('input[type="number"]');
    await numberInput.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });
    await numberInput.fill('0.5');

    // Exit Valuation - second textbox in RSU panel (formatDisplay=true)
    const textInputs = rsuPanel.locator('input[type="text"]');
    // Triple-click to select all (works cross-platform)
    await textInputs.nth(1).click({ clickCount: 3 });
    await page.keyboard.type('100000000');

    // Results should still be visible
    await expect(resultsSelector).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should take screenshot of complete Stock Options scenario', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeStockOptionsScenario();

    // Wait for results to be fully rendered
    await expect(page.locator(SELECTORS.results.scenarioResults)).toBeVisible({ timeout: TIMEOUTS.calculation });

    // Take screenshot
    await page.screenshot({
      path: 'playwright/screenshots/stock-options-scenario-complete.png',
      fullPage: true,
    });
  });
});
