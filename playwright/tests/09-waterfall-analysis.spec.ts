import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/base';
import type { WorthItHelpers } from '../utils/helpers';
import { TIMEOUTS } from '../utils/test-data';

/**
 * Test Suite: Waterfall Analysis (Founder Mode)
 *
 * These tests verify:
 * - Founder mode navigation
 * - Adding stakeholders to cap table
 * - Adding preference tiers
 * - Exit valuation slider interaction
 * - Stacked bar chart updates
 * - Payout table amounts
 * - Waterfall steps breakdown
 *
 * NOTE: Every test/hook that calls `page.goto` must request the `helpers`
 * fixture. Creating that fixture is what wraps `page.goto` so the first-visit
 * welcome dialog is dismissed; without it the dialog's modal overlay swallows
 * the first click of the test. Tests that navigate only via a `beforeEach`
 * inherit the fixture from that hook and don't need to request it themselves.
 */

const TEST_STAKEHOLDERS = {
  founder: {
    name: 'Alice Founder',
    type: 'Founder',
    ownershipPct: 40,
    shareClass: 'Common',
  },
  investor: {
    name: 'VC Capital',
    type: 'Investor',
    ownershipPct: 30,
    shareClass: 'Preferred',
  },
  employee: {
    name: 'Bob Employee',
    type: 'Employee',
    ownershipPct: 10,
    shareClass: 'Common',
  },
};

/**
 * The founder dashboard's "Add Stakeholder" form.
 *
 * Once the cap table stops being empty, CapTableManager renders a second
 * "Add Stakeholder" control underneath, so every interaction with this form has
 * to be scoped. The dashboard's form is the one used here because it is present
 * whether or not the setup wizard is showing.
 */
function stakeholderForm(page: Page) {
  return page
    .locator('form')
    .filter({ has: page.locator('input[placeholder="e.g., John Smith"]') })
    .first();
}

/**
 * Set the stakeholder form's ownership percentage.
 *
 * "Ownership %" is a SliderField (min 0, max 100, step 0.1), not a plain number
 * input, so it has to be driven through the shared slider helper rather than
 * `fill()`.
 */
async function setOwnershipPct(helpers: WorthItHelpers, page: Page, pct: number) {
  await helpers.setSliderValue('Ownership %', pct, 0, 0.1, stakeholderForm(page));
}

/**
 * Dismiss the cap table setup wizard.
 *
 * CapTableManager renders a five-step wizard *instead of* its Cap Table /
 * Funding / Waterfall tabs while the cap table is still empty. Tests that need
 * those tabs without first adding a stakeholder have to skip it. The wizard
 * only mounts after hydration, so wait for either it or the tabs before
 * deciding.
 */
async function skipCapTableWizard(page: Page) {
  const skipWizard = page.getByRole('button', { name: /Skip Wizard/i });
  const waterfallTab = page.getByRole('tab', { name: /Waterfall/i });

  await expect(skipWizard.or(waterfallTab).first()).toBeVisible({
    timeout: TIMEOUTS.elementVisible,
  });

  if ((await skipWizard.count()) > 0) {
    await skipWizard.first().click();
    await expect(waterfallTab).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  }
}

/** Multipliers for the magnitude suffixes `formatLargeNumber` emits. */
const CURRENCY_SUFFIX_SCALE: Record<string, number> = { K: 1e3, M: 1e6, B: 1e9 };

/**
 * Read a rendered payout back as a number.
 *
 * Inverts `formatLargeNumber` ("$1.5M", "$750K", "$400", "-$2M"). Anything that
 * is not a currency amount returns NaN so the comparison fails loudly instead
 * of coercing to 0 and passing.
 */
function parsePayout(text: string): number {
  const match = /^(-?)\$([\d,]+(?:\.\d+)?)([KMB])?$/.exec(text.trim());
  if (!match) return Number.NaN;
  const scale = CURRENCY_SUFFIX_SCALE[match[3] ?? ''] ?? 1;
  return Number(match[2].replace(/,/g, '')) * scale * (match[1] === '-' ? -1 : 1);
}

/** Stakeholder | Investment | Payout | % of Exit | ROI */
const PAYOUT_COLUMN_INDEX = 2;

/**
 * The "Stakeholder Payouts" table.
 *
 * Identified by its own Payout header rather than by the surrounding card, so
 * the handle names exactly the table PAYOUT_COLUMN_INDEX is an index into.
 * Matched on the `th` element rather than the `columnheader` role: these
 * headers carry no `scope`, and Playwright's role engine does not resolve them.
 */
function payoutsTable(page: Page) {
  return page.locator('table').filter({ has: page.locator('th', { hasText: /^Payout$/ }) });
}

/**
 * The payout cell of the row a stakeholder owns in the Stakeholder Payouts table.
 *
 * Scoped to that one table: an unscoped row lookup also matches rows in every
 * other table on the page, and `.nth()` then counts cells across the merged
 * list -- landing on a neighbour table's column without raising strict mode.
 * `.first()` pins the row so the index stays within it.
 */
function payoutCell(page: Page, stakeholderName: string) {
  return payoutsTable(page)
    .getByRole('row')
    .filter({ hasText: stakeholderName })
    .first()
    .getByRole('cell')
    .nth(PAYOUT_COLUMN_INDEX);
}

const TEST_PREFERENCE_TIER = {
  name: 'Series A',
  seniority: '1 (Most Senior)',
  investmentAmount: '5000000',
  liquidationMultiplier: '1x (Standard)',
  participating: false,
};

test.describe('Founder Mode Navigation', () => {
  test('should switch to Founder mode', async ({ page, helpers }) => {
    await page.goto('/');

    // Click on "Model Cap Table" tab
    const founderTab = page.getByRole('tab', { name: /Model Cap Table/i });
    await founderTab.click();

    // Verify Cap Table section is visible
    await expect(page.getByText(/Cap Table/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should display three tabs in Founder mode: Cap Table, Funding, Waterfall', async ({ page, helpers }) => {
    await page.goto('/');

    // Switch to Founder mode
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();

    // Wait for the cap table manager to load
    await page.waitForSelector('text=/Cap Table/i', { timeout: TIMEOUTS.elementVisible });

    // The tabs only render once the setup wizard is out of the way
    await skipCapTableWizard(page);

    // Check for the three tabs
    const capTableTab = page.getByRole('tab', { name: /Cap Table/i }).first();
    const fundingTab = page.getByRole('tab', { name: /Funding/i }).first();
    const waterfallTab = page.getByRole('tab', { name: /Waterfall/i }).first();

    await expect(capTableTab).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(fundingTab).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(waterfallTab).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });
});

test.describe('Cap Table - Adding Stakeholders', () => {
  test.beforeEach(async ({ page, helpers }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i', { timeout: TIMEOUTS.elementVisible });
  });

  test('should add a founder stakeholder', async ({ page, helpers }) => {
    // Fill in stakeholder form
    const nameInput = stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]');
    await nameInput.fill(TEST_STAKEHOLDERS.founder.name);

    // Select type (Founder is default)
    const typeSelect = stakeholderForm(page).locator('button[role="combobox"]').filter({ hasText: /Founder/i }).first();
    await expect(typeSelect).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Set ownership percentage
    await setOwnershipPct(helpers, page, TEST_STAKEHOLDERS.founder.ownershipPct);

    // Submit form
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Verify stakeholder appears in list (use first() since name may appear multiple times)
    await expect(page.getByText(TEST_STAKEHOLDERS.founder.name).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    // Ownership percentage is shown in the stakeholder list. AnimatedPercentage
    // strips trailing zeros, so 40 renders as "40%", not "40.0%".
    await expect(page.getByText(`${TEST_STAKEHOLDERS.founder.ownershipPct}%`).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should add an investor stakeholder', async ({ page, helpers }) => {
    // Fill in stakeholder form
    const nameInput = stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]');
    await nameInput.fill(TEST_STAKEHOLDERS.investor.name);

    // Select type - click combobox and select Investor
    const typeCombobox = stakeholderForm(page).locator('button[role="combobox"]').first();
    await typeCombobox.click();
    await page.getByRole('option', { name: /Investor/i }).click();

    // Select share class - click combobox and select Preferred
    const shareClassCombobox = stakeholderForm(page).locator('button[role="combobox"]').nth(1);
    await shareClassCombobox.click();
    await page.getByRole('option', { name: /Preferred/i }).click();

    // Set ownership percentage
    await setOwnershipPct(helpers, page, TEST_STAKEHOLDERS.investor.ownershipPct);

    // Submit form
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Verify stakeholder appears in list (use first() since name may appear multiple times)
    await expect(page.getByText(TEST_STAKEHOLDERS.investor.name).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should display stakeholder count after adding multiple stakeholders', async ({ page, helpers }) => {
    // Add first stakeholder
    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill('Stakeholder 1');
    await setOwnershipPct(helpers, page, 30);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Add second stakeholder
    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill('Stakeholder 2');
    await setOwnershipPct(helpers, page, 20);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Verify stakeholder count
    await expect(page.getByText(/Stakeholders \(2\)/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should remove a stakeholder', async ({ page, helpers }) => {
    // Add a stakeholder
    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill('To Be Removed');
    await setOwnershipPct(helpers, page, 10);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Verify it was added (use first() since name appears in multiple places)
    await expect(page.getByText('To Be Removed').first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Delete is guarded by a confirmation dialog: the trash icon opens it and
    // the "Delete" action inside it performs the removal.
    await page.getByRole('button', { name: 'Delete To Be Removed' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click();

    // Verify it was removed everywhere it was listed
    await expect(page.getByText('To Be Removed')).toHaveCount(0, { timeout: TIMEOUTS.elementVisible });
  });
});

test.describe('Waterfall Tab - Preference Tiers', () => {
  test.beforeEach(async ({ page, helpers }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i', { timeout: TIMEOUTS.elementVisible });

    // Add stakeholders first
    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.founder.name);
    await setOwnershipPct(helpers, page, TEST_STAKEHOLDERS.founder.ownershipPct);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Navigate to Waterfall tab
    await page.getByRole('tab', { name: /Waterfall/i }).click();
    await page.waitForSelector('text=/Add Preference Tier/i', { timeout: TIMEOUTS.elementVisible });
  });

  test('should add a preference tier', async ({ page }) => {
    // Fill in preference tier form
    const roundNameInput = page.locator('input[placeholder="Series A"]');
    await roundNameInput.fill(TEST_PREFERENCE_TIER.name);

    // Fill investment amount
    const investmentInput = page.locator('input[placeholder="5000000"]');
    await investmentInput.fill(TEST_PREFERENCE_TIER.investmentAmount);

    // Submit form
    await page.getByRole('button', { name: /Add Preference Tier/i }).click();

    // Verify tier appears in list (exact match: the name also appears inside the waterfall steps text)
    await expect(page.getByText(TEST_PREFERENCE_TIER.name, { exact: true })).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(/\$5\.0M invested/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should keep preference tiers after leaving and returning to the tab', async ({ page }) => {
    // Radix unmounts a deselected tab panel, so a stack held only in the panel's
    // own state is destroyed by this round trip - silently, and a save would then
    // persist the empty stack.
    await page.locator('input[placeholder="Series A"]').fill(TEST_PREFERENCE_TIER.name);
    await page.locator('input[placeholder="5000000"]').fill(TEST_PREFERENCE_TIER.investmentAmount);
    await page.getByRole('button', { name: /Add Preference Tier/i }).click();
    await expect(page.getByText(/Preference Stack \(1 tier/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    await page.getByRole('tab', { name: 'Cap Table', exact: true }).click();
    await expect(page.getByText(/Add Preference Tier/i)).toBeHidden({ timeout: TIMEOUTS.elementVisible });
    await page.getByRole('tab', { name: /Waterfall/i }).click();

    await expect(page.getByText(/Preference Stack \(1 tier/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(TEST_PREFERENCE_TIER.name, { exact: true })).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should display preference stack count after adding tiers', async ({ page }) => {
    // Add first tier
    await page.locator('input[placeholder="Series A"]').fill('Series A');
    await page.locator('input[placeholder="5000000"]').fill('5000000');
    await page.getByRole('button', { name: /Add Preference Tier/i }).click();

    // Verify preference stack count
    await expect(page.getByText(/Preference Stack \(1 tier/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should toggle participating preferred', async ({ page }) => {
    // Add a tier
    await page.locator('input[placeholder="Series A"]').fill('Series B');
    await page.locator('input[placeholder="5000000"]').fill('10000000');

    // Toggle participating switch in the form
    const participatingSwitch = page.locator('button[role="switch"]').first();
    await participatingSwitch.click();

    // Submit
    await page.getByRole('button', { name: /Add Preference Tier/i }).click();

    // Verify participating badge is shown
    await expect(page.getByText(/Participating/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should show total preference amount', async ({ page }) => {
    // Add a tier with $5M
    await page.locator('input[placeholder="Series A"]').fill('Series A');
    await page.locator('input[placeholder="5000000"]').fill('5000000');
    await page.getByRole('button', { name: /Add Preference Tier/i }).click();

    // Verify total is shown in the preference stack card
    await expect(page.getByText(/Total: \$5\.0M/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });
});

test.describe('Waterfall Tab - Exit Valuation Slider', () => {
  test.beforeEach(async ({ page, helpers }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();

    // Add a stakeholder
    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.founder.name);
    await setOwnershipPct(helpers, page, TEST_STAKEHOLDERS.founder.ownershipPct);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Navigate to Waterfall tab
    await page.getByRole('tab', { name: /Waterfall/i }).click();
    await page.waitForSelector('text=/Exit Valuation/i', { timeout: TIMEOUTS.elementVisible });
  });

  test('should display exit valuation slider', async ({ page }) => {
    await expect(page.getByText(/Exit Valuation/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.locator('[role="slider"]').first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should use quick select buttons for valuation', async ({ page }) => {
    // Click $100M quick select button
    const quickSelectButton = page.getByRole('button', { name: '$100M' });
    await quickSelectButton.click();

    // Verify the value changed (check input field shows 100)
    const valueInput = page.locator('input.text-4xl');
    await expect(valueInput).toHaveValue('100', { timeout: TIMEOUTS.formInput });
  });

  test('should allow manual valuation input', async ({ page }) => {
    // Find the valuation input and change it
    const valueInput = page.locator('input.text-4xl');
    await valueInput.fill('75');
    await valueInput.blur();

    // Verify the display shows $75M (formatLargeNumber drops the ".0")
    await expect(page.getByText(/\$75M exit valuation/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should update slider when using quick select', async ({ page }) => {
    // Click $250M quick select button
    await page.getByRole('button', { name: '$250M' }).click();

    // Verify the button is now "default" variant (selected state)
    const selectedButton = page.getByRole('button', { name: '$250M' });
    await expect(selectedButton).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Verify the value input shows 250
    const valueInput = page.locator('input.text-4xl');
    await expect(valueInput).toHaveValue('250', { timeout: TIMEOUTS.formInput });
  });
});

test.describe('Waterfall Tab - Chart and Table Views', () => {
  test.beforeEach(async ({ page, helpers }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();

    // Add stakeholders
    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.founder.name);
    await setOwnershipPct(helpers, page, TEST_STAKEHOLDERS.founder.ownershipPct);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.investor.name);
    await setOwnershipPct(helpers, page, TEST_STAKEHOLDERS.investor.ownershipPct);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Navigate to Waterfall tab
    await page.getByRole('tab', { name: /Waterfall/i }).click();
    await page.waitForSelector('text=/Distribution Analysis/i', { timeout: TIMEOUTS.elementVisible });
  });

  test('should display stacked bar chart by default', async ({ page }) => {
    // Verify chart view is active (Chart tab is selected)
    const chartTab = page.getByRole('tab', { name: /Chart/i });
    await expect(chartTab).toHaveAttribute('data-state', 'active', { timeout: TIMEOUTS.elementPresent });

    // Verify chart is visible (Recharts container)
    await expect(page.locator('.recharts-responsive-container')).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should switch to table view', async ({ page }) => {
    // Click Table tab (use exact match to avoid matching "Cap Table")
    await page.getByRole('tab', { name: 'Table', exact: true }).click();

    // Verify table view shows stakeholder payouts
    await expect(page.getByText(/Stakeholder Payouts/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should update chart when valuation changes', async ({ page }) => {
    // Get initial state of chart
    const chartContainer = page.locator('.recharts-responsive-container');
    await expect(chartContainer).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Change valuation using quick select
    await page.getByRole('button', { name: '$100M' }).click();

    // Wait for API response and chart update
    await page.waitForTimeout(500);

    // Chart should still be visible (updated)
    await expect(chartContainer).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should show payout table with correct columns', async ({ page }) => {
    // Switch to table view (use exact match to avoid matching "Cap Table")
    await page.getByRole('tab', { name: 'Table', exact: true }).click();

    // Verify table headers
    await expect(page.getByText(/Stakeholder Payouts/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(/Exit:/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should read payouts from the payouts table, not another table naming the same stakeholder', async ({
    page,
  }) => {
    // `payoutCell` looked rows up across the whole page. Every other table here
    // has a different column layout, so as soon as one of them mentions a
    // stakeholder the payout column index addresses the wrong cell -- and
    // silently, because `.nth()` never raises a strict-mode error.
    //
    // The decoy stands in for that neighbour table (the cap table listing, the
    // exit calculator, the dilution table): same name, columns that do not line
    // up. Injected rather than waited for so the guard does not depend on which
    // of those happens to be mounted today.
    await page.getByRole('tab', { name: 'Table', exact: true }).click();
    await expect(payoutsTable(page)).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    await page.evaluate((name) => {
      const decoy = document.createElement('table');
      const row = decoy.insertRow();
      for (const text of [name, 'Founder', '40.0%', 'Common', '-']) {
        row.insertCell().textContent = text;
      }
      document.body.prepend(decoy);
    }, TEST_STAKEHOLDERS.founder.name);

    const payout = parsePayout(
      await payoutCell(page, TEST_STAKEHOLDERS.founder.name).innerText()
    );
    expect(payout).toBeGreaterThan(0);
  });

  test('should pay each stakeholder a real amount, in proportion to ownership', async ({
    page,
  }) => {
    // A stakeholder saved with zero shares still renders a complete payout row,
    // so every assertion about the table being *present* passes while every
    // number in it is $0. This asserts on the money instead, and on the
    // ordering between two different ownership stakes, so a payout path that
    // pays everyone the same wrong number cannot satisfy it either.
    await page.getByRole('tab', { name: 'Table', exact: true }).click();

    const founderCell = payoutCell(page, TEST_STAKEHOLDERS.founder.name);
    const investorCell = payoutCell(page, TEST_STAKEHOLDERS.investor.name);
    await expect(founderCell).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    const founderPayout = parsePayout(await founderCell.innerText());
    const investorPayout = parsePayout(await investorCell.innerText());

    expect(founderPayout).toBeGreaterThan(0);
    expect(investorPayout).toBeGreaterThan(0);
    // 40% of the cap table against 30% of it.
    expect(founderPayout).toBeGreaterThan(investorPayout);
  });
});

test.describe('Waterfall Tab - Waterfall Steps Breakdown', () => {
  test.beforeEach(async ({ page, helpers }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();

    // Add founder stakeholder
    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.founder.name);
    await setOwnershipPct(helpers, page, TEST_STAKEHOLDERS.founder.ownershipPct);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Add investor stakeholder
    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.investor.name);

    const typeCombobox = stakeholderForm(page).locator('button[role="combobox"]').first();
    await typeCombobox.click();
    await page.getByRole('option', { name: /Investor/i }).click();

    await setOwnershipPct(helpers, page, TEST_STAKEHOLDERS.investor.ownershipPct);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Navigate to Waterfall tab
    await page.getByRole('tab', { name: /Waterfall/i }).click();

    // Add a preference tier
    await page.locator('input[placeholder="Series A"]').fill('Series A');
    await page.locator('input[placeholder="5000000"]').fill('5000000');
    await page.getByRole('button', { name: /Add Preference Tier/i }).click();

    // Wait for API calculation
    await page.waitForTimeout(1000);
  });

  test('should display waterfall steps section', async ({ page }) => {
    await expect(page.getByText(/Waterfall Steps/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(/Step-by-step breakdown/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should show step numbers and descriptions', async ({ page }) => {
    // Verify step badges and descriptions are visible
    const waterfallSteps = page.locator('text=/liquidation preference|Pro-rata distribution/i');
    await expect(waterfallSteps.first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should show remaining proceeds after each step', async ({ page }) => {
    // Verify "Remaining:" text is shown for steps
    await expect(page.getByText(/Remaining:/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should update steps when preference tier is added', async ({ page }) => {
    // Add another preference tier
    await page.locator('input[placeholder="Series A"]').fill('Series B');

    // Explicitly select seniority (the form reset doesn't properly set seniority after adding first tier)
    await page.getByRole('combobox', { name: /Seniority/i }).click();
    await page.getByRole('option', { name: '2' }).click();

    await page.locator('input[placeholder="5000000"]').fill('10000000');
    await page.getByRole('button', { name: /Add Preference Tier/i }).click();

    // Wait for recalculation
    await page.waitForTimeout(1000);

    // Verify preference stack shows 2 tiers after adding second one
    await expect(page.getByText(/Preference Stack \(2 tiers?\)/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });
});

test.describe('Waterfall Tab - Complete Flow', () => {
  test('should complete full waterfall analysis flow', async ({ page, helpers }) => {
    await page.goto('/');

    // Step 1: Switch to Founder mode
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();

    // Step 2: Add multiple stakeholders
    // Founder
    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill('Alice Founder');
    await setOwnershipPct(helpers, page, 50);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Employee
    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill('Bob Employee');
    await setOwnershipPct(helpers, page, 10);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Investor
    await stakeholderForm(page).locator('input[placeholder="e.g., John Smith"]').fill('VC Fund');
    const typeCombobox = stakeholderForm(page).locator('button[role="combobox"]').first();
    await typeCombobox.click();
    await page.getByRole('option', { name: /Investor/i }).click();
    await setOwnershipPct(helpers, page, 30);
    await stakeholderForm(page).getByRole('button', { name: /Add Stakeholder/i }).click();

    // Verify all stakeholders added
    await expect(page.getByText(/Stakeholders \(3\)/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Step 3: Navigate to Waterfall tab
    await page.getByRole('tab', { name: /Waterfall/i }).click();

    // Step 4: Add preference tier
    await page.locator('input[placeholder="Series A"]').fill('Series A');
    await page.locator('input[placeholder="5000000"]').fill('5000000');
    await page.getByRole('button', { name: /Add Preference Tier/i }).click();

    // Step 5: Adjust exit valuation
    await page.getByRole('button', { name: '$50M' }).click();

    // Wait for calculation
    await page.waitForTimeout(1000);

    // Step 6: Verify results
    // Chart is visible
    await expect(page.locator('.recharts-responsive-container')).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Waterfall steps are shown
    await expect(page.getByText(/Waterfall Steps/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Step 7: Switch to table view (use exact match to avoid matching "Cap Table")
    await page.getByRole('tab', { name: 'Table', exact: true }).click();
    await expect(page.getByText(/Stakeholder Payouts/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Step 8: Change valuation and verify update
    await page.getByRole('button', { name: '$100M' }).click();
    await page.waitForTimeout(500);

    // Verify exit badge updated (format is "Exit: $100.00M")
    await expect(page.getByText(/Exit:.*100/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should handle empty cap table gracefully', async ({ page, helpers }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();

    // The Waterfall tab is hidden behind the setup wizard while the cap table
    // is empty, which is exactly the state this test exercises
    await skipCapTableWizard(page);

    // Navigate directly to Waterfall tab without adding stakeholders
    await page.getByRole('tab', { name: /Waterfall/i }).click();

    // Should show empty state message (both the chart and table views render one)
    await expect(page.getByText(/Add stakeholders to your cap table/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });
});
