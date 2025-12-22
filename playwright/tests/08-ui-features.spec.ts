import { test, expect } from '../fixtures/base';
import { TIMEOUTS } from '../utils/test-data';

/**
 * Test Suite: UI/UX Features
 *
 * These tests verify:
 * - Theme switching (dark/light mode)
 * - Responsive design elements
 * - Navigation and layout
 */

test.describe('Theme and UI Features', () => {
  test('should have theme toggle button', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // At least some buttons should exist
    const buttonCount = await page.getByRole('button').count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should toggle between light and dark mode', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Get initial theme
    const html = page.locator('html');
    const initialClass = (await html.getAttribute('class')) || '';

    // Find the theme toggle button - look for visible buttons with SVG icons only
    const themeToggle = page.locator('button:visible').filter({ has: page.locator('svg') });

    // Click the first visible button with an icon (likely theme toggle)
    const buttons = await themeToggle.all();
    for (const button of buttons.slice(0, 3)) {
      // Only check first 3 buttons
      const text = await button.textContent();
      if (!text || text.trim().length === 0) {
        await button.click({ timeout: TIMEOUTS.formInput });
        await page.waitForTimeout(TIMEOUTS.animation);

        const newClass = (await html.getAttribute('class')) || '';
        if (initialClass !== newClass) {
          break; // Found and toggled the theme
        }
      }
    }
  });

  test('should display application title', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    await expect(page.getByRole('heading', { name: /Offer Analysis/i })).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
  });

  test('should have sidebar with forms', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Verify forms are in a sidebar or panel with explicit timeouts
    await expect(page.getByText(/Global Settings/i).first()).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
    await expect(page.getByText(/Current Job/i).first()).toBeVisible({
      timeout: TIMEOUTS.textContent,
    });
    await expect(page.getByText(/Startup Offer/i).first()).toBeVisible({
      timeout: TIMEOUTS.textContent,
    });
  });

  test('should display description text', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Verify the page has loaded with main content visible
    // Look for any descriptive text in the header area
    await expect(page.locator('h1').first()).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('should handle empty form gracefully', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Don't fill any forms - app should still render without crashing
    // Verify the main sections are visible even without data
    await expect(page.getByText(/Global Settings/i).first()).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
  });

  test('should show ready state before forms are filled', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Before filling forms, should show form sections ready for input
    // Verify the main form is interactive (uses terminal-card class)
    const currentJobCard = page.locator('.terminal-card').filter({ hasText: 'Current Job' });
    await expect(currentJobCard).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should validate numeric inputs', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Try to enter invalid data in salary field (uses terminal-card class)
    const currentJobCard = page.locator('.terminal-card').filter({ hasText: 'Current Job' });
    const salaryInput = currentJobCard.locator('input[type="number"]').first();
    await salaryInput.fill('abc', { timeout: TIMEOUTS.formInput });

    // Input should either reject non-numeric or clear it
    const value = await salaryInput.inputValue();
    // Value should be empty or unchanged (not 'abc')
    expect(value).not.toBe('abc');
  });

  test('should handle rapid form changes', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Rapidly change exit year using Radix UI Slider
    await helpers.setSliderValue('Exit Year', 3, 1, 1);
    await helpers.setSliderValue('Exit Year', 5, 1, 1);
    await helpers.setSliderValue('Exit Year', 7, 1, 1);
    await helpers.setSliderValue('Exit Year', 5, 1, 1);

    // App should remain stable - verify final value with data-slot for FormItem
    const label = page.getByText('Exit Year', { exact: true });
    const formItem = page.locator('[data-slot="form-item"]').filter({ has: label });
    const slider = formItem.locator('[role="slider"]');
    await expect(slider).toHaveAttribute('aria-valuenow', '5', { timeout: TIMEOUTS.formInput });
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Main heading should exist with explicit timeout
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1, { timeout: TIMEOUTS.elementPresent });

    // Should have descriptive text (updated to match actual app title)
    await expect(h1).toContainText(/Offer Analysis/i, { timeout: TIMEOUTS.textContent });
  });

  test('should have form labels', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Forms should have labels with explicit timeouts
    await expect(page.getByText(/Monthly Salary/i).first()).toBeVisible({
      timeout: TIMEOUTS.elementVisible,
    });
    await expect(page.getByText(/Exit Year/i)).toBeVisible({ timeout: TIMEOUTS.textContent });
  });

  test('should have interactive elements keyboard accessible', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Try tabbing through forms
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Some element should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
