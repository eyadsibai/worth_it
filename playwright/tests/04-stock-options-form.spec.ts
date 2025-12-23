import { test, expect } from '../fixtures/base';
import { TEST_DATA, TIMEOUTS } from '../utils/test-data';

/**
 * Test Suite: Stock Options Form
 *
 * These tests verify that:
 * - Stock Options form can be selected and displayed
 * - Stock Options form fields accept proper input
 * - Exercise strategy can be configured
 */

test.describe('Stock Options Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should allow selecting Stock Options equity type', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.selectStockOptionsEquityType();

    // Verify Stock Options tab is selected (UI uses tabs, not radio buttons)
    const optionsTab = page.getByRole('tab', { name: 'Stock Options' });
    await expect(optionsTab).toHaveAttribute('aria-selected', 'true', { timeout: TIMEOUTS.formInput });
  });

  test('should display Stock Options-specific fields', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.selectStockOptionsEquityType();

    // Wait for Stock Options form fields to appear
    await expect(page.getByText(/Number of Options/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(/Strike Price/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(/Exit Price Per Share/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(/When to Exercise/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should allow filling Stock Options form fields', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.fillStockOptionsForm();

    // Get Stock Options panel
    const optionsPanel = page.getByRole('tabpanel', { name: 'Stock Options' });

    // Number of options uses textbox with formatted display - verify visible
    const textInputs = optionsPanel.locator('input[type="text"]');
    await expect(textInputs.nth(1)).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Verify strike price (first number input in the panel)
    const numberInputs = optionsPanel.locator('input[type="number"]');
    await expect(numberInputs.nth(0)).toHaveValue(TEST_DATA.stockOptions.strikePrice.toString(), { timeout: TIMEOUTS.formInput });

    // Verify exit price (second number input in the panel)
    await expect(numberInputs.nth(1)).toHaveValue(TEST_DATA.stockOptions.exitPricePerShare.toString(), { timeout: TIMEOUTS.formInput });
  });

  test('should allow setting vesting and cliff periods for options', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.selectStockOptionsEquityType();

    // Set vesting period (Radix UI Slider: min=1, step=1)
    await helpers.setSliderValue('Vesting Period', 4, 1, 1);

    // Verify vesting period using data-slot for FormItem
    const vestingLabel = page.getByText('Vesting Period', { exact: true });
    const vestingFormItem = page.locator('[data-slot="form-item"]').filter({ has: vestingLabel });
    const vestingSlider = vestingFormItem.locator('[role="slider"]');
    await expect(vestingSlider).toHaveAttribute('aria-valuenow', '4', { timeout: TIMEOUTS.formInput });

    // Set cliff period (Radix UI Slider: min=0, step=1)
    await helpers.setSliderValue('Cliff Period', 1, 0, 1);

    // Verify cliff period using data-slot for FormItem
    const cliffLabel = page.getByText('Cliff Period', { exact: true });
    const cliffFormItem = page.locator('[data-slot="form-item"]').filter({ has: cliffLabel });
    const cliffSlider = cliffFormItem.locator('[role="slider"]');
    await expect(cliffSlider).toHaveAttribute('aria-valuenow', '1', { timeout: TIMEOUTS.formInput });
  });

  test('should allow selecting exercise strategy', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.selectStockOptionsEquityType();

    // Get Stock Options panel
    const optionsPanel = page.getByRole('tabpanel', { name: 'Stock Options' });

    // Find and click the exercise strategy combobox (label is "When to Exercise")
    const strategySection = optionsPanel.getByText('When to Exercise').locator('..');
    const combobox = strategySection.locator('button[role="combobox"]').first();
    await combobox.click();

    // Select "At Exit (IPO/Acquisition)"
    await page.getByRole('option', { name: 'At Exit (IPO/Acquisition)' }).click();

    // Verify selection (button should now contain "At Exit")
    await expect(combobox).toContainText('At Exit', { timeout: TIMEOUTS.formInput });
  });

  test('should switch between RSU and Stock Options', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();

    // Start with RSU
    await helpers.selectRSUEquityType();
    // Use .first() to avoid strict mode violation when multiple elements match
    await expect(page.getByText(/Total Equity Grant/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Switch to Stock Options
    await helpers.selectStockOptionsEquityType();
    await expect(page.getByText(/Number of Options/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Verify RSU fields are no longer visible (RSU tabpanel should be hidden)
    const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
    await expect(rsuPanel).not.toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });
});
