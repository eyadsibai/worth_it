import { test, expect } from '../fixtures/base';
import { TEST_DATA, SELECTORS } from '../utils/test-data';

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
    await helpers.selectStockOptionsEquityType();

    // Verify Stock Options radio is checked
    const optionsRadio = page.locator(SELECTORS.startupOffer.equityTypeStockOptions);
    await expect(optionsRadio).toBeChecked();
  });

  test('should display Stock Options-specific fields', async ({ page, helpers }) => {
    await helpers.selectStockOptionsEquityType();

    // Wait for Stock Options form fields to appear
    await expect(page.getByText(/Number of Options/i)).toBeVisible();
    await expect(page.getByText(/Strike Price/i)).toBeVisible();
    await expect(page.getByText(/Exit Price Per Share/i)).toBeVisible();
    await expect(page.getByText(/Exercise Strategy/i)).toBeVisible();
  });

  test('should allow filling Stock Options form fields', async ({ page, helpers }) => {
    await helpers.fillStockOptionsForm();

    // Verify number of options
    const numOptionsInput = page.locator(SELECTORS.stockOptions.numOptionsInput);
    await expect(numOptionsInput).toHaveValue(TEST_DATA.stockOptions.numOptions.toString());

    // Verify strike price
    const strikePriceInput = page.locator(SELECTORS.stockOptions.strikePriceInput);
    await expect(strikePriceInput).toHaveValue(TEST_DATA.stockOptions.strikePrice.toString());

    // Verify exit price
    const exitPriceInput = page.locator(SELECTORS.stockOptions.exitPriceInput);
    await expect(exitPriceInput).toHaveValue(TEST_DATA.stockOptions.exitPricePerShare.toString());
  });

  test('should allow setting vesting and cliff periods for options', async ({ page, helpers }) => {
    await helpers.selectStockOptionsEquityType();

    // Set vesting period (Radix UI Slider: min=1, step=1)
    await helpers.setSliderValue('Vesting Period', 4, 1, 1);

    // Set cliff period (Radix UI Slider: min=0, step=1)
    await helpers.setSliderValue('Cliff Period', 1, 0, 1);
  });

  test('should allow selecting exercise strategy', async ({ page, helpers }) => {
    await helpers.selectStockOptionsEquityType();

    // Find and click the exercise strategy combobox
    const strategySection = page.getByText('Exercise Strategy').locator('..');
    const combobox = strategySection.locator('button[role="combobox"]').first();
    await combobox.click();

    // Select "At Exit"
    await page.getByRole('option', { name: 'At Exit' }).click();

    // Verify selection (button should now show "At Exit")
    await expect(combobox).toContainText('At Exit');
  });

  test('should switch between RSU and Stock Options', async ({ page, helpers }) => {
    // Start with RSU
    await helpers.selectRSUEquityType();
    await expect(page.getByText(/Total Equity Grant/i)).toBeVisible();

    // Switch to Stock Options
    await helpers.selectStockOptionsEquityType();
    await expect(page.getByText(/Number of Options/i)).toBeVisible();

    // Verify RSU fields are no longer visible
    await expect(page.getByText(/Total Equity Grant/i)).not.toBeVisible();
  });
});
