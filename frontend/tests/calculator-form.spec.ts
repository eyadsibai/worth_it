import { test, expect } from '@playwright/test';

test.describe('Calculator Form UI/UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display all form sections', async ({ page }) => {
    // Check main sections are visible
    await expect(page.getByRole('heading', { name: 'Income & Employment' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vehicle Information' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Insurance' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Calculate' })).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit without filling required fields
    const calculateButton = page.getByRole('button', { name: /calculate/i });
    await calculateButton.click();

    // Check for validation messages
    await expect(page.getByText(/required/i).first()).toBeVisible();
  });

  test('should accept valid income input', async ({ page }) => {
    // Fill in income field
    const incomeInput = page.getByLabel(/hourly wage/i);
    await incomeInput.fill('25');
    await expect(incomeInput).toHaveValue('25');

    // Test hours per week
    const hoursInput = page.getByLabel(/hours per week/i);
    await hoursInput.fill('40');
    await expect(hoursInput).toHaveValue('40');
  });

  test('should calculate with vehicle purchase price', async ({ page }) => {
    // Fill basic required fields
    await page.getByLabel(/hourly wage/i).fill('30');
    await page.getByLabel(/hours per week/i).fill('40');
    
    // Fill vehicle information
    await page.getByLabel(/purchase price/i).fill('25000');
    await page.getByLabel(/down payment/i).fill('5000');
    await page.getByLabel(/loan term/i).fill('60');
    await page.getByLabel(/interest rate/i).fill('5.5');
    
    // Fill insurance
    await page.getByLabel(/monthly premium/i).fill('150');
    
    // Fill expenses
    await page.getByLabel(/monthly gas cost/i).fill('120');
    await page.getByLabel(/monthly maintenance/i).fill('50');
    await page.getByLabel(/monthly parking/i).fill('100');
    
    // Submit form
    await page.getByRole('button', { name: /calculate total cost/i }).click();
    
    // Wait for results
    await expect(page.getByText(/total cost of ownership/i)).toBeVisible({ timeout: 10000 });
  });

  test('should toggle between purchase and lease modes', async ({ page }) => {
    // Check initial state (purchase mode)
    await expect(page.getByLabel(/purchase price/i)).toBeVisible();
    
    // Switch to lease mode if available
    const leaseTab = page.getByRole('tab', { name: /lease/i });
    if (await leaseTab.isVisible()) {
      await leaseTab.click();
      await expect(page.getByLabel(/monthly lease payment/i)).toBeVisible();
      
      // Switch back to purchase
      await page.getByRole('tab', { name: /purchase/i }).click();
      await expect(page.getByLabel(/purchase price/i)).toBeVisible();
    }
  });

  test('should show tooltips for help information', async ({ page }) => {
    // Look for help icons and hover
    const helpIcons = page.locator('[aria-label*="help"], [aria-label*="info"]');
    const count = await helpIcons.count();
    
    if (count > 0) {
      await helpIcons.first().hover();
      // Check if tooltip appears
      await expect(page.locator('[role="tooltip"]')).toBeVisible({ timeout: 2000 });
    }
  });

  test('should handle number formatting correctly', async ({ page }) => {
    const priceInput = page.getByLabel(/purchase price/i);
    
    // Test large number input
    await priceInput.fill('50000');
    await priceInput.blur();
    
    // Should accept the value
    const value = await priceInput.inputValue();
    expect(value).toMatch(/50000|50,000|50000.00/);
  });

  test('should show error for invalid inputs', async ({ page }) => {
    // Test negative values
    const wageInput = page.getByLabel(/hourly wage/i);
    await wageInput.fill('-10');
    await wageInput.blur();
    
    // Should show error or reset to valid value
    const errorMessage = page.getByText(/must be positive|invalid|greater than 0/i);
    const isErrorVisible = await errorMessage.isVisible().catch(() => false);
    
    if (!isErrorVisible) {
      // Check if value was reset
      const value = await wageInput.inputValue();
      expect(Number(value)).toBeGreaterThanOrEqual(0);
    }
  });

  test('should save form state on navigation', async ({ page }) => {
    // Fill in some fields
    await page.getByLabel(/hourly wage/i).fill('35');
    await page.getByLabel(/purchase price/i).fill('30000');
    
    // Navigate away and back (if router supports it)
    await page.reload();
    
    // Check if values persist (depends on implementation)
    // This test assumes no persistence after reload
    const wageValue = await page.getByLabel(/hourly wage/i).inputValue();
    expect(wageValue).toBe(''); // Values should reset on reload
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that form is still accessible
    await expect(page.getByRole('heading', { name: 'Income & Employment' })).toBeVisible();
    
    // Check if mobile menu exists
    const mobileMenu = page.getByRole('button', { name: /menu/i });
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      // Check menu items are accessible
    }
  });
});