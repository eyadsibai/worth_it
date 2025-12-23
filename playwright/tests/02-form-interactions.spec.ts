import { test, expect } from '../fixtures/base';
import { TEST_DATA, TIMEOUTS } from '../utils/test-data';

/**
 * Test Suite: Form Interactions
 *
 * These tests verify that:
 * - Global settings form works correctly
 * - Current job form accepts and validates input
 * - Form values are properly updated
 */

test.describe('Global Settings Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display global settings form', async ({ page }) => {
    await expect(page.getByText(/Global Settings/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(/Exit Year/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should allow setting exit year', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.fillGlobalSettings(7);

    // Verify the slider value - the helper already verifies this,
    // but we double-check using the correct selector pattern
    const label = page.getByText('Exit Year', { exact: true });
    const formItem = page.locator('[data-slot="form-item"]').filter({ has: label });
    const slider = formItem.locator('[role="slider"]');
    await expect(slider).toHaveAttribute('aria-valuenow', '7', { timeout: TIMEOUTS.formInput });
  });

  test('should update exit year within valid range', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();

    // Radix UI sliders use aria-valuenow - use data-slot from shadcn/ui FormItem
    const exitYearLabel = page.getByText('Exit Year', { exact: true });
    const formItem = page.locator('[data-slot="form-item"]').filter({ has: exitYearLabel });
    const slider = formItem.locator('[role="slider"]');

    // Test minimum value
    await helpers.fillGlobalSettings(3);
    await expect(slider).toHaveAttribute('aria-valuenow', '3', { timeout: TIMEOUTS.formInput });

    // Test maximum value
    await helpers.fillGlobalSettings(10);
    await expect(slider).toHaveAttribute('aria-valuenow', '10', { timeout: TIMEOUTS.formInput });
  });
});

test.describe('Current Job Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display current job form', async ({ page }) => {
    await expect(page.getByText(/Current Job/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(/Monthly Salary/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should allow filling all current job fields', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();
    await helpers.fillCurrentJobForm();

    // Scope to Current Job card
    const currentJobCard = page.locator('.terminal-card').filter({ hasText: 'Current Job' });

    // Verify salary input is filled (uses formatDisplay=true so value includes commas)
    const salaryInput = currentJobCard.getByRole('textbox', { name: 'e.g. 12,000' });
    // formatDisplay adds thousand separators, so check formatted value
    await expect(salaryInput).toHaveValue(TEST_DATA.currentJob.monthlySalary.toLocaleString(), { timeout: TIMEOUTS.formInput });

    // Growth rate and ROI are Radix UI sliders - verify using aria-valuenow with data-slot
    const growthLabel = page.getByText('Annual Salary Growth Rate', { exact: true });
    const growthFormItem = page.locator('[data-slot="form-item"]').filter({ has: growthLabel });
    const growthSlider = growthFormItem.locator('[role="slider"]');
    await expect(growthSlider).toHaveAttribute('aria-valuenow', TEST_DATA.currentJob.annualSalaryGrowthRate.toString(), { timeout: TIMEOUTS.formInput });

    const roiLabel = page.getByText('Assumed Annual ROI', { exact: true });
    const roiFormItem = page.locator('[data-slot="form-item"]').filter({ has: roiLabel });
    const roiSlider = roiFormItem.locator('[role="slider"]');
    await expect(roiSlider).toHaveAttribute('aria-valuenow', TEST_DATA.currentJob.assumedAnnualROI.toString(), { timeout: TIMEOUTS.formInput });
  });

  test('should accept numeric input for salary', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();

    // Scope to Current Job card - salary uses formatDisplay=true so it's a textbox
    const currentJobCard = page.locator('.terminal-card').filter({ hasText: 'Current Job' });
    const salaryInput = currentJobCard.getByRole('textbox', { name: 'e.g. 12,000' });
    await salaryInput.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    await salaryInput.click();
    // Triple-click to select all (works cross-platform)
    await salaryInput.click({ clickCount: 3 });
    await page.keyboard.type('20000');
    await expect(salaryInput).toHaveValue('20000', { timeout: TIMEOUTS.formInput });
  });

  test('should accept decimal values for percentages', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();

    // Growth rate and ROI are Radix UI sliders, not number inputs
    // Test that sliders can handle the expected range by setting values
    await helpers.setSliderValue('Annual Salary Growth Rate', 3.5, 0, 0.1);
    const growthLabel = page.getByText('Annual Salary Growth Rate', { exact: true });
    const growthFormItem = page.locator('[data-slot="form-item"]').filter({ has: growthLabel });
    const growthSlider = growthFormItem.locator('[role="slider"]');
    await expect(growthSlider).toHaveAttribute('aria-valuenow', '3.5', { timeout: TIMEOUTS.formInput });

    await helpers.setSliderValue('Assumed Annual ROI', 7.5, 0, 0.1);
    const roiLabel = page.getByText('Assumed Annual ROI', { exact: true });
    const roiFormItem = page.locator('[data-slot="form-item"]').filter({ has: roiLabel });
    const roiSlider = roiFormItem.locator('[role="slider"]');
    await expect(roiSlider).toHaveAttribute('aria-valuenow', '7.5', { timeout: TIMEOUTS.formInput });
  });
});
