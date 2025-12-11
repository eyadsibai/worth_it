import { test, expect } from '../fixtures/base';
import * as fs from 'fs';

/**
 * Test Suite: Scenario Management (Founder Mode)
 *
 * These tests verify:
 * - Saving scenarios to localStorage
 * - Loading saved scenarios
 * - Deleting scenarios
 * - Exporting scenarios as JSON
 * - Importing scenarios from JSON files
 */

const TEST_SCENARIO_NAME = 'Test Funding Scenario';
const TEST_STAKEHOLDER = {
  name: 'Alice Founder',
  ownershipPct: 40,
};

test.describe('Scenario Management - Save Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Navigate to Founder mode
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i');

    // Add a stakeholder
    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDER.name);
    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDER.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();
  });

  test('should display "Save Current" button', async ({ page }) => {
    // Look for the Saved Scenarios card - use text selector for CardTitle
    const scenarioCardTitle = page.getByText('Saved Scenarios', { exact: true });
    await expect(scenarioCardTitle).toBeVisible();

    // Find Save Current button
    const saveButton = page.getByRole('button', { name: /Save Current/i });
    await expect(saveButton).toBeVisible();
  });

  test('should show name input when Save Current is clicked', async ({ page }) => {
    // Click Save Current button
    await page.getByRole('button', { name: /Save Current/i }).click();

    // Verify name input appears
    const nameInput = page.getByPlaceholder(/Scenario name/i);
    await expect(nameInput).toBeVisible();

    // Verify Save Scenario and Cancel buttons appear
    await expect(page.getByRole('button', { name: /Save Scenario/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Cancel/i })).toBeVisible();
  });

  test('should save scenario with entered name', async ({ page }) => {
    // Click Save Current button
    await page.getByRole('button', { name: /Save Current/i }).click();

    // Enter scenario name
    const nameInput = page.getByPlaceholder(/Scenario name/i);
    await nameInput.fill(TEST_SCENARIO_NAME);

    // Click Save Scenario
    await page.getByRole('button', { name: /Save Scenario/i }).click();

    // Verify scenario appears in the list
    await expect(page.getByText(TEST_SCENARIO_NAME)).toBeVisible();
  });

  test('should cancel saving when Cancel is clicked', async ({ page }) => {
    // Click Save Current button
    await page.getByRole('button', { name: /Save Current/i }).click();

    // Enter scenario name
    const nameInput = page.getByPlaceholder(/Scenario name/i);
    await nameInput.fill('Should Not Be Saved');

    // Click Cancel
    await page.getByRole('button', { name: /Cancel/i }).click();

    // Verify we're back to Save Current state
    await expect(page.getByRole('button', { name: /Save Current/i })).toBeVisible();

    // Verify scenario was not saved
    await expect(page.getByText('Should Not Be Saved')).not.toBeVisible();
  });

  test('should disable Save Scenario button when name is empty', async ({ page }) => {
    // Click Save Current button
    await page.getByRole('button', { name: /Save Current/i }).click();

    // Save Scenario button should be disabled
    const saveScenarioButton = page.getByRole('button', { name: /Save Scenario/i });
    await expect(saveScenarioButton).toBeDisabled();
  });

  test('should save scenario on Enter key press', async ({ page }) => {
    // Click Save Current button
    await page.getByRole('button', { name: /Save Current/i }).click();

    // Enter scenario name and press Enter
    const nameInput = page.getByPlaceholder(/Scenario name/i);
    await nameInput.fill('Enter Key Scenario');
    await nameInput.press('Enter');

    // Verify scenario was saved
    await expect(page.getByText('Enter Key Scenario')).toBeVisible();
  });
});

test.describe('Scenario Management - Load Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage and set up a saved scenario
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // Navigate to Founder mode and add stakeholder
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i');

    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDER.name);
    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDER.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Save a scenario
    await page.getByRole('button', { name: /Save Current/i }).click();
    await page.getByPlaceholder(/Scenario name/i).fill(TEST_SCENARIO_NAME);
    await page.getByRole('button', { name: /Save Scenario/i }).click();
    await expect(page.getByText(TEST_SCENARIO_NAME)).toBeVisible();
  });

  test('should display load button for saved scenarios', async ({ page }) => {
    // Find the scenario row
    const scenarioRow = page.locator('div').filter({ hasText: TEST_SCENARIO_NAME }).first();

    // Find load button (FolderOpen icon)
    const loadButton = scenarioRow.getByRole('button', { name: /Load/i });
    await expect(loadButton).toBeVisible();
  });

  test('should load scenario when load button is clicked', async ({ page }) => {
    // Clear the current cap table by removing the stakeholder
    // Find the stakeholder in the list and click its remove button
    const stakeholderText = page.getByText(TEST_STAKEHOLDER.name).first();
    await expect(stakeholderText).toBeVisible();

    // The remove button is in the same row - find it relative to the stakeholder card
    const stakeholderCard = page.locator('[class*="terminal-card"]').filter({ hasText: /Stakeholders/ });
    const removeButton = stakeholderCard.locator('button').filter({ has: page.locator('svg.lucide-trash-2') });
    await removeButton.click();

    // Verify stakeholder is removed (the Stakeholders card hides when empty)
    await expect(page.getByText(TEST_STAKEHOLDER.name)).not.toBeVisible();

    // Load the saved scenario
    const scenarioRow = page.locator('div').filter({ hasText: TEST_SCENARIO_NAME }).first();
    const loadButton = scenarioRow.getByRole('button', { name: /Load/i });
    await loadButton.click();

    // Verify stakeholder is restored
    await expect(page.getByText(TEST_STAKEHOLDER.name).first()).toBeVisible();
  });
});

test.describe('Scenario Management - Delete Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i');

    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDER.name);
    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDER.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Save a scenario
    await page.getByRole('button', { name: /Save Current/i }).click();
    await page.getByPlaceholder(/Scenario name/i).fill('Scenario To Delete');
    await page.getByRole('button', { name: /Save Scenario/i }).click();
    await expect(page.getByText('Scenario To Delete')).toBeVisible();
  });

  test('should display delete button for saved scenarios', async ({ page }) => {
    const scenarioRow = page.locator('div').filter({ hasText: 'Scenario To Delete' }).first();
    const deleteButton = scenarioRow.getByRole('button', { name: /Delete/i });
    await expect(deleteButton).toBeVisible();
  });

  test('should delete scenario when delete button is clicked', async ({ page }) => {
    const scenarioRow = page.locator('div').filter({ hasText: 'Scenario To Delete' }).first();
    const deleteButton = scenarioRow.getByRole('button', { name: /Delete/i });
    await deleteButton.click();

    // Verify scenario is removed
    await expect(page.getByText('Scenario To Delete')).not.toBeVisible();
  });
});

test.describe('Scenario Management - Export/Import Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i');

    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDER.name);
    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDER.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Save a scenario
    await page.getByRole('button', { name: /Save Current/i }).click();
    await page.getByPlaceholder(/Scenario name/i).fill('Export Test Scenario');
    await page.getByRole('button', { name: /Save Scenario/i }).click();
    await expect(page.getByText('Export Test Scenario')).toBeVisible();
  });

  test('should display export button for saved scenarios', async ({ page }) => {
    const scenarioRow = page.locator('div').filter({ hasText: 'Export Test Scenario' }).first();
    // The button has sr-only text "Export JSON"
    const exportButton = scenarioRow.getByRole('button', { name: /Export JSON/i });
    await expect(exportButton).toBeVisible();
  });

  test('should trigger JSON download on export click', async ({ page }) => {
    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    const scenarioRow = page.locator('div').filter({ hasText: 'Export Test Scenario' }).first();
    const exportButton = scenarioRow.getByRole('button', { name: /Export JSON/i });
    await exportButton.click();

    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/scenario.*\.json/i);
  });

  test('should export valid JSON with scenario data', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');

    const scenarioRow = page.locator('div').filter({ hasText: 'Export Test Scenario' }).first();
    await scenarioRow.getByRole('button', { name: /Export JSON/i }).click();

    const download = await downloadPromise;
    const downloadPath = await download.path();

    if (downloadPath) {
      const content = fs.readFileSync(downloadPath, 'utf-8');
      const data = JSON.parse(content);

      // Verify structure
      expect(data).toHaveProperty('name', 'Export Test Scenario');
      expect(data).toHaveProperty('capTable');
      expect(data.capTable).toHaveProperty('stakeholders');
    }
  });

  test('should display import button', async ({ page }) => {
    // Import button uses asChild which renders as a span in a label
    const importButton = page.getByText('Import', { exact: true });
    await expect(importButton).toBeVisible();
  });

  test('should import scenario from JSON file', async ({ page }) => {
    // Create a test JSON file
    const testScenario = {
      id: 'imported-scenario-123',
      name: 'Imported Scenario',
      capTable: {
        stakeholders: [
          {
            id: '1',
            name: 'Imported Founder',
            type: 'founder',
            shares: 1000000,
            ownership_pct: 50,
            share_class: 'common',
          },
        ],
        total_shares: 2000000,
        option_pool_pct: 10,
      },
      instruments: [],
      preferenceTiers: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Write to temp file
    const tempFile = '/tmp/test-import-scenario.json';
    fs.writeFileSync(tempFile, JSON.stringify(testScenario));

    // Find the hidden file input and set the file
    const fileInput = page.locator('input[type="file"][accept=".json"]');
    await fileInput.setInputFiles(tempFile);

    // Wait for import to complete and verify
    await expect(page.getByText('Imported Scenario')).toBeVisible({ timeout: 5000 });

    // Clean up
    fs.unlinkSync(tempFile);
  });
});

test.describe('Scenario Management - Empty State', () => {
  test('should show empty state when no scenarios saved', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i');

    // Verify empty state message
    await expect(page.getByText(/No saved scenarios yet/i)).toBeVisible();
  });
});

test.describe('Scenario Management - Persistence', () => {
  test('should persist scenarios across page reloads', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i');

    // Add stakeholder
    await page.locator('input[placeholder="e.g., John Smith"]').fill(TEST_STAKEHOLDER.name);
    await page.getByPlaceholder('25').fill(TEST_STAKEHOLDER.ownershipPct.toString());
    await page.getByRole('button', { name: /Add Stakeholder/i }).click();

    // Save scenario
    await page.getByRole('button', { name: /Save Current/i }).click();
    await page.getByPlaceholder(/Scenario name/i).fill('Persistent Scenario');
    await page.getByRole('button', { name: /Save Scenario/i }).click();

    // Reload page
    await page.reload();
    await page.getByRole('tab', { name: /I'm a Founder/i }).click();
    await page.waitForSelector('text=/Add Stakeholder/i');

    // Verify scenario still exists
    await expect(page.getByText('Persistent Scenario')).toBeVisible();
  });
});
