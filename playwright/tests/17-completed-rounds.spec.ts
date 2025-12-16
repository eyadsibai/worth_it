import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Completed Rounds & Dilution Summary
 *
 * These tests verify the completed rounds functionality:
 * - Company stage selector auto-populates historical rounds
 * - Dilution summary card shows correct breakdown
 * - Completed rounds section displays and allows editing
 * - Dilution calculations are accurate
 */

test.describe('Completed Rounds & Dilution Summary', () => {
  test.beforeEach(async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
  });

  test.describe('Company Stage Selector', () => {
    test('should display company stage selector when dilution is enabled', async ({ page, helpers }) => {
      // Select RSU and enable dilution
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      await rsuPanel.waitFor({ state: 'visible' });

      // Enable dilution simulation
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Verify company stage selector appears
      await expect(page.getByText('Company Stage')).toBeVisible();
      await expect(page.getByText('Select current funding stage...')).toBeVisible();
    });

    test('should show stage options when clicking selector', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Click the stage selector dropdown
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();

      // Verify stage options appear
      await expect(page.getByRole('option', { name: /Pre-Seed/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /Post-Seed/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /Post-Series A/i })).toBeVisible();
      await expect(page.getByRole('option', { name: /Post-Series B/i })).toBeVisible();
    });

    test('should auto-populate completed rounds when selecting a stage', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select Post-Series B stage
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Series B/i }).click();

      // Verify badges show completed rounds info
      await expect(page.getByText('4 completed rounds')).toBeVisible();
      await expect(page.getByText(/Typical dilution.*~52%/)).toBeVisible();
    });
  });

  test.describe('Dilution Summary Card', () => {
    test('should display dilution overview when rounds exist', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select a stage to get some rounds
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Seed/i }).click();

      // Verify dilution overview card appears
      await expect(page.getByText('Dilution Overview')).toBeVisible();
      await expect(page.getByText('Equity Remaining')).toBeVisible();
    });

    test('should show correct dilution breakdown', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select Post-Seed (has Pre-Seed and Seed completed)
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Seed/i }).click();

      // Verify breakdown labels are present
      await expect(page.getByText('Historical').first()).toBeVisible();
      await expect(page.getByText('Projected').first()).toBeVisible();
      await expect(page.getByText('Total').first()).toBeVisible();
    });

    test('should show progress bar visualization', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select a stage
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Series A/i }).click();

      // Verify progress bar is visible via the legend
      await expect(page.getByText('Remaining').first()).toBeVisible();
    });
  });

  test.describe('Completed Rounds Section', () => {
    test('should display funding history when completed rounds exist', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select Post-Series A stage
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Series A/i }).click();

      // Verify Funding History section appears
      await expect(page.getByText('Funding History')).toBeVisible();
      await expect(page.getByText(/3 rounds?/)).toBeVisible();
    });

    test('should show total dilution and raised in summary', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select Post-Seed stage
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Seed/i }).click();

      // Verify summary info is shown
      await expect(page.getByText(/Total dilution:/)).toBeVisible();
      await expect(page.getByText(/Total raised:/)).toBeVisible();
    });

    test('should expand to show individual rounds', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select Post-Series A stage
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Series A/i }).click();

      // Expand the Funding History section - click on the toggle button (has sr-only text "Toggle history")
      const fundingHistoryToggle = page.getByRole('button', { name: /Toggle history/i });
      await fundingHistoryToggle.click();

      // Verify individual rounds are shown - use exact match to avoid matching dropdown options
      await expect(page.getByText('Pre-Seed', { exact: true })).toBeVisible();
      await expect(page.getByText('Seed', { exact: true })).toBeVisible();
      await expect(page.getByText('Series A', { exact: true }).first()).toBeVisible();
    });

    test('should show edit history button when funding history is expanded', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });

      // Enable dilution simulation - click directly on the checkbox by its label
      const dilutionCheckbox = rsuPanel.getByRole('checkbox', { name: /Simulate Fundraising/i });
      await dilutionCheckbox.waitFor({ state: 'visible' });
      await dilutionCheckbox.click();

      // Wait for the Company Stage selector to appear (confirms dilution is enabled)
      await expect(page.getByText('Company Stage')).toBeVisible({ timeout: 10000 });

      // Select Post-Seed stage (has Pre-Seed and Seed as completed)
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Seed/i }).click();

      // Wait for Funding History section to appear with the summary
      await expect(page.getByText('Funding History')).toBeVisible({ timeout: 10000 });

      // Expand the Funding History section by clicking the chevron toggle button
      const fundingHistoryToggle = page.getByRole('button', { name: /Toggle history/i });
      await fundingHistoryToggle.click();

      // Wait for expanded content and verify Edit History button appears
      // This confirms the collapsible section works and contains edit functionality
      const editButton = page.getByRole('button', { name: /Edit History/i });
      await expect(editButton).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Future Funding Rounds', () => {
    test('should display future rounds section', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select a stage
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Seed/i }).click();

      // Verify Future Funding Rounds section - look for the accordion trigger button
      // The accordion trigger contains a span with the text
      const futureRoundsButton = page.locator('[data-state]').filter({ has: page.locator('span:text-is("Future Funding Rounds")') }).first();
      await expect(futureRoundsButton).toBeVisible();
    });

    test('should show enabled count for future rounds', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select Post-Seed (should have Series A, B, C, D as upcoming)
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Seed/i }).click();

      // Future rounds start disabled, so should show (0 enabled)
      await expect(page.getByText(/\(0 enabled\)/)).toBeVisible();
    });

    test('should allow adding a new funding round', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select Post-Series D stage - this has all standard rounds as completed
      // so adding a new round will create "Series E" as the next available
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Series D/i }).click();

      // Click to expand Future Funding Rounds - use the accordion trigger with data-state
      const futureRoundsAccordion = page.locator('[data-state]').filter({ has: page.locator('span:text-is("Future Funding Rounds")') }).first();
      await futureRoundsAccordion.click();

      // Count initial number of upcoming round cards
      const initialRoundCount = await page.locator('[data-slot="accordion-item"]').count();

      // Click Add Funding Round button
      const addButton = page.getByRole('button', { name: /Add Funding Round/i });
      await addButton.click();

      // Verify a new round was added - either by checking for Series E or by count increase
      // Post-Series D starts with 0 upcoming rounds, so adding one creates the first
      await expect(page.getByText('Series E').first()).toBeVisible();
    });
  });

  test.describe('Integration with Calculations', () => {
    test('should show correct historical dilution for selected stage', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });

      // Enable dilution
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select Post-Series A stage (has Pre-Seed, Seed, Series A completed)
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Series A/i }).click();

      // Wait for dilution summary card to appear
      await page.waitForSelector('[data-testid="historical-dilution"]');

      // Historical dilution should be > 0% (Pre-Seed 10% + Seed 15% + Series A 20% = ~39%)
      const historicalDilution = await page.getByTestId('historical-dilution').textContent();
      expect(historicalDilution).not.toBe('0.0%');

      // Projected should be 0% since no upcoming rounds are enabled by default
      const projectedDilution = await page.getByTestId('projected-dilution').textContent();
      expect(projectedDilution).toBe('0.0%');

      // Total dilution should equal historical when no future rounds enabled
      const totalDilution = await page.getByTestId('total-dilution').textContent();
      expect(totalDilution).toBe(historicalDilution);
    });

    test('should show equity remaining percentage correctly', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });

      // Enable dilution
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select Post-Seed stage (Pre-Seed 10% + Seed 15% dilution)
      // Remaining = (1 - 0.10) * (1 - 0.15) = 0.90 * 0.85 = 0.765 = 76.5%, rounds to 77%
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Seed/i }).click();

      // Wait for dilution summary card to appear
      await page.waitForSelector('[data-testid="equity-remaining"]');

      // Equity remaining should be approximately 77% (after Pre-Seed and Seed dilution)
      const equityRemaining = await page.getByTestId('equity-remaining').textContent();
      // Should be a number between 70-80% for Post-Seed stage
      const match = equityRemaining?.match(/(\d+)/);
      expect(match).not.toBeNull();
      const percentage = parseInt(match![1], 10);
      expect(percentage).toBeGreaterThan(70);
      expect(percentage).toBeLessThan(80);
    });
  });
});
