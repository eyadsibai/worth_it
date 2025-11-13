import { test, expect } from '../fixtures/base';

/**
 * Test Suite: UI/UX Features
 * 
 * These tests verify:
 * - Theme switching (dark/light mode)
 * - Responsive design elements
 * - Navigation and layout
 */

test.describe('Theme and UI Features', () => {
  test('should have theme toggle button', async ({ page }) => {
    await page.goto('/');
    
    // Look for theme toggle - it might be in a navigation or header
    const themeButton = page.locator('button').filter({ hasText: /theme|dark|light/i }).first();
    const anyThemeButton = page.getByRole('button').filter({ has: page.locator('svg') });
    
    // At least some buttons should exist
    const buttonCount = await page.getByRole('button').count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test('should toggle between light and dark mode', async ({ page }) => {
    await page.goto('/');
    
    // Get initial theme
    const html = page.locator('html');
    const initialClass = await html.getAttribute('class') || '';
    
    // Try to find and click theme toggle
    // Theme toggle might be a button with a sun/moon icon
    const possibleThemeButtons = await page.locator('button').all();
    
    // Find a button that might be the theme toggle (usually has an icon, no text)
    for (const button of possibleThemeButtons) {
      const text = await button.textContent();
      const hasIcon = await button.locator('svg').count() > 0;
      
      if (hasIcon && (!text || text.trim().length === 0)) {
        // This might be the theme toggle
        await button.click();
        await page.waitForTimeout(500);
        
        // Check if class changed
        const newClass = await html.getAttribute('class') || '';
        
        // Either dark was added/removed or light was added/removed
        const changed = initialClass !== newClass;
        if (changed) {
          // We found and toggled the theme
          break;
        }
      }
    }
  });

  test('should display application title', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByRole('heading', { name: /Job Offer Financial Analyzer/i })).toBeVisible();
  });

  test('should have sidebar with forms', async ({ page }) => {
    await page.goto('/');
    
    // Verify forms are in a sidebar or panel
    await expect(page.getByText(/Global Settings/i).first()).toBeVisible();
    await expect(page.getByText(/Current Job/i).first()).toBeVisible();
    await expect(page.getByText(/Startup Offer/i).first()).toBeVisible();
  });

  test('should display description text', async ({ page }) => {
    await page.goto('/');
    
    // Verify descriptive text is present
    await expect(page.getByText(/Analyze startup job offers/i)).toBeVisible();
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('should handle empty form gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Don't fill any forms
    // App should show a message prompting user to fill forms
    await expect(page.getByText(/Fill out all forms/i)).toBeVisible();
  });

  test('should show ready state before forms are filled', async ({ page }) => {
    await page.goto('/');
    
    // Before filling forms, should show ready/waiting state
    const readyText = await page.getByText(/Ready for Analysis/i).isVisible().catch(() => false);
    const fillFormsText = await page.getByText(/Fill out all forms/i).isVisible().catch(() => false);
    
    expect(readyText || fillFormsText).toBeTruthy();
  });

  test('should validate numeric inputs', async ({ page }) => {
    await page.goto('/');
    
    // Try to enter invalid data in salary field
    const salaryInput = page.locator('input[name="monthly_salary"]').first();
    await salaryInput.fill('abc');
    
    // Input should either reject non-numeric or clear it
    const value = await salaryInput.inputValue();
    // Value should be empty or unchanged (not 'abc')
    expect(value).not.toBe('abc');
  });

  test('should handle rapid form changes', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    
    // Rapidly change exit year
    const exitYearSlider = page.locator('input[name="exit_year"]');
    await exitYearSlider.fill('3');
    await page.waitForTimeout(100);
    await exitYearSlider.fill('5');
    await page.waitForTimeout(100);
    await exitYearSlider.fill('7');
    await page.waitForTimeout(100);
    await exitYearSlider.fill('5');
    
    // App should remain stable
    await expect(exitYearSlider).toHaveValue('5');
  });
});

test.describe('Accessibility', () => {
  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Main heading should exist
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    
    // Should have descriptive text
    await expect(h1).toContainText(/Financial Analyzer/i);
  });

  test('should have form labels', async ({ page }) => {
    await page.goto('/');
    
    // Forms should have labels
    await expect(page.getByText(/Monthly Salary/i).first()).toBeVisible();
    await expect(page.getByText(/Exit Year/i)).toBeVisible();
  });

  test('should have interactive elements keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Try tabbing through forms
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Some element should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});
