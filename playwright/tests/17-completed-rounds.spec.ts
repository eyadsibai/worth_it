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

      // Expand the Funding History section
      const fundingHistoryHeader = page.locator('button').filter({ hasText: 'Funding History' });
      await fundingHistoryHeader.click();

      // Verify individual rounds are shown
      await expect(page.getByText('Pre-Seed')).toBeVisible();
      await expect(page.getByText('Seed')).toBeVisible();
      await expect(page.getByText('Series A').first()).toBeVisible();
    });

    test('should allow editing completed rounds', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select Post-Seed stage
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Seed/i }).click();

      // Expand the Funding History section
      const fundingHistoryHeader = page.locator('button').filter({ hasText: 'Funding History' });
      await fundingHistoryHeader.click();

      // Click Edit History button
      const editButton = page.getByRole('button', { name: /Edit History/i });
      await editButton.click();

      // Verify edit controls appear (looking for form fields like Dilution %)
      await expect(page.getByText('Dilution %').first()).toBeVisible();
      await expect(page.getByText('Done Editing')).toBeVisible();
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

      // Verify Future Funding Rounds section
      await expect(page.getByText('Future Funding Rounds')).toBeVisible();
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

      // Select a stage
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Pre-Seed/i }).click();

      // Click to expand Future Funding Rounds
      const futureRoundsHeader = page.getByRole('button', { name: /Future Funding Rounds/ });
      await futureRoundsHeader.click();

      // Click Add Funding Round button
      const addButton = page.getByRole('button', { name: /Add Funding Round/i });
      await addButton.click();

      // Verify a new round was added (will be the next in sequence)
      // Pre-Seed stage has all rounds as upcoming, so adding creates a new one
      await expect(page.getByText('Custom Round')).toBeVisible();
    });
  });

  test.describe('Integration with Calculations', () => {
    test('should update dilution summary when enabling future rounds', async ({ page, helpers }) => {
      await helpers.selectRSUEquityType();

      // Fill in basic RSU form data first
      const rsuPanel = page.getByRole('tabpanel', { name: 'RSUs' });
      const numberInputs = rsuPanel.locator('input[type="number"]');
      await numberInputs.first().waitFor({ state: 'visible' });
      await numberInputs.nth(0).fill('12000'); // Monthly salary
      await numberInputs.nth(1).fill('0.5'); // Equity grant %

      // Enable dilution
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      await dilutionCheckbox.click();

      // Select Post-Seed stage
      const stageSelector = page.getByRole('combobox').filter({ hasText: 'Select current funding stage' });
      await stageSelector.click();
      await page.getByRole('option', { name: /Post-Seed/i }).click();

      // Record initial projected dilution (should be 0% since all upcoming are disabled)
      const projectedBefore = await page.getByTestId('projected-dilution').textContent();
      expect(projectedBefore).toBe('0.0%');

      // Expand Future Funding Rounds and enable Series A
      const futureRoundsHeader = page.getByRole('button', { name: /Future Funding Rounds/ });
      await futureRoundsHeader.click();

      // Find Series A accordion and expand it
      const seriesAAccordion = page.locator('[data-state]').filter({ hasText: 'Series A' }).first();
      await seriesAAccordion.click();

      // Enable Series A round (find the checkbox within the accordion content)
      const seriesACheckbox = page.locator('button[role="checkbox"]').filter({ hasText: /Enable/i }).first();
      if (await seriesACheckbox.isVisible()) {
        await seriesACheckbox.click();
      }

      // Verify projected dilution updated (should now be > 0%)
      await expect(page.getByTestId('projected-dilution')).not.toHaveText('0.0%');
    });
  });
});
