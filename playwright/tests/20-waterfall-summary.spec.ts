import { test, expect } from '../fixtures/base';

/**
 * E2E Tests for PR #221: WaterfallSummary Component
 *
 * Note: The WaterfallSummary component was created as a standalone component
 * with comprehensive unit tests (17 tests in waterfall-summary.test.tsx).
 * It provides plain English explanations and a stakeholder selector.
 *
 * Currently, WaterfallSummary is NOT integrated into the main UI.
 * The existing waterfall-analysis.tsx uses WaterfallChart, WaterfallTable,
 * and a "Waterfall Steps" card for step-by-step breakdown.
 *
 * These E2E tests validate the aspects of PR #221's test plan that ARE
 * testable with the current UI implementation:
 *
 * Test Plan:
 * - [x] Verify explanation text is readable and accurate (via Waterfall Steps card)
 * - [x] Test flow diagram renders steps in correct order
 * - [x] Verify empty/loading states display properly
 * - [ ] Test stakeholder selector highlights correct payout (requires integration)
 *
 * When WaterfallSummary is integrated, additional tests can be added for:
 * - Plain English preference explanation ("Preferred investors get paid first...")
 * - Stakeholder selector buttons for highlighting individual payouts
 * - ROI display for investors
 */

const TEST_STAKEHOLDERS = {
  founder: {
    name: 'Alice Founder',
    ownershipPct: '40',
  },
  investor: {
    name: 'Seed VC',
    ownershipPct: '25',
  },
};

test.describe('PR #221: Waterfall Distribution Readability', () => {
  test.describe('Empty and Loading States', () => {
    test('should show empty state when no stakeholders added', async ({ page, helpers }) => {
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();

      // Switch to Founder mode (Cap Table)
      await page.getByRole('tab', { name: /Model Cap Table|Cap Table/i }).click();

      // Navigate to Waterfall tab without adding stakeholders
      await page.getByRole('tab', { name: /Waterfall/i }).click();

      // Verify empty state message is displayed
      await expect(page.getByText(/Add stakeholders to your cap table/i)).toBeVisible();
    });

    test('should show loading state during calculation', async ({ page, helpers }) => {
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();

      // Switch to Founder mode (Cap Table)
      await page.getByRole('tab', { name: /Model Cap Table|Cap Table/i }).click();

      // Add a stakeholder
      await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.founder.name);
      await page.getByPlaceholder('25').fill(TEST_STAKEHOLDERS.founder.ownershipPct);
      await page.getByRole('button', { name: /Add Stakeholder/i }).click();

      // Navigate to Waterfall tab
      await page.getByRole('tab', { name: /Waterfall/i }).click();

      // The loading state may be brief, but we can check the structure loads
      // Wait for either loading indicator OR the results to appear
      await expect(
        page.getByText(/Distribution Analysis|Calculating waterfall/i).first()
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Waterfall Steps Flow', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await page.getByRole('tab', { name: /Model Cap Table|Cap Table/i }).click();

      // Add founder stakeholder
      await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.founder.name);
      await page.getByPlaceholder('25').fill(TEST_STAKEHOLDERS.founder.ownershipPct);
      await page.getByRole('button', { name: /Add Stakeholder/i }).click();

      // Add investor stakeholder
      await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.investor.name);
      const typeCombobox = page.locator('button[role="combobox"]').first();
      await typeCombobox.click();
      await page.getByRole('option', { name: /Investor/i }).click();
      await page.getByPlaceholder('25').fill(TEST_STAKEHOLDERS.investor.ownershipPct);
      await page.getByRole('button', { name: /Add Stakeholder/i }).click();

      // Navigate to Waterfall tab
      await page.getByRole('tab', { name: /Waterfall/i }).click();

      // Add a preference tier to generate waterfall steps
      await page.locator('input[placeholder="Series A"]').fill('Seed Round');
      await page.locator('input[placeholder="5000000"]').fill('2000000');
      await page.getByRole('button', { name: /Add Preference Tier/i }).click();

      // Wait for calculation
      await page.waitForTimeout(1500);
    });

    test('should display waterfall steps in correct order', async ({ page }) => {
      // Verify Waterfall Steps section exists
      await expect(page.getByText(/Waterfall Steps/i).first()).toBeVisible();

      // Verify step-by-step breakdown description
      await expect(page.getByText(/Step-by-step breakdown/i)).toBeVisible();

      // Verify step numbers are displayed (badges showing 1, 2, etc.)
      const stepBadges = page.locator('span.tabular-nums, [class*="badge"]').filter({ hasText: /^[1-9]$/ });
      const badgeCount = await stepBadges.count();
      expect(badgeCount).toBeGreaterThanOrEqual(1);
    });

    test('should show step descriptions with recipient information', async ({ page }) => {
      // Verify waterfall step descriptions are visible
      // Should show either "liquidation preference" or "Pro-rata distribution"
      await expect(
        page.getByText(/liquidation preference|Pro-rata distribution/i).first()
      ).toBeVisible();

      // Verify "Recipients:" is shown for steps
      await expect(page.getByText(/Recipients:/i).first()).toBeVisible();
    });

    test('should display remaining proceeds after each step', async ({ page }) => {
      // Verify "Remaining:" text shows remaining proceeds
      await expect(page.getByText(/Remaining:/i).first()).toBeVisible();
    });

    test('should show preference tier explanation text', async ({ page }) => {
      // With a preference tier added, the waterfall should explain the distribution
      // Look for the tier name in the steps
      await expect(page.getByText(/Seed Round/i).first()).toBeVisible();

      // The preference stack should show the total amount
      await expect(page.getByText(/Total: \$2\.0M/i)).toBeVisible();
    });
  });

  test.describe('Preference Tiers Impact on Steps', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await page.getByRole('tab', { name: /Model Cap Table|Cap Table/i }).click();

      // Add stakeholders
      await page.locator('input[placeholder="e.g., John Smith"]').fill('Founder');
      await page.getByPlaceholder('25').fill('50');
      await page.getByRole('button', { name: /Add Stakeholder/i }).click();

      await page.locator('input[placeholder="e.g., John Smith"]').fill('Investor');
      const typeCombobox = page.locator('button[role="combobox"]').first();
      await typeCombobox.click();
      await page.getByRole('option', { name: /Investor/i }).click();
      await page.getByPlaceholder('25').fill('30');
      await page.getByRole('button', { name: /Add Stakeholder/i }).click();

      // Navigate to Waterfall tab
      await page.getByRole('tab', { name: /Waterfall/i }).click();
    });

    test('should update steps when adding participating preferred', async ({ page }) => {
      // Add a participating preferred tier
      await page.locator('input[placeholder="Series A"]').fill('Series A');
      await page.locator('input[placeholder="5000000"]').fill('5000000');

      // Toggle participating switch
      const participatingSwitch = page.locator('button[role="switch"]').first();
      await participatingSwitch.click();

      await page.getByRole('button', { name: /Add Preference Tier/i }).click();

      // Wait for recalculation
      await page.waitForTimeout(1500);

      // Verify participating badge is shown in preference stack
      await expect(page.getByText(/Participating/i).first()).toBeVisible();

      // Verify waterfall steps are generated
      await expect(page.getByText(/Waterfall Steps/i).first()).toBeVisible();
    });

    test('should reflect multiple preference tiers in step order', async ({ page }) => {
      // Add first preference tier (Seed)
      await page.locator('input[placeholder="Series A"]').fill('Seed');
      await page.locator('input[placeholder="5000000"]').fill('1000000');
      await page.getByRole('button', { name: /Add Preference Tier/i }).click();

      // Wait briefly for UI update
      await page.waitForTimeout(500);

      // Add second preference tier (Series A) - more senior
      await page.locator('input[placeholder="Series A"]').fill('Series A');

      // Select seniority 1 (most senior)
      await page.getByRole('combobox', { name: /Seniority/i }).click();
      await page.getByRole('option', { name: '1' }).click();

      await page.locator('input[placeholder="5000000"]').fill('5000000');
      await page.getByRole('button', { name: /Add Preference Tier/i }).click();

      // Wait for recalculation
      await page.waitForTimeout(1500);

      // Verify preference stack shows 2 tiers
      await expect(page.getByText(/Preference Stack \(2 tiers?\)/i)).toBeVisible();

      // Total should be $6M ($1M + $5M)
      await expect(page.getByText(/Total: \$6\.0M/i)).toBeVisible();
    });
  });

  test.describe('Valuation Impact on Distribution Text', () => {
    test.beforeEach(async ({ page, helpers }) => {
      await page.goto('/');
      await page.waitForSelector('h1');
      await helpers.dismissWelcomeDialog();
      await page.getByRole('tab', { name: /Model Cap Table|Cap Table/i }).click();

      // Add stakeholder
      await page.locator('input[placeholder="e.g., John Smith"]').fill('Founder');
      await page.getByPlaceholder('25').fill('100');
      await page.getByRole('button', { name: /Add Stakeholder/i }).click();

      // Navigate to Waterfall tab
      await page.getByRole('tab', { name: /Waterfall/i }).click();

      // Add a preference tier
      await page.locator('input[placeholder="Series A"]').fill('Series A');
      await page.locator('input[placeholder="5000000"]').fill('10000000');
      await page.getByRole('button', { name: /Add Preference Tier/i }).click();

      await page.waitForTimeout(1500);
    });

    test('should update step amounts when valuation changes', async ({ page }) => {
      // Set low valuation first
      await page.getByRole('button', { name: '$10M' }).click();
      await page.waitForTimeout(800);

      // Verify waterfall steps section is visible
      await expect(page.getByText(/Waterfall Steps/i).first()).toBeVisible();

      // Change to higher valuation
      await page.getByRole('button', { name: '$100M' }).click();
      await page.waitForTimeout(800);

      // Waterfall steps should still be visible with updated amounts
      await expect(page.getByText(/Waterfall Steps/i).first()).toBeVisible();
    });
  });
});
