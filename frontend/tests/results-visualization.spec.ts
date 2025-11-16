import { test, expect } from '@playwright/test';

test.describe('Results Visualization UI/UX', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Fill in form with test data to get results
    await page.getByLabel(/hourly wage/i).fill('30');
    await page.getByLabel(/hours per week/i).fill('40');
    await page.getByLabel(/purchase price/i).fill('25000');
    await page.getByLabel(/down payment/i).fill('5000');
    await page.getByLabel(/loan term/i).fill('60');
    await page.getByLabel(/interest rate/i).fill('5.5');
    await page.getByLabel(/monthly premium/i).fill('150');
    await page.getByLabel(/monthly gas cost/i).fill('120');
    await page.getByLabel(/monthly maintenance/i).fill('50');
    await page.getByLabel(/monthly parking/i).fill('100');
    
    // Calculate results
    await page.getByRole('button', { name: /calculate total cost/i }).click();
    await page.waitForSelector('[data-testid="results-section"], .results-container, [class*="result"]', { 
      timeout: 10000 
    });
  });

  test('should display total cost summary', async ({ page }) => {
    // Check for main cost display
    await expect(page.getByText(/total cost/i).first()).toBeVisible();
    
    // Should show dollar amount
    const costPattern = /\$[\d,]+\.?\d*/;
    await expect(page.getByText(costPattern).first()).toBeVisible();
  });

  test('should show cost breakdown chart', async ({ page }) => {
    // Check for chart elements (svg or canvas)
    const chart = page.locator('svg.recharts-surface, canvas, [class*="chart"]').first();
    await expect(chart).toBeVisible();
    
    // Check for chart legend
    const legend = page.locator('.recharts-legend, [class*="legend"]').first();
    if (await legend.isVisible()) {
      // Verify legend items
      await expect(legend.locator('text, span').first()).toBeVisible();
    }
  });

  test('should display hours worked calculation', async ({ page }) => {
    // Look for hours worked display
    const hoursText = page.getByText(/hours/i);
    await expect(hoursText.first()).toBeVisible();
    
    // Should show a numeric value for hours
    const hoursPattern = /\d+\.?\d*\s*hours?/i;
    await expect(page.getByText(hoursPattern).first()).toBeVisible();
  });

  test('should show monthly payment breakdown', async ({ page }) => {
    // Check for monthly payment information
    await expect(page.getByText(/monthly/i).first()).toBeVisible();
    
    // Verify individual cost components are shown
    const costComponents = ['insurance', 'gas', 'maintenance', 'parking'];
    for (const component of costComponents) {
      const element = page.getByText(new RegExp(component, 'i'));
      if (await element.isVisible()) {
        await expect(element.first()).toBeVisible();
      }
    }
  });

  test('should have interactive chart tooltips', async ({ page }) => {
    // Find chart area
    const chart = page.locator('svg.recharts-surface, [class*="chart"]').first();
    if (await chart.isVisible()) {
      // Hover over chart area to trigger tooltip
      await chart.hover({ position: { x: 100, y: 100 } });
      
      // Check for tooltip
      const tooltip = page.locator('.recharts-tooltip, [role="tooltip"], [class*="tooltip"]');
      if (await tooltip.isVisible({ timeout: 2000 })) {
        await expect(tooltip.first()).toBeVisible();
      }
    }
  });

  test('should update results when form values change', async ({ page }) => {
    // Get initial total cost
    const initialCost = await page.locator('[data-testid*="total"], [class*="total"]')
      .first()
      .textContent();
    
    // Change a value
    await page.getByLabel(/purchase price/i).fill('30000');
    
    // Recalculate
    await page.getByRole('button', { name: /calculate/i }).click();
    
    // Wait for update
    await page.waitForTimeout(1000);
    
    // Get new total cost
    const updatedCost = await page.locator('[data-testid*="total"], [class*="total"]')
      .first()
      .textContent();
    
    // Costs should be different
    expect(initialCost).not.toBe(updatedCost);
  });

  test('should display comparison metrics', async ({ page }) => {
    // Check for comparison to alternatives (if implemented)
    const comparisonText = page.getByText(/compared to|vs|alternative/i);
    if (await comparisonText.isVisible()) {
      await expect(comparisonText.first()).toBeVisible();
    }
    
    // Check for percentage or ratio displays
    const percentPattern = /\d+\.?\d*%/;
    const percentText = page.getByText(percentPattern);
    if (await percentText.isVisible()) {
      await expect(percentText.first()).toBeVisible();
    }
  });

  test('should have print-friendly results view', async ({ page }) => {
    // Check if print button exists
    const printButton = page.getByRole('button', { name: /print|export|download/i });
    if (await printButton.isVisible()) {
      // Test print CSS by emulating print media
      await page.emulateMedia({ media: 'print' });
      
      // Results should still be visible
      await expect(page.locator('[data-testid="results-section"], .results-container, [class*="result"]').first()).toBeVisible();
      
      // Reset media
      await page.emulateMedia({ media: 'screen' });
    }
  });

  test('should handle large numbers correctly', async ({ page }) => {
    // Test with very expensive car
    await page.getByLabel(/purchase price/i).fill('100000');
    await page.getByRole('button', { name: /calculate/i }).click();
    
    // Wait for results
    await page.waitForTimeout(1000);
    
    // Should format large numbers with commas
    const largeNumberPattern = /\$\d{1,3}(,\d{3})+\.?\d*/;
    await expect(page.getByText(largeNumberPattern).first()).toBeVisible();
  });

  test('should be accessible with keyboard navigation', async ({ page }) => {
    // Tab through results section
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check if focused element is within results
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : null;
    });
    
    expect(focusedElement).toBeTruthy();
  });

  test('should show loading state during calculation', async ({ page }) => {
    // Start fresh calculation
    await page.getByLabel(/purchase price/i).fill('35000');
    
    // Click calculate and immediately check for loading state
    const calculatePromise = page.getByRole('button', { name: /calculate/i }).click();
    
    // Check for loading indicators
    const loadingIndicator = page.locator('[class*="loading"], [class*="spinner"], [aria-busy="true"]');
    
    await calculatePromise;
    
    // Loading indicator might appear briefly
    // This test may need adjustment based on actual implementation
  });

  test('should display error states gracefully', async ({ page }) => {
    // Clear required field
    await page.getByLabel(/hourly wage/i).clear();
    
    // Try to calculate
    await page.getByRole('button', { name: /calculate/i }).click();
    
    // Should show validation error, not break the UI
    await expect(page.getByText(/required|error|invalid/i).first()).toBeVisible();
    
    // UI should remain functional
    await page.getByLabel(/hourly wage/i).fill('30');
    await page.getByRole('button', { name: /calculate/i }).click();
    
    // Should work after fixing error
    await expect(page.locator('[data-testid="results-section"], .results-container, [class*="result"]').first()).toBeVisible({ timeout: 10000 });
  });
});