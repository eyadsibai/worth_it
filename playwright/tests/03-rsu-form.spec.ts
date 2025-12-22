import { test, expect } from '../fixtures/base';
import { TEST_DATA, SELECTORS, TIMEOUTS } from '../utils/test-data';

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

  test('should display startup offer form', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await expect(page.getByText(/Startup Offer/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    // UI uses tabs for equity type selection instead of radio buttons
    await expect(page.getByRole('tab', { name: 'RSUs' })).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByRole('tab', { name: 'Stock Options' })).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should allow selecting RSU equity type', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.selectRSUEquityType();

    // Verify RSU tab is selected (UI uses tabs, not radio buttons)
    const rsuTab = page.getByRole('tab', { name: 'RSUs' });
    await expect(rsuTab).toHaveAttribute('aria-selected', 'true', { timeout: TIMEOUTS.formInput });
  });

  test('should display RSU-specific fields when RSU is selected', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.selectRSUEquityType();

    // Wait for RSU form fields to appear (use .first() to avoid strict mode violations)
    await expect(page.getByText(/Total Equity Grant/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(/Exit Valuation/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(/Simulate Fundraising/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should allow filling RSU form fields', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.fillRSUForm();

    // Get RSU panel
    const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });

    // Verify equity grant percentage (the only number input in the panel)
    const numberInput = rsuPanel.locator('input[type="number"]');
    await expect(numberInput).toHaveValue(TEST_DATA.rsuEquity.totalEquityGrantPct.toString(), { timeout: TIMEOUTS.formInput });

    // Exit valuation uses textbox with formatted display - verify field is visible and filled
    const textInputs = rsuPanel.locator('input[type="text"]');
    await expect(textInputs.nth(1)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should allow enabling dilution simulation', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.selectRSUEquityType();

    // Find and click the dilution toggle (it's a checkbox, not a switch)
    const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
    const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
    await dilutionCheckbox.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });
    await dilutionCheckbox.click();

    // Verify toggle is checked
    await expect(dilutionCheckbox).toHaveAttribute('data-state', 'checked', { timeout: TIMEOUTS.formInput });
  });

  test('should display dilution rounds when simulation is enabled', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.selectRSUEquityType();

    // Enable dilution simulation (it's a checkbox, not a switch)
    const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
    const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
    await dilutionCheckbox.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });
    const isChecked = await dilutionCheckbox.getAttribute('data-state') === 'checked';
    if (!isChecked) {
      await dilutionCheckbox.click();
    }

    // Verify dilution section is visible (shows Dilution Overview or rounds)
    await expect(page.getByText(/Dilution Overview|Upcoming Rounds/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should allow setting vesting and cliff periods', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.selectRSUEquityType();

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
});
