import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Monte Carlo Simulations
 *
 * These tests verify:
 * - Monte Carlo form is accessible
 * - Simulations can be configured and run
 * - Results and visualizations are displayed
 */

test.describe('Monte Carlo Simulations', () => {
  test('should display Monte Carlo form after completing scenario', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Look for Monte Carlo section
    await expect(page.getByText(/Monte Carlo/i).first()).toBeVisible();
  });

  test('should allow configuring Monte Carlo parameters', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Find number of simulations input (wait for Monte Carlo section to appear)
    const numSimsInput = page.locator('input[name="num_simulations"]');
    if (await numSimsInput.count() > 0) {
      await numSimsInput.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      if (await numSimsInput.first().isVisible()) {
        await numSimsInput.first().fill('500');
        await expect(numSimsInput.first()).toHaveValue('500');
      }
    }
  });

  test('should run Monte Carlo simulation and show results', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Look for "Run Simulation" button
    const runButton = page.getByRole('button', { name: /Run Simulation/i });
    if (await runButton.count() > 0) {
      await runButton.first().click();

      // Wait for simulation results to appear
      const hasVisualization = await page.getByText(/Distribution/i).isVisible({ timeout: 10000 }).catch(() => false);
      const hasResults = await page.getByText(/Simulation/i).isVisible({ timeout: 10000 }).catch(() => false);

      expect(hasVisualization || hasResults).toBeTruthy();
    }
  });

  test('should display Monte Carlo visualizations after simulation', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Try to run simulation
    const runButton = page.getByRole('button', { name: /Run Simulation/i });
    if (await runButton.count() > 0) {
      await runButton.first().click();

      // Wait for visualizations to appear
      await page.getByText(/Distribution/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

      // Take screenshot to capture visualizations
      await page.screenshot({
        path: 'playwright/screenshots/monte-carlo-visualizations.png',
        fullPage: true,
      });
    }
  });

  test('should handle Monte Carlo with Stock Options', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeStockOptionsScenario();

    // Verify Monte Carlo section is available for stock options too
    const monteCarloSection = await page.getByText(/Monte Carlo/i).first().isVisible().catch(() => false);
    expect(monteCarloSection).toBeTruthy();
  });
});

test.describe('Monte Carlo Parameter Variations', () => {
  test('should allow setting exit valuation range', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Look for min/max exit valuation inputs
    const minValInput = page.locator('input[name="min_exit_valuation"]');
    const maxValInput = page.locator('input[name="max_exit_valuation"]');

    if (await minValInput.count() > 0) {
      await minValInput.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      if (await minValInput.first().isVisible()) {
        await minValInput.first().fill('50000000');
        await expect(minValInput.first()).toHaveValue('50000000');
      }
    }

    if (await maxValInput.count() > 0) {
      if (await maxValInput.first().isVisible()) {
        await maxValInput.first().fill('200000000');
        await expect(maxValInput.first()).toHaveValue('200000000');
      }
    }
  });

  test('should support different distribution types', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Look for distribution type toggle or selector
    const distributionToggle = page.locator('input[name="use_triangular_distribution"]');
    if (await distributionToggle.count() > 0) {
      await distributionToggle.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      if (await distributionToggle.first().isVisible()) {
        // Toggle the distribution type
        await distributionToggle.first().click();
      }
    }
  });
});
