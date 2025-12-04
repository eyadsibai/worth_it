import { test, expect } from '../fixtures/base';
import { TEST_DATA } from '../utils/test-data';

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
    await expect(page.getByText(/Global Settings/i).first()).toBeVisible();
    await expect(page.getByText(/Exit Year/i)).toBeVisible();
  });

  test('should allow setting exit year', async ({ page, helpers }) => {
    await helpers.fillGlobalSettings(7);

    // Verify the slider value
    const slider = page.locator('input[name="exit_year"]');
    await expect(slider).toHaveValue('7');
  });

  test('should update exit year within valid range', async ({ page, helpers }) => {
    // Test minimum value
    await helpers.fillGlobalSettings(3);
    const slider = page.locator('input[name="exit_year"]');
    await expect(slider).toHaveValue('3');

    // Test maximum value
    await helpers.fillGlobalSettings(10);
    await expect(slider).toHaveValue('10');
  });
});

test.describe('Current Job Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display current job form', async ({ page }) => {
    await expect(page.getByText(/Current Job/i).first()).toBeVisible();
    await expect(page.getByText(/Monthly Salary/i).first()).toBeVisible();
  });

  test('should allow filling all current job fields', async ({ page, helpers }) => {
    await helpers.fillCurrentJobForm();

    // Verify all fields are filled
    const salaryInput = page.locator('input[name="monthly_salary"]').first();
    await expect(salaryInput).toHaveValue(TEST_DATA.currentJob.monthlySalary.toString());

    const growthInput = page.locator('input[name="annual_salary_growth_rate"]');
    await expect(growthInput).toHaveValue(TEST_DATA.currentJob.annualSalaryGrowthRate.toString());

    const roiInput = page.locator('input[name="assumed_annual_roi"]');
    await expect(roiInput).toHaveValue(TEST_DATA.currentJob.assumedAnnualROI.toString());
  });

  test('should accept numeric input for salary', async ({ page }) => {
    const salaryInput = page.locator('input[name="monthly_salary"]').first();
    await salaryInput.fill('20000');
    await expect(salaryInput).toHaveValue('20000');
  });

  test('should accept decimal values for percentages', async ({ page }) => {
    const growthInput = page.locator('input[name="annual_salary_growth_rate"]');
    await growthInput.fill('3.5');
    await expect(growthInput).toHaveValue('3.5');

    const roiInput = page.locator('input[name="assumed_annual_roi"]');
    await roiInput.fill('7.5');
    await expect(roiInput).toHaveValue('7.5');
  });
});
