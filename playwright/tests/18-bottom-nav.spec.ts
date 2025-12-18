import { test, expect } from '../fixtures/base';

/**
 * E2E Tests for PR #218: Bottom Navigation
 *
 * Test Plan:
 * - [x] Verify bottom nav appears on mobile viewport (<640px)
 * - [x] Verify bottom nav hides on desktop viewport
 * - [x] Test navigation between all sections
 * - [x] Test safe-area padding on iPhone with notch
 */

test.describe('PR #218: Bottom Navigation', () => {
  test.describe('Mobile viewport behavior', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should show bottom nav on mobile viewport', async ({ page }) => {
      await page.goto('/');

      // Wait for page to load
      await page.waitForSelector('h1');

      // Bottom nav should be visible on mobile
      const bottomNav = page.getByTestId('bottom-nav');
      await expect(bottomNav).toBeVisible();
    });

    test('should have Forms, Results, Save, and More nav items', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('h1');

      const bottomNav = page.getByTestId('bottom-nav');
      await expect(bottomNav).toBeVisible();

      // Check for all navigation items using text content
      await expect(bottomNav.getByText('Forms')).toBeVisible();
      await expect(bottomNav.getByText('Results')).toBeVisible();
      await expect(bottomNav.getByText('Save')).toBeVisible();
      await expect(bottomNav.getByText('More')).toBeVisible();
    });

    test('should set aria-current="page" when section is clicked', async ({ page, helpers }) => {
      await page.goto('/');
      await page.waitForSelector('h1');

      // Dismiss welcome dialog using helper
      await helpers.dismissWelcomeDialog();

      // Hide Next.js dev overlay that can intercept pointer events on mobile
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });

      const bottomNav = page.getByTestId('bottom-nav');
      const formsButton = bottomNav.locator('button').filter({ hasText: 'Forms' });

      // Click Forms to activate it
      await formsButton.click();

      // Should now have aria-current="page"
      await expect(formsButton).toHaveAttribute('aria-current', 'page');
    });

    test('should navigate to Results section when Results is clicked', async ({ page, helpers }) => {
      await page.goto('/');
      await page.waitForSelector('h1');

      // Dismiss welcome dialog using helper
      await helpers.dismissWelcomeDialog();

      // Hide Next.js dev overlay that can intercept pointer events on mobile
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });

      const bottomNav = page.getByTestId('bottom-nav');
      const resultsButton = bottomNav.locator('button').filter({ hasText: 'Results' });

      // Click results
      await resultsButton.click();

      // Results should now be active
      await expect(resultsButton).toHaveAttribute('aria-current', 'page');
    });

    test('should navigate back to Forms section', async ({ page, helpers }) => {
      await page.goto('/');
      await page.waitForSelector('h1');

      // Dismiss welcome dialog using helper
      await helpers.dismissWelcomeDialog();

      // Hide Next.js dev overlay that can intercept pointer events on mobile
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });

      const bottomNav = page.getByTestId('bottom-nav');

      // Click results first
      await bottomNav.locator('button').filter({ hasText: 'Results' }).click();
      await page.waitForTimeout(200);

      // Click forms
      const formsButton = bottomNav.locator('button').filter({ hasText: 'Forms' });
      await formsButton.click();

      // Forms should be active again
      await expect(formsButton).toHaveAttribute('aria-current', 'page');
    });

    test('should have safe-area padding class for notched devices', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('h1');

      const bottomNav = page.getByTestId('bottom-nav');

      // Check that the element has the pb-safe class for safe area
      const className = await bottomNav.getAttribute('class');
      expect(className).toContain('pb-safe');
    });

    test('should use proper ARIA attributes for accessibility', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('h1');

      const bottomNav = page.getByTestId('bottom-nav');

      // Should have aria-label for screen readers
      await expect(bottomNav).toHaveAttribute('aria-label', 'Mobile navigation');
    });
  });

  test.describe('Desktop viewport behavior', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('should hide bottom nav on desktop viewport', async ({ page }) => {
      await page.goto('/');
      await page.waitForSelector('h1');

      // Bottom nav should be hidden on desktop (md:hidden class)
      const bottomNav = page.getByTestId('bottom-nav');
      await expect(bottomNav).toBeHidden();
    });
  });

  test.describe('Responsive breakpoint', () => {
    test('should show nav at 639px (below md breakpoint)', async ({ page }) => {
      await page.setViewportSize({ width: 639, height: 800 });
      await page.goto('/');
      await page.waitForSelector('h1');

      const bottomNav = page.getByTestId('bottom-nav');
      await expect(bottomNav).toBeVisible();
    });

    test('should hide nav at 768px (md breakpoint)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 800 });
      await page.goto('/');
      await page.waitForSelector('h1');

      const bottomNav = page.getByTestId('bottom-nav');
      await expect(bottomNav).toBeHidden();
    });
  });
});
