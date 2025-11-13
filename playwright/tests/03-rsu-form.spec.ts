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
    
    // Wait for RSU form to appear
    await page.waitForTimeout(500);
    
    // Verify RSU-specific fields are visible
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
    await page.waitForTimeout(500);
    
    // Find and click the dilution toggle
    const dilutionToggle = page.locator(SELECTORS.rsu.simulateDilutionToggle);
    await dilutionToggle.click();
    
    // Verify toggle is checked
    await expect(dilutionToggle).toHaveAttribute('data-state', 'checked');
  });

  test('should display dilution rounds when simulation is enabled', async ({ page, helpers }) => {
    await helpers.selectRSUEquityType();
    await page.waitForTimeout(500);
    
    // Enable dilution simulation
    const dilutionToggle = page.locator(SELECTORS.rsu.simulateDilutionToggle);
    const isChecked = await dilutionToggle.getAttribute('data-state') === 'checked';
    if (!isChecked) {
      await dilutionToggle.click();
    }
    
    // Wait a bit for the dilution rounds section to appear
    await page.waitForTimeout(500);
    
    // Verify dilution rounds section is visible
    await expect(page.getByText(/Dilution Rounds/i)).toBeVisible();
  });

  test('should allow setting vesting and cliff periods', async ({ page, helpers }) => {
    await helpers.selectRSUEquityType();
    await page.waitForTimeout(500);
    
    // Set vesting period
    const vestingSlider = page.locator(SELECTORS.rsu.vestingPeriodSlider);
    await vestingSlider.fill('4');
    await expect(vestingSlider).toHaveValue('4');
    
    // Set cliff period
    const cliffSlider = page.locator(SELECTORS.rsu.cliffPeriodSlider);
    await cliffSlider.fill('1');
    await expect(cliffSlider).toHaveValue('1');
  });
});
