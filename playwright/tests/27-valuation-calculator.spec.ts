import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Valuation Calculator
 *
 * Tests the startup valuation calculator feature including:
 * - Page load and navigation
 * - Revenue Multiple method
 * - DCF method
 * - VC Method
 * - Method comparison
 * - API integration
 */

test.describe('Valuation Calculator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/valuation');
  });

  test.describe('Page Load', () => {
    test('should load the valuation page', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /Valuation Calculator/i })).toBeVisible();
    });

    test('should display method tabs', async ({ page }) => {
      await expect(page.getByRole('tab', { name: /Revenue/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /DCF/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /VC/i })).toBeVisible();
    });

    test('should show Revenue Multiple form by default', async ({ page }) => {
      // Revenue Multiple tab should be active by default
      const revenueTab = page.getByRole('tab', { name: /Revenue/i });
      await expect(revenueTab).toHaveAttribute('data-state', 'active');

      // Should show Revenue Multiple form fields
      await expect(page.getByText(/Annual Revenue/i)).toBeVisible();
      await expect(page.getByText(/Revenue Multiple/i)).toBeVisible();
    });
  });

  test.describe('Revenue Multiple Method', () => {
    test('should accept revenue and multiple inputs', async ({ page }) => {
      // Find and fill revenue input
      const revenueInput = page.locator('input[name="annualRevenue"]');
      await revenueInput.fill('1000000');

      // Find and fill multiple input
      const multipleInput = page.locator('input[name="revenueMultiple"]');
      await multipleInput.fill('10');

      // Verify values are set
      await expect(revenueInput).toHaveValue('1000000');
      await expect(multipleInput).toHaveValue('10');
    });

    test('should calculate valuation on submit', async ({ page }) => {
      // Fill in the form
      await page.locator('input[name="annualRevenue"]').fill('1000000');
      await page.locator('input[name="revenueMultiple"]').fill('10');

      // Click calculate button
      await page.getByRole('button', { name: /Calculate Valuation/i }).click();

      // Wait for result
      await expect(page.getByText(/\$10,000,000/)).toBeVisible({ timeout: 10000 });
    });

    test('should show confidence level', async ({ page }) => {
      await page.locator('input[name="annualRevenue"]').fill('1000000');
      await page.locator('input[name="revenueMultiple"]').fill('10');
      await page.getByRole('button', { name: /Calculate Valuation/i }).click();

      // Should show confidence percentage
      await expect(page.getByText(/confidence/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('DCF Method', () => {
    test.beforeEach(async ({ page }) => {
      // Click DCF tab
      await page.getByRole('tab', { name: /DCF/i }).click();
    });

    test('should show DCF form fields', async ({ page }) => {
      await expect(page.getByText(/Projected Free Cash Flows/i)).toBeVisible();
      await expect(page.getByText(/Discount Rate/i)).toBeVisible();
    });

    test('should allow adding cash flow years', async ({ page }) => {
      // Count initial cash flow inputs
      const initialInputs = await page.locator('input[name^="projectedCashFlows"]').count();

      // Click Add Year button
      const addButton = page.getByRole('button', { name: /Add Year/i });
      await addButton.click();

      // Should have one more cash flow input
      const newInputs = await page.locator('input[name^="projectedCashFlows"]').count();
      expect(newInputs).toBe(initialInputs + 1);
    });

    test('should calculate DCF valuation', async ({ page }) => {
      // Fill discount rate
      await page.locator('input[name="discountRate"]').fill('12');

      // Click calculate
      await page.getByRole('button', { name: /Calculate Valuation/i }).click();

      // Should show valuation result card with DCF method indicator
      await expect(page.getByText(/DCF/i)).toBeVisible({ timeout: 10000 });
      // Should show a dollar amount result
      await expect(page.getByText(/\$[\d,]+/)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('VC Method', () => {
    test.beforeEach(async ({ page }) => {
      // Click VC Method tab
      await page.getByRole('tab', { name: /VC/i }).click();
    });

    test('should show VC Method form fields', async ({ page }) => {
      await expect(page.getByText(/Projected Exit Value/i)).toBeVisible();
      await expect(page.getByText(/Exit Year/i)).toBeVisible();
      await expect(page.getByText(/Return Target Type/i)).toBeVisible();
    });

    test('should calculate VC method valuation', async ({ page }) => {
      // Fill exit value
      await page.locator('input[name="projectedExitValue"]').fill('100000000');

      // Fill exit year
      await page.locator('input[name="exitYear"]').fill('5');

      // Fill target return
      await page.locator('input[name="targetReturnMultiple"]').fill('10');

      // Fill dilution
      await page.locator('input[name="expectedDilution"]').fill('30');

      // Fill exit probability
      await page.locator('input[name="exitProbability"]').fill('30');

      // Click calculate
      await page.getByRole('button', { name: /Calculate Valuation/i }).click();

      // Should show valuation result with notes
      await expect(page.getByText(/Valuation/i)).toBeVisible({ timeout: 10000 });
    });

    test('should switch between multiple and IRR target types', async ({ page }) => {
      // Find and click the return type select
      const selectTrigger = page.locator('[name="returnType"]');
      await selectTrigger.click();

      // Select IRR option
      await page.getByText(/Target IRR/i).click();

      // Should now show IRR input instead of multiple
      await expect(page.locator('input[name="targetIRR"]')).toBeVisible();

      // Fill IRR value and verify calculation works
      await page.locator('input[name="targetIRR"]').fill('50');
      await page.getByRole('button', { name: /Calculate Valuation/i }).click();

      // Should show valuation result with dollar amount
      await expect(page.getByText(/\$[\d,]+/)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Method Comparison', () => {
    test('should compare all methods', async ({ page }) => {
      // Fill Revenue Multiple form
      await page.locator('input[name="annualRevenue"]').fill('1000000');
      await page.locator('input[name="revenueMultiple"]').fill('10');

      // Click Compare All Methods button
      await page.getByRole('button', { name: /Compare All Methods/i }).click();

      // Should show comparison view
      await expect(page.getByText(/Valuation Comparison/i)).toBeVisible({ timeout: 15000 });
    });

    test('should show insights in comparison', async ({ page }) => {
      // Fill Revenue Multiple form
      await page.locator('input[name="annualRevenue"]').fill('1000000');
      await page.locator('input[name="revenueMultiple"]').fill('10');

      // Click Compare All Methods
      await page.getByRole('button', { name: /Compare All Methods/i }).click();

      // Should show insights section
      await expect(page.getByText(/Insights/i)).toBeVisible({ timeout: 15000 });
    });

    test('should show min/max/average valuations', async ({ page }) => {
      // Fill Revenue Multiple form
      await page.locator('input[name="annualRevenue"]').fill('1000000');
      await page.locator('input[name="revenueMultiple"]').fill('10');

      // Click Compare All Methods
      await page.getByRole('button', { name: /Compare All Methods/i }).click();

      // Should show statistics
      await expect(page.getByText(/Minimum/i)).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/Maximum/i)).toBeVisible({ timeout: 15000 });
    });
  });

  test.describe('API Integration', () => {
    test('should call revenue-multiple API endpoint', async ({ page, request }) => {
      // Direct API test
      const response = await request.post('http://localhost:8000/api/valuation/revenue-multiple', {
        data: {
          annual_revenue: 1000000,
          revenue_multiple: 10,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.method).toBe('revenue_multiple');
      expect(data.valuation).toBe(10000000);
    });

    test('should call dcf API endpoint', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/dcf', {
        data: {
          projected_cash_flows: [500000, 750000, 1000000],
          discount_rate: 0.12,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.method).toBe('dcf');
      expect(data.valuation).toBeGreaterThan(0);
    });

    test('should call vc-method API endpoint', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/vc-method', {
        data: {
          projected_exit_value: 100000000,
          exit_year: 5,
          target_return_multiple: 10,
          expected_dilution: 0.3,
          exit_probability: 0.3,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.method).toBe('vc_method');
      expect(data.valuation).toBeGreaterThan(0);
    });

    test('should call compare API endpoint', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/compare', {
        data: {
          revenue_multiple: {
            annual_revenue: 1000000,
            revenue_multiple: 10,
          },
          dcf: {
            projected_cash_flows: [500000, 750000, 1000000],
            discount_rate: 0.12,
          },
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.results).toHaveLength(2);
      expect(data.min_valuation).toBeGreaterThan(0);
      expect(data.max_valuation).toBeGreaterThan(0);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid revenue (negative)', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/revenue-multiple', {
        data: {
          annual_revenue: -1000,
          revenue_multiple: 10,
        },
      });

      expect(response.status()).toBe(422);
    });

    test('should handle invalid multiple (zero)', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/revenue-multiple', {
        data: {
          annual_revenue: 1000000,
          revenue_multiple: 0,
        },
      });

      expect(response.status()).toBe(422);
    });

    test('should require at least one method for compare', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/compare', {
        data: {},
      });

      expect(response.status()).toBe(422);
    });
  });

  test.describe('Navigation', () => {
    test('should be accessible from header nav', async ({ page }) => {
      // Go to home first
      await page.goto('/');

      // Click Valuation link in header
      await page.getByRole('link', { name: /Valuation/i }).click();

      // Should navigate to valuation page
      await expect(page).toHaveURL(/valuation/);
      await expect(page.getByRole('heading', { name: /Valuation Calculator/i })).toBeVisible();
    });
  });
});
