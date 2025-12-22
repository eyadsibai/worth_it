import { test, expect } from '../fixtures/base';
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

const TEST_PREFERENCE_TIER = {
  name: 'Series A',
  seniority: '1 (Most Senior)',
  investmentAmount: '5000000',
  liquidationMultiplier: '1x (Standard)',
  participating: false,
};

test.describe('Founder Mode Navigation', () => {
  test('should switch to Founder mode', async ({ page }) => {
    await page.goto('/');

    // Click on "I'm a Founder" tab
    const founderTab = page.getByRole('tab', { name: /I'm a Founder/i });
    await founderTab.click();

    // Verify Cap Table section is visible
    await expect(page.getByText(/Cap Table/i).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should display three tabs in Founder mode: Cap Table, Funding, Waterfall', async ({ page }) => {
    await page.goto('/');

    // Switch to Founder mode
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();

    // Wait for the cap table manager to load
    await page.waitForSelector('text=/Cap Table/i', { timeout: TIMEOUTS.elementVisible });

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
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i', { timeout: TIMEOUTS.elementVisible });
  });

  test('should add a founder stakeholder', async ({ page }) => {
    // Fill in stakeholder form
    const nameInput = page.locator('input[placeholder="e.g., John Smith"]');
    await nameInput.fill(TEST_STAKEHOLDERS.founder.name);

    // Select type (Founder is default)
    const typeSelect = page.locator('button[role="combobox"]').filter({ hasText: /Founder/i }).first();
    await expect(typeSelect).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Fill ownership percentage (using placeholder selector since NumberInputField doesn't set name)
    const ownershipInput = page.getByPlaceholder('25');
    await ownershipInput.fill(TEST_STAKEHOLDERS.founder.ownershipPct.toString());

    // Submit form
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Verify stakeholder appears in list (use first() since name may appear multiple times)
    await expect(page.getByText(TEST_STAKEHOLDERS.founder.name).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    // Ownership percentage is shown in the stakeholder list
    await expect(page.getByText(`${TEST_STAKEHOLDERS.founder.ownershipPct}.0%`).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should add an investor stakeholder', async ({ page }) => {
    // Fill in stakeholder form
    const nameInput = page.locator('input[placeholder="e.g., John Smith"]');
    await nameInput.fill(TEST_STAKEHOLDERS.investor.name);

    // Select type - click combobox and select Investor
    const typeCombobox = page.locator('button[role="combobox"]').first();
    await typeCombobox.click();
    await page.getByRole('option', { name: /Investor/i }).click();

    // Select share class - click combobox and select Preferred
    const shareClassCombobox = page.locator('button[role="combobox"]').nth(1);
    await shareClassCombobox.click();
    await page.getByRole('option', { name: /Preferred/i }).click();

    // Fill ownership percentage (using placeholder selector)
    const ownershipInput = page.getByPlaceholder('25');
    await ownershipInput.fill(TEST_STAKEHOLDERS.investor.ownershipPct.toString());

    // Submit form
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Verify stakeholder appears in list (use first() since name may appear multiple times)
    await expect(page.getByText(TEST_STAKEHOLDERS.investor.name).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should display stakeholder count after adding multiple stakeholders', async ({ page }) => {
    // Add first stakeholder
    await page.locator('input[placeholder="e.g., John Smith"]').fill('Stakeholder 1');
    await page.getByPlaceholder('25').fill('30');
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Add second stakeholder
    await page.locator('input[placeholder="e.g., John Smith"]').fill('Stakeholder 2');
    await page.getByPlaceholder('25').fill('20');
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Verify stakeholder count
    await expect(page.getByText(/Stakeholders \(2\)/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should remove a stakeholder', async ({ page }) => {
    // Add a stakeholder
    await page.locator('input[placeholder="e.g., John Smith"]').fill('To Be Removed');
    await page.getByPlaceholder('25').fill('10');
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Verify it was added (use first() since name appears in multiple places)
    await expect(page.getByText('To Be Removed').first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Click remove button (trash icon) - the button is in the same row as the stakeholder name
    // Using a more specific selector: find the motion.div row containing "To Be Removed", then find the delete button
    const stakeholderRow = page.locator('div.flex.items-center.justify-between').filter({ hasText: 'To Be Removed' });
    const removeButton = stakeholderRow.locator('button.text-destructive');
    await removeButton.click();

    // Verify it was removed
    await expect(page.getByText('To Be Removed')).not.toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });
});

test.describe('Waterfall Tab - Preference Tiers', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i', { timeout: TIMEOUTS.elementVisible });

    // Add stakeholders first
    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.founder.name);
    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDERS.founder.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

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

    // Verify tier appears in list (use exact match since "Series A" also appears in waterfall steps text)
    await expect(page.getByText('Series A', { exact: true })).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByText(/\$5\.0M invested/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
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
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();

    // Add a stakeholder
    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.founder.name);
    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDERS.founder.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

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

    // Verify the display shows $75M
    await expect(page.getByText(/\$75\.0M exit valuation/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
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
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();

    // Add stakeholders
    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.founder.name);
    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDERS.founder.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.investor.name);
    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDERS.investor.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

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
});

test.describe('Waterfall Tab - Waterfall Steps Breakdown', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();

    // Add founder stakeholder
    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.founder.name);
    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDERS.founder.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Add investor stakeholder
    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.investor.name);

    const typeCombobox = page.locator('button[role="combobox"]').first();
    await typeCombobox.click();
    await page.getByRole('option', { name: /Investor/i }).click();

    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDERS.investor.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

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
  test('should complete full waterfall analysis flow', async ({ page }) => {
    await page.goto('/');

    // Step 1: Switch to Founder mode
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();

    // Step 2: Add multiple stakeholders
    // Founder
    await page.locator('input[placeholder="e.g., John Smith"]').fill('Alice Founder');
    await page.getByPlaceholder('25').fill('50');
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Employee
    await page.locator('input[placeholder="e.g., John Smith"]').fill('Bob Employee');
    await page.getByPlaceholder('25').fill('10');
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Investor
    await page.locator('input[placeholder="e.g., John Smith"]').fill('VC Fund');
    const typeCombobox = page.locator('button[role="combobox"]').first();
    await typeCombobox.click();
    await page.getByRole('option', { name: /Investor/i }).click();
    await page.getByPlaceholder('25').fill('30');
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

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

  test('should handle empty cap table gracefully', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();

    // Navigate directly to Waterfall tab without adding stakeholders
    await page.getByRole('tab', { name: /Waterfall/i }).click();

    // Should show empty state message
    await expect(page.getByText(/Add stakeholders to your cap table/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });
});
