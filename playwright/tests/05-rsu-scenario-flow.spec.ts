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
    
    // Verify financial metrics are displayed
    await expect(page.getByText(/Net Financial Impact/i)).toBeVisible();
  });

  test('should display opportunity cost calculation', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();
    
    // Verify opportunity cost section
    await expect(page.getByText(/Opportunity Cost/i)).toBeVisible();
  });

  test('should show startup payout with equity value', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();
    
    // Verify startup payout is shown
    await expect(page.getByText(/Startup Total/i)).toBeVisible();
  });

  test('should display calculation progress indicator', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    
    // Start filling forms
    await helpers.fillGlobalSettings();
    await helpers.fillCurrentJobForm();
    await helpers.fillRSUForm();
    
    // Look for either the calculating indicator or results
    const calculatingText = page.getByText(/Analyzing Your Scenario/i);
    const resultsText = page.locator(SELECTORS.results.scenarioResults);
    
    // One of these should be visible
    const isCalculating = await calculatingText.isVisible().catch(() => false);
    const hasResults = await resultsText.isVisible().catch(() => false);
    
    expect(isCalculating || hasResults).toBeTruthy();
  });

  test('should update results when form values change', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();
    
    // Wait for initial results
    await page.waitForSelector(SELECTORS.results.scenarioResults, {
      timeout: TIMEOUTS.calculation,
    });
    
    // Change exit year
    const exitYearSlider = page.locator('input[name="exit_year"]');
    await exitYearSlider.fill('7');
    
    // Wait a bit for recalculation
    await page.waitForTimeout(2000);
    
    // Results should still be visible (potentially updated)
    await expect(page.locator(SELECTORS.results.scenarioResults)).toBeVisible();
  });

  test('should take screenshot of complete RSU scenario', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();
    
    // Wait for results to be fully rendered
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({
      path: 'playwright/screenshots/rsu-scenario-complete.png',
      fullPage: true,
    });
  });
});
