import { test, expect } from '../fixtures/base';
import { TEST_DATA, SELECTORS } from '../utils/test-data';

/**
 * Test Suite: RSU Equity Form
 *
 * These tests verify that:
 * - RSU form can be selected and displayed
 * - RSU form fields accept proper input
 * - Dilution simulation can be enabled
 */

test.describe('RSU Equity Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display startup offer form', async ({ page }) => {
    await expect(page.getByText(/Startup Offer/i).first()).toBeVisible();
    await expect(page.getByText(/Equity Type/i)).toBeVisible();
  });

  test('should allow selecting RSU equity type', async ({ page, helpers }) => {
    await helpers.selectRSUEquityType();

    // Verify RSU radio is checked
    const rsuRadio = page.locator(SELECTORS.startupOffer.equityTypeRSU);
    await expect(rsuRadio).toBeChecked();
  });

  test('should display RSU-specific fields when RSU is selected', async ({ page, helpers }) => {
    await helpers.selectRSUEquityType();

    // Wait for RSU form fields to appear
    await expect(page.getByText(/Total Equity Grant/i)).toBeVisible();
    await expect(page.getByText(/Exit Valuation/i)).toBeVisible();
    await expect(page.getByText(/Simulate Dilution/i)).toBeVisible();
  });

  test('should allow filling RSU form fields', async ({ page, helpers }) => {
    await helpers.fillRSUForm();

    // Verify equity grant percentage
    const equityInput = page.locator(SELECTORS.rsu.equityGrantInput);
    await expect(equityInput).toHaveValue(TEST_DATA.rsuEquity.totalEquityGrantPct.toString());

    // Verify exit valuation
    const valuationInput = page.locator(SELECTORS.rsu.exitValuationInput);
    await expect(valuationInput).toHaveValue(TEST_DATA.rsuEquity.exitValuation.toString());
  });

  test('should allow enabling dilution simulation', async ({ page, helpers }) => {
    await helpers.selectRSUEquityType();

    // Find and click the dilution toggle
    const dilutionToggle = page.locator(SELECTORS.rsu.simulateDilutionToggle);
    await dilutionToggle.waitFor({ state: 'visible' });
    await dilutionToggle.click();

    // Verify toggle is checked
    await expect(dilutionToggle).toHaveAttribute('data-state', 'checked');
  });

  test('should display dilution rounds when simulation is enabled', async ({ page, helpers }) => {
    await helpers.selectRSUEquityType();

    // Enable dilution simulation
    const dilutionToggle = page.locator(SELECTORS.rsu.simulateDilutionToggle);
    await dilutionToggle.waitFor({ state: 'visible' });
    const isChecked = await dilutionToggle.getAttribute('data-state') === 'checked';
    if (!isChecked) {
      await dilutionToggle.click();
    }

    // Verify dilution rounds section is visible
    await expect(page.getByText(/Dilution Rounds/i)).toBeVisible();
  });

  test('should allow setting vesting and cliff periods', async ({ page, helpers }) => {
    await helpers.selectRSUEquityType();

    // Set vesting period (Radix UI Slider: min=1, step=1)
    await helpers.setSliderValue('Vesting Period', 4, 1, 1);

    // Set cliff period (Radix UI Slider: min=0, step=1)
    await helpers.setSliderValue('Cliff Period', 1, 0, 1);
  });
});
