import { test, expect } from '../fixtures/base';
import { TIMEOUTS } from '../utils/test-data';
import * as fs from 'fs';

/**
 * Test Suite: Export Functionality (Founder Mode)
 *
 * These tests verify:
 * - Export menu visibility and interaction
 * - CSV export of cap table data
 * - PDF export of cap table data
 * - Export with stakeholder data
 */

const TEST_STAKEHOLDERS = {
  founder: {
    name: 'Alice Founder',
    ownershipPct: 40,
  },
  investor: {
    name: 'VC Capital',
    ownershipPct: 30,
  },
};

test.describe('Export Menu - Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i', { timeout: TIMEOUTS.elementVisible });
  });

  test('should display export button in cap table header', async ({ page }) => {
    // Look for the export menu button (dropdown trigger)
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should open export dropdown menu on click', async ({ page }) => {
    // Click the export button
    const exportButton = page.getByRole('button', { name: /export/i });
    await exportButton.click();

    // Verify dropdown menu items are visible (use first() since there may be multiple)
    await expect(page.getByRole('menuitem', { name: /csv/i }).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
    await expect(page.getByRole('menuitem', { name: /pdf/i }).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });
});

test.describe('Export Menu - CSV Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i', { timeout: TIMEOUTS.elementVisible });

    // Add stakeholders for export
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

    // Verify stakeholders were added
    await expect(page.getByText(/Stakeholders \(2\)/i)).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should trigger CSV download on click', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: TIMEOUTS.calculation });

    // Click export button
    const exportButton = page.getByRole('button', { name: /export/i });
    await exportButton.click();

    // Click CSV export option (use first() since there may be multiple menus)
    await page.getByRole('menuitem', { name: /csv/i }).first().click();

    // Wait for download and verify
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/cap-table.*\.csv/i);
  });

  test('should include stakeholder data in CSV export', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: TIMEOUTS.calculation });

    // Click export and select CSV (use first() since there may be multiple menus)
    await page.getByRole('button', { name: /export/i }).click();
    await page.getByRole('menuitem', { name: /csv/i }).first().click();

    // Get download and save to temp file for verification
    const download = await downloadPromise;
    const downloadPath = await download.path();

    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf-8');

      // Verify CSV headers
      expect(content).toContain('Name');
      expect(content).toContain('Ownership');

      // Verify stakeholder data is present
      expect(content).toContain(TEST_STAKEHOLDERS.founder.name);
      expect(content).toContain(TEST_STAKEHOLDERS.investor.name);
    }
  });
});

test.describe('Export Menu - PDF Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i', { timeout: TIMEOUTS.elementVisible });

    // Add a stakeholder
    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDERS.founder.name);
    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDERS.founder.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();
  });

  test('should trigger PDF download on click', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: TIMEOUTS.calculation });

    // Click export button
    await page.getByRole('button', { name: /export/i }).click();

    // Click PDF export option
    await page.getByRole('menuitem', { name: /pdf/i }).click();

    // Wait for download and verify
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/cap-table.*\.pdf/i);
  });

  test('should generate valid PDF file', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download', { timeout: TIMEOUTS.calculation });

    // Click export and select PDF
    await page.getByRole('button', { name: /export/i }).click();
    await page.getByRole('menuitem', { name: /pdf/i }).click();

    // Get download and verify it's a valid PDF
    const download = await downloadPromise;
    const downloadPath = await download.path();

    if (downloadPath) {
      const content = fs.readFileSync(downloadPath);
      // PDF files start with %PDF
      expect(content.toString('utf-8', 0, 4)).toBe('%PDF');
    }
  });
});

test.describe('Export Menu - Empty State', () => {
  test('should still allow export with empty cap table', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i', { timeout: TIMEOUTS.elementVisible });

    // Export button should still be visible
    const exportButton = page.getByRole('button', { name: /export/i });
    await expect(exportButton).toBeVisible({ timeout: TIMEOUTS.elementVisible });

    // Should be able to open dropdown
    await exportButton.click();
    await expect(page.getByRole('menuitem', { name: /csv/i }).first()).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });
});
