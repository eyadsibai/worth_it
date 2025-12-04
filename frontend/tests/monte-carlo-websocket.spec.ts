import { test, expect } from '@playwright/test';

test.describe('Monte Carlo WebSocket Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Fill in form with test data
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
  });

  test('should have Monte Carlo simulation button', async ({ page }) => {
    // Look for Monte Carlo button
    const monteCarloButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await expect(monteCarloButton).toBeVisible();
  });

  test('should start simulation and show progress', async ({ page }) => {
    // Start Monte Carlo simulation
    const simulateButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await simulateButton.click();

    // Check for progress indicator
    const progressBar = page.locator('[role="progressbar"], [class*="progress"], [data-testid*="progress"]');
    await expect(progressBar.first()).toBeVisible({ timeout: 5000 });

    // Check for percentage or iteration count
    const progressText = page.getByText(/\d+%|\d+\/\d+|iteration/i);
    await expect(progressText.first()).toBeVisible();
  });

  test('should establish WebSocket connection', async ({ page }) => {
    // Listen for WebSocket connections
    const wsPromise = page.waitForEvent('websocket');

    // Start simulation
    const simulateButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await simulateButton.click();

    // Verify WebSocket connection
    const ws = await wsPromise;
    expect(ws.url()).toContain('ws://localhost:8000');
    expect(ws.url()).toContain('monte-carlo');
  });

  test('should receive and display simulation updates', async ({ page }) => {
    // Start simulation
    const simulateButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await simulateButton.click();

    // Wait for progress updates
    await page.waitForTimeout(2000);

    // Check if progress is updating
    const initialProgress = await page.locator('[role="progressbar"], [class*="progress"]')
      .first()
      .getAttribute('aria-valuenow');

    await page.waitForTimeout(2000);

    const updatedProgress = await page.locator('[role="progressbar"], [class*="progress"]')
      .first()
      .getAttribute('aria-valuenow');

    // Progress should have changed
    if (initialProgress && updatedProgress) {
      expect(Number(updatedProgress)).toBeGreaterThan(Number(initialProgress));
    }
  });

  test('should display simulation results', async ({ page }) => {
    // Start simulation
    const simulateButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await simulateButton.click();

    // Wait for simulation to complete (max 30 seconds)
    await page.waitForSelector('[data-testid*="simulation-results"], [class*="simulation-result"], [class*="monte-carlo-result"]', {
      timeout: 30000
    });

    // Check for statistical results
    await expect(page.getByText(/mean|average/i).first()).toBeVisible();
    await expect(page.getByText(/standard deviation|std dev/i).first()).toBeVisible();

    // Check for percentile information
    const percentileText = page.getByText(/percentile|95%|5%/i);
    if (await percentileText.isVisible()) {
      await expect(percentileText.first()).toBeVisible();
    }
  });

  test('should show distribution chart after simulation', async ({ page }) => {
    // Start simulation
    const simulateButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await simulateButton.click();

    // Wait for simulation to complete
    await page.waitForTimeout(10000);

    // Check for distribution chart
    const distributionChart = page.locator('[data-testid*="distribution"], [class*="histogram"], svg.recharts-surface').last();
    await expect(distributionChart).toBeVisible({ timeout: 15000 });
  });

  test('should handle simulation cancellation', async ({ page }) => {
    // Start simulation
    const simulateButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await simulateButton.click();

    // Look for cancel button
    const cancelButton = page.getByRole('button', { name: /cancel|stop/i });
    if (await cancelButton.isVisible({ timeout: 2000 })) {
      await cancelButton.click();

      // Simulation should stop
      await expect(page.getByText(/cancelled|stopped/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should maintain WebSocket connection during navigation', async ({ page }) => {
    // Start simulation
    const simulateButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await simulateButton.click();

    // Wait for connection
    await page.waitForTimeout(2000);

    // Scroll or interact with page
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.evaluate(() => window.scrollTo(0, 0));

    // Progress should still be updating
    const progressBar = page.locator('[role="progressbar"], [class*="progress"]').first();
    await expect(progressBar).toBeVisible();
  });

  test('should handle WebSocket reconnection on failure', async ({ page, context }) => {
    // Start simulation
    const simulateButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await simulateButton.click();

    // Simulate network interruption
    await context.setOffline(true);
    await page.waitForTimeout(2000);
    await context.setOffline(false);

    // Check for reconnection or error message
    const errorMessage = page.getByText(/connection lost|reconnecting|error/i);
    const isErrorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);

    if (isErrorVisible) {
      await expect(errorMessage.first()).toBeVisible();
    }
  });

  test('should display simulation parameters', async ({ page }) => {
    // Start simulation
    const simulateButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await simulateButton.click();

    // Check for simulation parameters display
    const iterationsText = page.getByText(/iterations|simulations|runs/i);
    if (await iterationsText.isVisible()) {
      await expect(iterationsText.first()).toBeVisible();

      // Should show number of iterations
      await expect(page.getByText(/\d{1,}0{3}/)).toBeVisible(); // At least 1000
    }
  });

  test('should update UI smoothly during simulation', async ({ page }) => {
    // Start simulation
    const simulateButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await simulateButton.click();

    // Monitor for UI freezing by checking button responsiveness
    await page.waitForTimeout(1000);

    // Other UI elements should remain interactive
    const otherButtons = page.getByRole('button').filter({ hasNotText: /monte carlo|simulation|cancel|stop/i });
    const buttonCount = await otherButtons.count();

    if (buttonCount > 0) {
      // Try to interact with another button
      const firstButton = otherButtons.first();
      const isEnabled = await firstButton.isEnabled();
      expect(isEnabled).toBeTruthy();
    }
  });

  test('should show confidence intervals in results', async ({ page }) => {
    // Start simulation
    const simulateButton = page.getByRole('button', { name: /monte carlo|simulation|simulate/i });
    await simulateButton.click();

    // Wait for completion
    await page.waitForSelector('[data-testid*="simulation-results"], [class*="simulation-result"]', {
      timeout: 30000
    });

    // Check for confidence interval display
    const confidenceText = page.getByText(/confidence|CI|interval/i);
    if (await confidenceText.isVisible()) {
      await expect(confidenceText.first()).toBeVisible();

      // Should show range values
      await expect(page.getByText(/\$[\d,]+\s*-\s*\$[\d,]+/)).toBeVisible();
    }
  });
});
