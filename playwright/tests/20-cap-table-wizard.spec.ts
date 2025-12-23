import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Cap Table Quick-Start Wizard (#146)
 *
 * These tests verify:
 * - Wizard appears automatically when cap table is empty
 * - Complete wizard flow through all 5 steps
 * - Skip wizard functionality persists in localStorage
 * - Manual wizard trigger via button
 * - Data transformation from wizard to cap table format
 */

test.describe('Cap Table Wizard - Automatic Display', () => {
  test.beforeEach(async ({ page, helpers }) => {
    // Navigate to app, clear storage, then reload for clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await helpers.dismissWelcomeDialog();

    // Navigate to Founder mode and wait for wizard
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();
    await page.waitForTimeout(300); // Wait for React state to settle
  });

  test('should display wizard when cap table is empty', async ({ page }) => {
    // Wait for wizard to appear
    await expect(page.getByText(/Who are the founders/i)).toBeVisible({ timeout: 10000 });

    // Verify progress indicator shows step 1
    await expect(page.getByText(/Step 1/i)).toBeVisible();
  });

  test('should show skip wizard button on first step', async ({ page }) => {
    // Wait for wizard
    await page.waitForSelector('text=/Who are the founders/i');

    // Verify skip button is visible
    await expect(page.getByRole('button', { name: /Skip Wizard/i })).toBeVisible();
  });

  test('should persist skip preference in localStorage', async ({ page, helpers }) => {
    // Wait for wizard and click skip
    await page.waitForSelector('text=/Who are the founders/i');
    await page.getByRole('button', { name: /Skip Wizard/i }).click();

    // Verify wizard is hidden and main cap table view is shown
    await expect(page.getByText(/Who are the founders/i)).not.toBeVisible();

    // Navigate fresh and verify wizard doesn't appear again
    await page.goto('/');
    await helpers.dismissWelcomeDialog();
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();

    // Wait for the main cap table UI (Add Stakeholder button - use role for specificity)
    await expect(page.getByRole('button', { name: /Add Stakeholder/i })).toBeVisible({ timeout: 10000 });

    // Wizard should not appear
    await expect(page.getByText(/Who are the founders/i)).not.toBeVisible();
  });
});

test.describe('Cap Table Wizard - Complete Flow', () => {
  test.beforeEach(async ({ page, helpers }) => {
    // Navigate to app, clear storage, then reload for clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await helpers.dismissWelcomeDialog();

    // Navigate to Founder mode and wait for wizard
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();
    await page.waitForSelector('text=/Who are the founders/i', { timeout: 10000 });
  });

  test('should complete full wizard flow with founders only', async ({ page }) => {
    // Step 1: Founders
    await expect(page.getByText(/Step 1/i)).toBeVisible();

    // Fill in founder names
    const nameInputs = page.getByPlaceholder(/Founder name/i);
    await nameInputs.first().fill('Alice Founder');
    await nameInputs.nth(1).fill('Bob Cofounder');

    // Click Next (use exact to avoid matching Next.js DevTools)
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2: Option Pool
    await expect(page.getByText(/Reserve equity for employees/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Step 2/i)).toBeVisible();

    // Keep default 15% option pool and click Next
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 3: Advisors - Should show "ask first" question
    await expect(page.getByText(/Do you have any advisors/i)).toBeVisible({ timeout: 5000 });

    // Click "No" to skip advisors
    await page.getByRole('button', { name: /No, skip this/i }).click();

    // Step 4: Funding - Should show "ask first" question
    await expect(page.getByText(/Have you raised any money/i)).toBeVisible({ timeout: 5000 });

    // Click "No" to skip funding
    await page.getByRole('button', { name: /No, skip this/i }).click();

    // Step 5: Complete
    await expect(page.getByText(/Your cap table is ready/i)).toBeVisible({ timeout: 5000 });

    // Verify summary shows founders (use .first() as name may appear in multiple places)
    await expect(page.getByText('Alice Founder').first()).toBeVisible();
    await expect(page.getByText('Bob Cofounder').first()).toBeVisible();

    // Click "View Your Cap Table"
    await page.getByRole('button', { name: /View Your Cap Table/i }).click();

    // Verify we're now in the main cap table view with our founders
    await expect(page.getByRole('button', { name: /Add Stakeholder/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Alice Founder').first()).toBeVisible();
    await expect(page.getByText('Bob Cofounder').first()).toBeVisible();
  });

  test('should include advisor in wizard completion', async ({ page }) => {
    // Step 1: Founders
    const nameInputs = page.getByPlaceholder(/Founder name/i);
    await nameInputs.first().fill('Carol CEO');
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2: Option Pool
    await expect(page.getByText(/Reserve equity for employees/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 3: Advisors - Click "Yes"
    await expect(page.getByText(/Do you have any advisors/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Yes, add advisors/i }).click();

    // Advisor form should appear
    await expect(page.getByText(/Add your advisors/i)).toBeVisible({ timeout: 5000 });

    // Fill in advisor
    await page.getByPlaceholder(/Advisor name/i).first().fill('Dan Advisor');

    // Click Next to proceed
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 4: Funding - Skip
    await expect(page.getByText(/Have you raised any money/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /No, skip this/i }).click();

    // Step 5: Complete - Verify advisor is shown
    await expect(page.getByText(/Your cap table is ready/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Dan Advisor')).toBeVisible();
  });

  test('should complete wizard with SAFE funding', async ({ page }) => {
    // Step 1: Founders
    const nameInputs = page.getByPlaceholder(/Founder name/i);
    await nameInputs.first().fill('Eve Founder');
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2: Option Pool
    await expect(page.getByText(/Reserve equity for employees/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 3: Advisors - Skip
    await expect(page.getByText(/Do you have any advisors/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /No, skip this/i }).click();

    // Step 4: Funding - Click "Yes"
    await expect(page.getByText(/Have you raised any money/i)).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Yes, add funding/i }).click();

    // Funding form should appear
    await expect(page.getByText(/Add your funding/i)).toBeVisible({ timeout: 5000 });

    // Fill in funding (SAFE is default type) - use label-based selector
    await page.getByRole('textbox', { name: 'Investor Name' }).fill('Acme Ventures');

    // Fill amount - use label-based selector
    await page.getByRole('spinbutton', { name: 'Amount' }).fill('500000');

    // Click Next
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 5: Complete - Verify funding is shown
    await expect(page.getByText(/Your cap table is ready/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Acme Ventures')).toBeVisible();
    await expect(page.getByText(/\$500,000/)).toBeVisible();
  });
});

test.describe('Cap Table Wizard - Navigation', () => {
  test.beforeEach(async ({ page, helpers }) => {
    // Navigate to app, clear storage, then reload for clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await helpers.dismissWelcomeDialog();

    // Navigate to Founder mode and wait for wizard
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();
    await page.waitForSelector('text=/Who are the founders/i', { timeout: 10000 });
  });

  test('should allow navigating back through steps', async ({ page }) => {
    // Step 1: Fill founders and go next
    const nameInputs = page.getByPlaceholder(/Founder name/i);
    await nameInputs.first().fill('Frank Founder');
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    // Step 2: Option Pool
    await expect(page.getByText(/Reserve equity for employees/i)).toBeVisible({ timeout: 5000 });

    // Click Back
    await page.getByRole('button', { name: /Back/i }).click();

    // Should be back on founders step with data preserved
    await expect(page.getByText(/Who are the founders/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/Founder name/i).first()).toHaveValue('Frank Founder');
  });

  test('should disable next button when founder names are empty', async ({ page }) => {
    // Clear the default founder names
    const nameInputs = page.getByPlaceholder(/Founder name/i);
    await nameInputs.first().fill('');
    await nameInputs.nth(1).fill('');

    // Next button should be disabled
    const nextButton = page.getByRole('button', { name: 'Next', exact: true });
    await expect(nextButton).toBeDisabled();
  });
});

test.describe('Cap Table Wizard - Manual Trigger', () => {
  test('should show wizard button after skipping', async ({ page, helpers }) => {
    // Navigate to app, clear storage, then reload for clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await helpers.dismissWelcomeDialog();

    // Navigate to Founder mode and skip wizard
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();
    await page.waitForSelector('text=/Who are the founders/i', { timeout: 10000 });
    await page.getByRole('button', { name: /Skip Wizard/i }).click();

    // Wait for main cap table view
    await expect(page.getByRole('button', { name: /Add Stakeholder/i })).toBeVisible({ timeout: 5000 });

    // Look for wizard button (magic wand icon)
    const wizardButton = page.getByRole('button', { name: /Wizard/i });
    await expect(wizardButton).toBeVisible();

    // Click wizard button
    await wizardButton.click();

    // Wizard should appear again
    await expect(page.getByText(/Who are the founders/i)).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Cap Table Wizard - Validation', () => {
  test.beforeEach(async ({ page, helpers }) => {
    // Navigate to app, clear storage, then reload for clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await helpers.dismissWelcomeDialog();

    // Navigate to Founder mode and wait for wizard
    await page.getByRole('tab', { name: /Model Cap Table/i }).click();
    await page.waitForSelector('text=/Who are the founders/i', { timeout: 10000 });
  });

  test('should show warning when ownership exceeds 100%', async ({ page }) => {
    // Set ownership to exceed 100%
    const ownershipInputs = page.locator('input[type="number"]');
    await ownershipInputs.first().fill('60');
    await ownershipInputs.nth(1).fill('60');

    // Warning should appear
    await expect(page.getByText(/exceeds 100%/i)).toBeVisible();
  });

  test('should show total ownership percentage', async ({ page }) => {
    // Default ownership is 50% + 50%
    await expect(page.getByText(/100%/)).toBeVisible();
  });
});
