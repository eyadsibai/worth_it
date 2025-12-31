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
      await expect(page.getByRole('tab', { name: /Chicago/i })).toBeVisible();
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

      // FastAPI returns 400 for validation errors
      expect(response.status()).toBe(400);
    });

    test('should handle invalid multiple (zero)', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/revenue-multiple', {
        data: {
          annual_revenue: 1000000,
          revenue_multiple: 0,
        },
      });

      // FastAPI returns 400 for validation errors
      expect(response.status()).toBe(400);
    });

    test('should require at least one method for compare', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/compare', {
        data: {},
      });

      // FastAPI returns 400 for validation errors
      expect(response.status()).toBe(400);
    });
  });

  test.describe('First Chicago Method', () => {
    test.beforeEach(async ({ page }) => {
      // Click First Chicago tab
      await page.getByRole('tab', { name: /Chicago/i }).click();
    });

    test('should show First Chicago tab', async ({ page }) => {
      // First Chicago tab should exist and be clickable
      await expect(page.getByRole('tab', { name: /Chicago/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /Chicago/i })).toHaveAttribute('data-state', 'active');
    });

    test('should show scenario fields', async ({ page }) => {
      await expect(page.getByText('Scenarios', { exact: true })).toBeVisible();
      await expect(page.getByText('Discount Rate', { exact: true })).toBeVisible();
      await expect(page.getByText('Total Probability:')).toBeVisible();
    });

    test('should display default three scenarios', async ({ page }) => {
      // Should show Best, Base, and Worst cases by default (as input values)
      const scenarioInputs = page.getByRole('textbox', { name: 'Scenario Name' });
      await expect(scenarioInputs).toHaveCount(3);
      await expect(scenarioInputs.nth(0)).toHaveValue('Best Case');
      await expect(scenarioInputs.nth(1)).toHaveValue('Base Case');
      await expect(scenarioInputs.nth(2)).toHaveValue('Worst Case');
    });

    test('should show probability sum indicator', async ({ page }) => {
      // Default scenarios should sum to 100%
      await expect(page.getByText('100.0%')).toBeVisible();
    });

    test('should allow adding a new scenario', async ({ page }) => {
      // Click Add Scenario button
      await page.getByRole('button', { name: /Add Scenario/i }).click();

      // Should have 4 scenarios now (Scenario 4 is the name in the input)
      const scenarioInputs = page.getByRole('textbox', { name: 'Scenario Name' });
      await expect(scenarioInputs).toHaveCount(4);
      await expect(scenarioInputs.nth(3)).toHaveValue('Scenario 4');
    });

    test('should allow removing a scenario', async ({ page }) => {
      // Count initial scenarios (should be 3)
      const initialCount = await page.locator('text=Exit Value').count();

      // Find and click the first remove button
      const removeButtons = page.locator('button:has(svg.lucide-trash-2)');
      await removeButtons.first().click();

      // Should have one less scenario
      const newCount = await page.locator('text=Exit Value').count();
      expect(newCount).toBe(initialCount - 1);
    });

    test('should calculate First Chicago valuation', async ({ page }) => {
      // Discount rate is already 25% by default, just click calculate
      await page.getByRole('button', { name: /Calculate Valuation/i }).click();

      // Should show result card with "First Chicago Method" header (exact match to avoid matching explanation)
      await expect(page.getByText('First Chicago Method', { exact: true })).toBeVisible({ timeout: 10000 });
      // Should show the present value amount
      await expect(page.getByText('$7,782,400')).toBeVisible({ timeout: 10000 });
      // Should show weighted value
      await expect(page.getByText('$23,750,000')).toBeVisible({ timeout: 10000 });
    });

    test('should show scenario breakdown in results', async ({ page }) => {
      // Calculate with defaults
      await page.getByRole('button', { name: /Calculate Valuation/i }).click();

      // Should show scenario breakdown section
      await expect(page.getByText(/Scenario Breakdown/i)).toBeVisible({ timeout: 10000 });
      // Should show percentage breakdown for all 3 scenarios (check at least one is visible)
      await expect(page.getByText(/% of total/i).first()).toBeVisible({ timeout: 10000 });
      // Verify all 3 scenarios have percentages
      await expect(page.getByText(/% of total/i)).toHaveCount(3);
    });
  });

  test.describe('First Chicago API Integration', () => {
    test('should call first-chicago API endpoint', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/first-chicago', {
        data: {
          scenarios: [
            { name: 'Best Case', probability: 0.25, exit_value: 50000000, years_to_exit: 5 },
            { name: 'Base Case', probability: 0.50, exit_value: 20000000, years_to_exit: 5 },
            { name: 'Worst Case', probability: 0.25, exit_value: 5000000, years_to_exit: 5 },
          ],
          discount_rate: 0.25,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.method).toBe('first_chicago');
      expect(data.weighted_value).toBeGreaterThan(0);
      expect(data.present_value).toBeGreaterThan(0);
      expect(data.scenario_values).toBeDefined();
      expect(data.scenario_present_values).toBeDefined();
    });

    test('should validate probabilities sum to 1', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/first-chicago', {
        data: {
          scenarios: [
            { name: 'Best', probability: 0.5, exit_value: 50000000, years_to_exit: 5 },
            { name: 'Worst', probability: 0.3, exit_value: 5000000, years_to_exit: 5 },
          ],
          discount_rate: 0.25,
        },
      });

      // Should fail validation since probabilities sum to 0.8, not 1.0
      expect(response.status()).toBe(400);
    });

    test('should require at least one scenario', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/first-chicago', {
        data: {
          scenarios: [],
          discount_rate: 0.25,
        },
      });

      // FastAPI returns 400 for validation errors
      expect(response.status()).toBe(400);
    });

    test('should validate positive exit values', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/first-chicago', {
        data: {
          scenarios: [
            { name: 'Only', probability: 1.0, exit_value: -100, years_to_exit: 5 },
          ],
          discount_rate: 0.25,
        },
      });

      // FastAPI returns 400 for validation errors
      expect(response.status()).toBe(400);
    });

    test('should calculate correct weighted value', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/valuation/first-chicago', {
        data: {
          scenarios: [
            { name: 'High', probability: 0.5, exit_value: 20000000, years_to_exit: 5 },
            { name: 'Low', probability: 0.5, exit_value: 10000000, years_to_exit: 5 },
          ],
          discount_rate: 0.25,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      // Weighted value = 0.5 * 20M + 0.5 * 10M = 15M
      expect(data.weighted_value).toBe(15000000);
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

  test.describe('Industry Benchmarks', () => {
    test('should display industry selector', async ({ page }) => {
      // Wait for page to fully load
      await page.waitForLoadState('networkidle');

      // Industry selector should be visible - use the combobox role
      const industryCombobox = page.getByRole('combobox');
      await expect(industryCombobox).toBeVisible();
      await expect(industryCombobox).toContainText('Select your industry');
    });

    test('should show benchmark metrics when industry selected', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Open industry selector
      const industrySelector = page.getByRole('combobox');
      await industrySelector.click();

      // Select SaaS industry
      await page.getByRole('option', { name: /SaaS.*Software/i }).click();

      // Should show benchmark card with metrics after loading
      await expect(page.getByText(/SaaS.*Benchmarks/i)).toBeVisible({ timeout: 10000 });
    });

    test('should show warning for outlier revenue multiple', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // First select an industry
      await page.getByRole('combobox').click();
      await page.getByRole('option', { name: /SaaS.*Software/i }).click();

      // Wait for benchmark data to load
      await expect(page.getByText(/SaaS.*Benchmarks/i)).toBeVisible({ timeout: 10000 });

      // Wait for form to stabilize after benchmark load
      await page.waitForTimeout(500);

      // Enter an extremely high revenue multiple (above typical range)
      // Navigate from the help button to the adjacent spinbutton using XPath sibling traversal
      const multipleInput = page
        .getByRole('button', { name: 'Help for Revenue Multiple' })
        .locator('xpath=ancestor::div[1]/following-sibling::div[1]')
        .getByRole('spinbutton');
      await expect(multipleInput).toBeVisible();
      await multipleInput.fill('50');

      // Wait for debounced validation (300ms + API call)
      await page.waitForTimeout(1000);

      // Should show warning about value being outside typical range
      await expect(page.getByText(/above maximum|outside.*range/i)).toBeVisible({ timeout: 10000 });
    });

    test('should validate discount rate in DCF form', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Select industry first
      await page.getByRole('combobox').click();
      await page.getByRole('option', { name: /SaaS.*Software/i }).click();
      await expect(page.getByText(/SaaS.*Benchmarks/i)).toBeVisible({ timeout: 10000 });

      // Wait for form to stabilize
      await page.waitForTimeout(500);

      // Switch to DCF tab
      await page.getByRole('tab', { name: /DCF/i }).click();

      // Wait for DCF form to render - navigate from help button to adjacent spinbutton
      const discountRateInput = page
        .getByRole('button', { name: 'Help for Discount Rate' })
        .locator('xpath=ancestor::div[1]/following-sibling::div[1]')
        .getByRole('spinbutton');
      await expect(discountRateInput).toBeVisible({ timeout: 5000 });

      // Enter an extremely high discount rate
      await discountRateInput.fill('50');

      // Wait for validation
      await page.waitForTimeout(1000);

      // Should show warning about discount rate being high
      await expect(page.getByText(/above.*(?:maximum|typical|range)/i)).toBeVisible({ timeout: 10000 });
    });

    test('should call benchmark API endpoints', async ({ request }) => {
      // Test list industries endpoint
      const industriesResponse = await request.get(
        'http://localhost:8000/api/valuation/benchmarks/industries'
      );
      expect(industriesResponse.ok()).toBeTruthy();
      const industries = await industriesResponse.json();
      expect(industries.length).toBeGreaterThanOrEqual(15);
      expect(industries.some((i: { code: string }) => i.code === 'saas')).toBeTruthy();

      // Test get specific industry benchmark
      const saasResponse = await request.get(
        'http://localhost:8000/api/valuation/benchmarks/saas'
      );
      expect(saasResponse.ok()).toBeTruthy();
      const saasBenchmark = await saasResponse.json();
      expect(saasBenchmark.code).toBe('saas');
      expect(saasBenchmark.metrics).toHaveProperty('revenue_multiple');

      // Test validation endpoint
      const validateResponse = await request.post(
        'http://localhost:8000/api/valuation/benchmarks/validate',
        {
          data: {
            industry_code: 'saas',
            metric_name: 'revenue_multiple',
            value: 15.0,
          },
        }
      );
      expect(validateResponse.ok()).toBeTruthy();
      const validationResult = await validateResponse.json();
      expect(validationResult.severity).toBe('warning');
      expect(validationResult.benchmark_median).toBeGreaterThan(0);
    });
  });

  test.describe('Export Functionality', () => {
    test('should show export button after completing First Chicago valuation', async ({ page }) => {
      // Navigate to valuation page and wait for load
      await page.waitForLoadState('networkidle');

      // Fill in Revenue Multiple form to complete a basic valuation
      await page.locator('input[name="annualRevenue"]').fill('1000000');
      await page.locator('input[name="revenueMultiple"]').fill('10');

      // Click calculate button
      await page.getByRole('button', { name: /Calculate Valuation/i }).click();

      // Wait for valuation result to appear
      await expect(page.getByText(/\$10,000,000/)).toBeVisible({ timeout: 10000 });

      // Export button should be visible after valuation is complete
      await expect(page.getByRole('button', { name: /export/i })).toBeVisible({ timeout: 5000 });
    });

    test('should display export format options when clicked', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Complete a valuation first
      await page.locator('input[name="annualRevenue"]').fill('2000000');
      await page.locator('input[name="revenueMultiple"]').fill('8');
      await page.getByRole('button', { name: /Calculate Valuation/i }).click();
      await expect(page.getByText(/\$16,000,000/)).toBeVisible({ timeout: 10000 });

      // Click export button to open dropdown
      await page.getByRole('button', { name: /export/i }).click();

      // Should show all 3 format options (PDF, JSON, CSV)
      await expect(page.getByText(/PDF/i)).toBeVisible({ timeout: 3000 });
      await expect(page.getByText(/JSON/i)).toBeVisible({ timeout: 3000 });
      await expect(page.getByText(/CSV/i)).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Export API Endpoints', () => {
    test('should generate First Chicago report PDF', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/export/first-chicago', {
        data: {
          company_name: 'TestCo',
          result: {
            weighted_value: 10000000,
            present_value: 7500000,
            scenario_values: { Best: 15000000, Base: 10000000, Worst: 5000000 },
            scenario_present_values: { Best: 11000000, Base: 7500000, Worst: 3800000 },
          },
          params: { discount_rate: 0.25 },
          format: 'pdf',
        },
      });

      expect(response.ok()).toBeTruthy();
      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/pdf');
    });

    test('should generate First Chicago report JSON', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/export/first-chicago', {
        data: {
          company_name: 'JsonTestCo',
          result: {
            weighted_value: 8000000,
            present_value: 6000000,
            scenario_values: { Best: 12000000, Base: 8000000, Worst: 4000000 },
            scenario_present_values: { Best: 9000000, Base: 6000000, Worst: 3000000 },
          },
          params: { discount_rate: 0.20 },
          format: 'json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.company_name).toBe('JsonTestCo');
      expect(data.valuation_method).toBe('First Chicago Method');
      expect(data.sections).toBeDefined();
    });

    test('should generate pre-revenue report', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/export/pre-revenue', {
        data: {
          company_name: 'StartupCo',
          method_name: 'Berkus Method',
          result: {
            valuation: 2500000,
            factors: [
              { name: 'Sound Idea', value: 500000 },
              { name: 'Prototype', value: 500000 },
              { name: 'Team', value: 500000 },
              { name: 'Strategic Relationships', value: 500000 },
              { name: 'Product Rollout', value: 500000 },
            ],
          },
          params: {},
          industry: 'SaaS',
          format: 'json',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.company_name).toBe('StartupCo');
      expect(data.valuation_method).toBe('Berkus Method');
      expect(data.industry).toBe('SaaS');
    });

    test('should calculate negotiation range', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/export/negotiation-range', {
        data: {
          valuation: 10000000,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.floor).toBe(7000000);
      expect(data.conservative).toBe(8500000);
      expect(data.target).toBe(10000000);
      expect(data.aggressive).toBe(12000000);
      expect(data.ceiling).toBe(15000000);
    });

    test('should calculate negotiation range with Monte Carlo percentiles', async ({ request }) => {
      const response = await request.post('http://localhost:8000/api/export/negotiation-range', {
        data: {
          valuation: 10000000,
          monte_carlo_percentiles: {
            p10: 6000000,
            p25: 8000000,
            p50: 10000000,
            p75: 13000000,
            p90: 18000000,
          },
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.floor).toBe(6000000);
      expect(data.conservative).toBe(8000000);
      expect(data.target).toBe(10000000);
      expect(data.aggressive).toBe(13000000);
      expect(data.ceiling).toBe(18000000);
    });
  });
});
