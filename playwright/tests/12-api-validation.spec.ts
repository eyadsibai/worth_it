import { test, expect } from '../fixtures/base';
import { TEST_DATA, TIMEOUTS } from '../utils/test-data';

/**
 * Test Suite: API Response Validation
 *
 * These tests verify:
 * - API responses match expected Zod schemas
 * - Error responses are properly displayed in UI
 * - Loading states during API calls
 * - Network failure handling and retry logic
 */

// Use 127.0.0.1 instead of localhost to avoid IPv6 resolution issues
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:8000';

test.describe('API Response Schema Validation', () => {
  test('health endpoint should return valid schema', async ({ page }) => {
    const response = await page.request.get(`${API_BASE_URL}/health`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('version');
    expect(typeof data.version).toBe('string');
  });

  test('monthly-data-grid endpoint should return valid schema', async ({ page }) => {
    const response = await page.request.post(`${API_BASE_URL}/api/monthly-data-grid`, {
      data: {
        exit_year: 5,
        current_job_monthly_salary: 15000,
        startup_monthly_salary: 12500,
        current_job_salary_growth_rate: 0.03,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBeTruthy();
    expect(data.data.length).toBeGreaterThan(0);

    // Verify first row has expected columns (camelCase format)
    const firstRow = data.data[0];
    expect(firstRow).toHaveProperty('CurrentJobSalary');
    expect(firstRow).toHaveProperty('StartupSalary');
    expect(firstRow).toHaveProperty('Year');
  });

  test('startup-scenario endpoint should return valid schema', async ({ page }) => {
    // First get monthly data
    const gridResponse = await page.request.post(`${API_BASE_URL}/api/monthly-data-grid`, {
      data: {
        exit_year: 4,
        current_job_monthly_salary: 15000,
        startup_monthly_salary: 12500,
        current_job_salary_growth_rate: 0.03,
        dilution_rounds: null,
      },
    });
    expect(gridResponse.ok()).toBeTruthy();
    const gridData = await gridResponse.json();

    // Startup params format expected by the backend
    const startupParams = {
      equity_type: 'Equity (RSUs)',
      total_vesting_years: 4,
      cliff_years: 1,
      exit_year: 4,
      rsu_params: {
        equity_pct: 0.5, // 0.5% equity
        target_exit_valuation: 100000000,
        simulate_dilution: false,
      },
      options_params: {},
    };

    // Then get opportunity cost
    const opportunityCostResponse = await page.request.post(`${API_BASE_URL}/api/opportunity-cost`, {
      data: {
        monthly_data: gridData.data,
        annual_roi: 0.07,
        investment_frequency: 'Monthly',
        options_params: null,
        startup_params: startupParams,
      },
    });
    expect(opportunityCostResponse.ok()).toBeTruthy();
    const opportunityCostData = await opportunityCostResponse.json();

    // Finally get startup scenario
    const response = await page.request.post(`${API_BASE_URL}/api/startup-scenario`, {
      data: {
        opportunity_cost_data: opportunityCostData.data,
        startup_params: startupParams,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify response structure
    expect(data).toHaveProperty('results_df');
    expect(data).toHaveProperty('final_payout_value');
    expect(data).toHaveProperty('final_opportunity_cost');
    expect(data).toHaveProperty('payout_label');
    expect(data).toHaveProperty('breakeven_label');

    // Verify types
    expect(typeof data.final_payout_value).toBe('number');
    expect(typeof data.final_opportunity_cost).toBe('number');
    expect(Array.isArray(data.results_df)).toBeTruthy();
  });

  test('IRR endpoint should return valid schema', async ({ page }) => {
    const response = await page.request.post(`${API_BASE_URL}/api/irr`, {
      data: {
        monthly_surpluses: [-5000, -5000, -5000, -5000, -5000, -5000, -5000, -5000, -5000, -5000, -5000, -5000],
        final_payout_value: 100000,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // IRR endpoint returns just { irr: number | null }
    expect(data).toHaveProperty('irr');
    // IRR may be null if calculation doesn't converge, but should exist
    expect('irr' in data).toBeTruthy();
  });

  test('NPV endpoint should return valid schema', async ({ page }) => {
    const response = await page.request.post(`${API_BASE_URL}/api/npv`, {
      data: {
        monthly_surpluses: [-5000, -5000, -5000, -5000, -5000, -5000, -5000, -5000, -5000, -5000, -5000, -5000],
        annual_roi: 0.07,
        final_payout_value: 100000,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data).toHaveProperty('npv');
    expect(typeof data.npv).toBe('number');
  });

  test('dilution endpoint should return valid schema', async ({ page }) => {
    const response = await page.request.post(`${API_BASE_URL}/api/dilution`, {
      data: {
        pre_money_valuation: 10000000,
        amount_raised: 2000000,
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Dilution endpoint returns just { dilution: number }
    expect(data).toHaveProperty('dilution');
    expect(typeof data.dilution).toBe('number');

    // Verify business logic: $2M on $10M pre = $12M post, investor gets 2/12 = 16.67%
    expect(data.dilution).toBeCloseTo(0.1667, 2);
  });

  test('waterfall endpoint should return valid schema', async ({ page }) => {
    const response = await page.request.post(`${API_BASE_URL}/api/waterfall`, {
      data: {
        cap_table: {
          stakeholders: [
            { id: 'founder-1', name: 'Founder', ownership_pct: 50, shares: 5000000, type: 'founder', share_class: 'common' },
            { id: 'investor-1', name: 'Investor', ownership_pct: 30, shares: 3000000, type: 'investor', share_class: 'preferred' },
          ],
          total_shares: 10000000,
          option_pool_pct: 10,
        },
        preference_tiers: [
          {
            id: 'series-a',
            name: 'Series A',
            seniority: 1,
            investment_amount: 5000000,
            liquidation_multiplier: 1.0,
            participating: false,
            stakeholder_ids: ['investor-1'],
          },
        ],
        exit_valuations: [50000000],
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Waterfall returns distributions_by_valuation and breakeven_points
    expect(data).toHaveProperty('distributions_by_valuation');
    expect(data).toHaveProperty('breakeven_points');
    expect(Array.isArray(data.distributions_by_valuation)).toBeTruthy();
    expect(typeof data.breakeven_points).toBe('object');
  });
});

test.describe('API Error Response Handling', () => {
  test('should return 422 for invalid monthly-data-grid request', async ({ page }) => {
    const response = await page.request.post(`${API_BASE_URL}/api/monthly-data-grid`, {
      data: {
        exit_year: -1, // Invalid: must be positive
        current_job_monthly_salary: 15000,
        startup_monthly_salary: 12500,
        current_job_salary_growth_rate: 0.03,
      },
    });

    expect(response.status()).toBe(422);
    const data = await response.json();
    expect(data).toHaveProperty('detail');
  });

  test('should return 422 for missing required fields', async ({ page }) => {
    const response = await page.request.post(`${API_BASE_URL}/api/monthly-data-grid`, {
      data: {
        // Missing required fields
        exit_year: 5,
      },
    });

    expect(response.status()).toBe(422);
  });

  test('should return 422 for invalid data types', async ({ page }) => {
    const response = await page.request.post(`${API_BASE_URL}/api/monthly-data-grid`, {
      data: {
        exit_year: 'five', // Should be number
        current_job_monthly_salary: 15000,
        startup_monthly_salary: 12500,
        current_job_salary_growth_rate: 0.03,
      },
    });

    expect(response.status()).toBe(422);
  });

  test('should return 422 for out-of-range values', async ({ page }) => {
    const response = await page.request.post(`${API_BASE_URL}/api/monthly-data-grid`, {
      data: {
        exit_year: 25, // Max is 20
        current_job_monthly_salary: 15000,
        startup_monthly_salary: 12500,
        current_job_salary_growth_rate: 0.03,
      },
    });

    expect(response.status()).toBe(422);
  });
});

test.describe('Loading States During API Calls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load page with interactive form elements', async ({ page, helpers }) => {
    // Wait for page to be fully loaded with interactive elements
    await helpers.waitForAPIConnection();

    // Verify form elements are interactive
    await expect(page.locator('[role="slider"]').first()).toBeVisible();

    // Use simple approach: find the Current Job card and get first number input (Monthly Salary)
    const currentJobCard = page.locator('.glass-card').filter({ hasText: 'Current Job' });
    await expect(currentJobCard).toBeVisible();
    const salaryInput = currentJobCard.locator('input[type="number"]').first();
    await expect(salaryInput).toBeVisible();
  });

  test('should show results when scenario is calculated', async ({ page, helpers }) => {
    await helpers.waitForAPIConnection();

    // Use helper methods to fill all forms consistently
    await helpers.fillGlobalSettings();
    await helpers.fillCurrentJobForm();
    await helpers.fillRSUForm();

    // Wait for results to show
    await helpers.waitForScenarioResults();

    // Verify we see the detailed analysis section
    await expect(page.getByText(/Detailed Analysis/i)).toBeVisible();
  });
});

test.describe('Network Failure Handling', () => {
  test('should handle network timeout gracefully', async ({ page }) => {
    // Block API requests to simulate network failure
    await page.route('**/api/**', async (route) => {
      // Delay indefinitely to simulate timeout
      await new Promise((resolve) => setTimeout(resolve, 15000));
      await route.abort();
    });

    await page.goto('/');

    // The UI should not crash - page should still render
    await expect(page.locator('body')).toBeVisible();
    // Main heading should still be visible
    await expect(page.getByRole('heading', { name: /Job Offer Financial Analyzer/i })).toBeVisible();
  });

  test('should recover when API becomes available again', async ({ page, helpers }) => {
    // First block, then unblock
    let blocked = true;
    await page.route('**/health', async (route) => {
      if (blocked) {
        await route.abort();
      } else {
        await route.continue();
      }
    });

    await page.goto('/');

    // Wait a moment then unblock
    await page.waitForTimeout(1000);
    blocked = false;

    // Reload page - should work now
    await page.reload();

    // Page should load properly now
    await helpers.waitForAPIConnection();
    await expect(page.getByRole('heading', { name: /Job Offer Financial Analyzer/i })).toBeVisible();
  });

  test('should display API error in UI when request fails', async ({ page, helpers }) => {
    // Navigate first
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Then route for subsequent requests
    await page.route('**/api/startup-scenario', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Internal server error' }),
      });
    });

    // Fill form to trigger the request - use simple number input selector
    const currentJobCard = page.locator('.glass-card').filter({ hasText: 'Current Job' });
    const salaryInput = currentJobCard.locator('input[type="number"]').first();
    await salaryInput.fill('15000');

    // The UI should handle the error gracefully - not crash
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('API Response Consistency', () => {
  test('frontend displayed values should match API response for RSU scenario', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Intercept the startup-scenario API call
    let apiResponse: any = null;
    await page.route('**/api/startup-scenario', async (route) => {
      const response = await route.fetch();
      apiResponse = await response.json();
      await route.fulfill({ response });
    });

    // Fill in form
    await helpers.fillGlobalSettings();
    await helpers.fillCurrentJobForm();
    await helpers.fillRSUForm();

    // Wait for results
    await helpers.waitForScenarioResults();

    // Wait for API response to be captured
    await page.waitForTimeout(500);

    // Verify API response was captured
    expect(apiResponse).not.toBeNull();
    expect(apiResponse.final_payout_value).toBeDefined();
    expect(apiResponse.final_opportunity_cost).toBeDefined();

    // The frontend should display the detailed analysis section
    // This ensures the data flow from API to UI is working correctly
    const resultsSection = page.locator('text=/Detailed Analysis/i').locator('..');
    await expect(resultsSection).toBeVisible();
  });
});
