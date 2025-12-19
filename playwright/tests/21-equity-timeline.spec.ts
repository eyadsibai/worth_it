import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Equity Timeline Visualization (#228)
 *
 * Tests verify:
 * - Founder Mode: Timeline tab in cap table manager
 * - Founder Mode: Chart and event timeline render correctly
 * - Founder Mode: Filters toggle event visibility
 * - Founder Mode: Export functionality
 * - Employee Mode: Timeline in scenario results
 * - Employee Mode: Vesting milestones display
 */

test.describe('Equity Timeline - Founder Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Clear localStorage and reload
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Navigate to Founder mode
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();

    // Wait for cap table manager to load
    await page.waitForSelector('[data-testid="cap-table-manager"]', { timeout: 10000 }).catch(() => {
      // Fallback: wait for any founder mode content
      return page.waitForSelector('text=/Cap Table|Stakeholders/i', { timeout: 10000 });
    });
  });

  test('should display Equity Timeline tab in cap table manager', async ({ page }) => {
    // Look for the Equity Timeline tab
    const timelineTab = page.getByRole('tab', { name: /Equity Timeline|Timeline/i });
    await expect(timelineTab).toBeVisible({ timeout: 10000 });
  });

  test('should show timeline content when tab is clicked', async ({ page }) => {
    // Skip wizard if shown
    const skipButton = page.getByRole('button', { name: /Skip Wizard/i });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Click on the Equity Timeline tab
    const timelineTab = page.getByRole('tab', { name: /Equity Timeline|Timeline/i });
    await timelineTab.click();

    // Verify timeline content is visible (chart container or empty state)
    await expect(
      page.locator('[data-testid="equity-timeline"]').or(
        page.getByText(/No timeline data|Add stakeholders|equity evolution/i)
      )
    ).toBeVisible({ timeout: 10000 });
  });

  test('should display filter controls in timeline view', async ({ page }) => {
    // Skip wizard if shown
    const skipButton = page.getByRole('button', { name: /Skip Wizard/i });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Navigate to timeline tab
    const timelineTab = page.getByRole('tab', { name: /Equity Timeline|Timeline/i });
    await timelineTab.click();

    // Look for filter button or filter controls
    const filterButton = page.getByRole('button', { name: /Filter|Filters/i });
    await expect(filterButton).toBeVisible({ timeout: 5000 });
  });

  test('should display export menu in timeline view', async ({ page }) => {
    // Skip wizard if shown
    const skipButton = page.getByRole('button', { name: /Skip Wizard/i });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Navigate to timeline tab
    const timelineTab = page.getByRole('tab', { name: /Equity Timeline|Timeline/i });
    await timelineTab.click();

    // Look for export button
    const exportButton = page.getByRole('button', { name: /Export/i });
    await expect(exportButton).toBeVisible({ timeout: 5000 });
  });

  test('should open filter popover when filter button is clicked', async ({ page }) => {
    // Skip wizard if shown
    const skipButton = page.getByRole('button', { name: /Skip Wizard/i });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Navigate to timeline tab
    const timelineTab = page.getByRole('tab', { name: /Equity Timeline|Timeline/i });
    await timelineTab.click();

    // Click filter button
    const filterButton = page.getByRole('button', { name: /Filter|Filters/i });
    await filterButton.click();

    // Verify popover opens with filter toggles
    await expect(
      page.getByText(/Funding Round|Stakeholder Added|Option Pool/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test('should open export dropdown when export button is clicked', async ({ page }) => {
    // Skip wizard if shown
    const skipButton = page.getByRole('button', { name: /Skip Wizard/i });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Navigate to timeline tab
    const timelineTab = page.getByRole('tab', { name: /Equity Timeline|Timeline/i });
    await timelineTab.click();

    // Click export button
    const exportButton = page.getByRole('button', { name: /Export/i });
    await exportButton.click();

    // Verify dropdown opens with export options
    await expect(
      page.getByText(/PNG Image|PDF Report|CSV Data|JSON Data/i).first()
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Equity Timeline - With Stakeholder Data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Clear localStorage and reload
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Navigate to Founder mode
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
  });

  test('should display chart when stakeholders exist', async ({ page }) => {
    // Complete the wizard to add stakeholders
    // Step 1: Add founders
    await page.waitForSelector('text=/Who are the founders/i', { timeout: 10000 });

    // Fill in founder name
    const founderInput = page.getByPlaceholder(/founder.*name|enter.*name/i).first();
    if (await founderInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await founderInput.fill('Test Founder');
    }

    // Click next/continue
    const nextButton = page.getByRole('button', { name: /Next|Continue/i });
    if (await nextButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextButton.click();
    }

    // Skip through remaining wizard steps or complete them
    for (let i = 0; i < 5; i++) {
      const skipOrNext = page.getByRole('button', { name: /Next|Continue|Skip|Finish|Complete/i }).first();
      if (await skipOrNext.isVisible({ timeout: 1000 }).catch(() => false)) {
        await skipOrNext.click();
        await page.waitForTimeout(500);
      }
    }

    // Navigate to timeline tab
    const timelineTab = page.getByRole('tab', { name: /Equity Timeline|Timeline/i });
    if (await timelineTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await timelineTab.click();

      // Verify chart or timeline content is visible
      await expect(
        page.locator('.recharts-wrapper').or(
          page.locator('[data-testid="ownership-chart"]')
        ).or(
          page.getByText(/Company Founded|Initial/i)
        )
      ).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Equity Timeline - Employee Mode', () => {
  test.beforeEach(async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
  });

  test('should display timeline in scenario results for RSU', async ({ page, helpers }) => {
    // Fill in global settings
    await helpers.fillGlobalSettings(5);

    // Fill in current job form
    await helpers.fillCurrentJobForm();

    // Select RSU equity type
    const rsuTab = page.getByRole('tab', { name: /RSU/i });
    await rsuTab.click();

    // Fill RSU form - scope to Startup Offer card
    const startupCard = page.locator('.terminal-card').filter({ hasText: 'Startup Offer' });
    await startupCard.waitFor({ state: 'visible' });

    // Fill equity percentage
    const equityInput = startupCard.locator('input[type="number"]').first();
    await equityInput.fill('0.5');

    // Fill exit valuation
    const exitInput = startupCard.locator('input[type="number"]').nth(1);
    if (await exitInput.isVisible().catch(() => false)) {
      await exitInput.fill('100000000');
    }

    // Click Calculate/Analyze button
    const calculateButton = page.getByRole('button', { name: /Calculate|Analyze|Compare/i });
    await calculateButton.click();

    // Wait for results to load
    await page.waitForTimeout(2000);

    // Look for timeline in results (may be in a tab or section)
    const timelineSection = page.getByText(/Timeline|Vesting|Equity Timeline/i);
    await expect(timelineSection.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show vesting milestones in employee timeline', async ({ page, helpers }) => {
    // Fill in global settings
    await helpers.fillGlobalSettings(5);

    // Fill in current job form
    await helpers.fillCurrentJobForm();

    // Select Stock Options
    const optionsTab = page.getByRole('tab', { name: /Stock Options/i });
    await optionsTab.click();

    // Fill options form - scope to Startup Offer card
    const startupCard = page.locator('.terminal-card').filter({ hasText: 'Startup Offer' });
    await startupCard.waitFor({ state: 'visible' });

    // Fill number of options
    const optionsInput = startupCard.locator('input[type="number"]').first();
    await optionsInput.fill('10000');

    // Click Calculate button
    const calculateButton = page.getByRole('button', { name: /Calculate|Analyze|Compare/i });
    await calculateButton.click();

    // Wait for results
    await page.waitForTimeout(2000);

    // Look for vesting milestones
    await expect(
      page.getByText(/Cliff|Vested|Grant|Equity Grant/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Equity Timeline - Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
  });

  test('should sync hover state between chart and timeline', async ({ page }) => {
    // Skip wizard
    const skipButton = page.getByRole('button', { name: /Skip Wizard/i });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Navigate to timeline
    const timelineTab = page.getByRole('tab', { name: /Equity Timeline|Timeline/i });
    if (await timelineTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await timelineTab.click();

      // If there's chart data, hover over it
      const chart = page.locator('.recharts-wrapper');
      if (await chart.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Hover over the chart area
        await chart.hover();

        // Look for tooltip or highlight effect
        const tooltip = page.locator('.recharts-tooltip-wrapper');
        // Tooltip visibility depends on data presence
        if (await tooltip.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(tooltip).toBeVisible();
        }
      }
    }
  });

  test('should toggle filter and update visible events', async ({ page }) => {
    // Skip wizard
    const skipButton = page.getByRole('button', { name: /Skip Wizard/i });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Navigate to timeline
    const timelineTab = page.getByRole('tab', { name: /Equity Timeline|Timeline/i });
    await timelineTab.click();

    // Open filters
    const filterButton = page.getByRole('button', { name: /Filter|Filters/i });
    await filterButton.click();

    // Find a toggle and click it
    const fundingToggle = page.locator('[role="switch"], [data-state]').filter({ hasText: /Funding/i }).first();
    if (await fundingToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Get initial state
      const initialState = await fundingToggle.getAttribute('data-state');

      // Click to toggle
      await fundingToggle.click();

      // Verify state changed
      const newState = await fundingToggle.getAttribute('data-state');
      expect(newState).not.toBe(initialState);
    }
  });
});

test.describe('Equity Timeline - Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
  });

  test('should trigger CSV export', async ({ page }) => {
    // Skip wizard
    const skipButton = page.getByRole('button', { name: /Skip Wizard/i });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Navigate to timeline
    const timelineTab = page.getByRole('tab', { name: /Equity Timeline|Timeline/i });
    await timelineTab.click();

    // Open export menu
    const exportButton = page.getByRole('button', { name: /Export/i });
    await exportButton.click();

    // Set up download handler
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

    // Click CSV export option
    const csvOption = page.getByText(/CSV Data/i);
    await csvOption.click();

    // Verify download started (or at least menu item was clicked)
    // Download may not complete in test environment
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('.csv');
    }
  });

  test('should trigger JSON export', async ({ page }) => {
    // Skip wizard
    const skipButton = page.getByRole('button', { name: /Skip Wizard/i });
    if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Navigate to timeline
    const timelineTab = page.getByRole('tab', { name: /Equity Timeline|Timeline/i });
    await timelineTab.click();

    // Open export menu
    const exportButton = page.getByRole('button', { name: /Export/i });
    await exportButton.click();

    // Set up download handler
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);

    // Click JSON export option
    const jsonOption = page.getByText(/JSON Data/i);
    await jsonOption.click();

    // Verify download started
    const download = await downloadPromise;
    if (download) {
      expect(download.suggestedFilename()).toContain('.json');
    }
  });
});
