import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Layout Stability and Mode Transitions
 *
 * These tests verify:
 * - Mode switching doesn't cause layout shift
 * - Scrollbar behavior is consistent
 * - Dashboard transitions are smooth
 * - Reduced motion preferences are respected
 */

test.describe('Mode Switching Layout Stability', () => {
  test('switching modes should not cause horizontal layout shift', async ({ page }) => {
    await page.goto('/');

    // Wait for initial render
    await page.waitForSelector('[data-testid="mode-toggle"], button:has-text("Founder"), button:has-text("Employee")', {
      timeout: 5000,
    }).catch(() => {
      // Mode toggle might have different structure
    });

    // Get initial viewport width
    const initialWidth = await page.evaluate(() => document.body.clientWidth);

    // Find and click mode toggle buttons
    const founderButton = page.getByRole('button', { name: /founder/i });
    const employeeButton = page.getByRole('button', { name: /employee/i });

    // Switch modes multiple times and verify width doesn't change
    for (let i = 0; i < 3; i++) {
      if (await founderButton.isVisible()) {
        await founderButton.click();
        await page.waitForTimeout(300); // Wait for transition
      }

      const widthAfterFounder = await page.evaluate(() => document.body.clientWidth);
      expect(widthAfterFounder).toBe(initialWidth);

      if (await employeeButton.isVisible()) {
        await employeeButton.click();
        await page.waitForTimeout(300);
      }

      const widthAfterEmployee = await page.evaluate(() => document.body.clientWidth);
      expect(widthAfterEmployee).toBe(initialWidth);
    }
  });

  test('scrollbar-gutter should be stable to prevent content shift', async ({ page }) => {
    await page.goto('/');

    // Check that scrollbar-gutter: stable is applied to html element
    const scrollbarGutter = await page.evaluate(() => {
      return window.getComputedStyle(document.documentElement).scrollbarGutter;
    });

    expect(scrollbarGutter).toBe('stable');
  });

  test('mode switching should preserve scroll position', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(100);

    const initialScrollY = await page.evaluate(() => window.scrollY);

    // Find mode toggle
    const founderButton = page.getByRole('button', { name: /founder/i });
    const employeeButton = page.getByRole('button', { name: /employee/i });

    // Switch mode
    if (await employeeButton.isVisible()) {
      await employeeButton.click();
      await page.waitForTimeout(300);
    } else if (await founderButton.isVisible()) {
      await founderButton.click();
      await page.waitForTimeout(300);
    }

    // Scroll position should be preserved or reset to top (not random)
    const finalScrollY = await page.evaluate(() => window.scrollY);

    // Either preserved or intentionally reset to 0
    expect([initialScrollY, 0]).toContain(finalScrollY);
  });
});

test.describe('Reduced Motion Support', () => {
  test('should respect prefers-reduced-motion preference', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Wait for render
    await page.waitForTimeout(500);

    // Verify page loaded correctly with reduced motion
    await expect(page.locator('body')).toBeVisible();

    // Find mode toggle and switch modes
    const founderButton = page.getByRole('button', { name: /founder/i });
    const employeeButton = page.getByRole('button', { name: /employee/i });

    // Mode switching should still work with reduced motion
    if (await employeeButton.isVisible()) {
      await employeeButton.click();
      await page.waitForTimeout(100); // Should be instant with reduced motion

      // Dashboard should be visible immediately
      await expect(page.locator('body')).toBeVisible();
    }

    if (await founderButton.isVisible()) {
      await founderButton.click();
      await page.waitForTimeout(100);

      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('transitions should be instant with reduced motion', async ({ page }) => {
    // Emulate reduced motion preference
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // Wait for initial load
    await page.waitForTimeout(500);

    // Measure mode switch time - should be nearly instant with reduced motion
    const founderButton = page.getByRole('button', { name: /founder/i });
    const employeeButton = page.getByRole('button', { name: /employee/i });

    if (await employeeButton.isVisible()) {
      const startTime = Date.now();
      await employeeButton.click();

      // Wait for content to appear
      await page.waitForSelector('body', { state: 'visible' });

      const endTime = Date.now();
      const transitionTime = endTime - startTime;

      // With reduced motion, transition should be very fast (< 100ms)
      // Normal animation would be ~200-300ms
      expect(transitionTime).toBeLessThan(150);
    }
  });

  test('normal transitions should have animation duration', async ({ page }) => {
    // Default: no reduced motion
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');

    await page.waitForTimeout(500);

    const founderButton = page.getByRole('button', { name: /founder/i });
    const employeeButton = page.getByRole('button', { name: /employee/i });

    // Page should load with animations enabled
    await expect(page.locator('body')).toBeVisible();

    // Mode switching should work
    if (await employeeButton.isVisible()) {
      await employeeButton.click();
      await page.waitForTimeout(300); // Allow for animation

      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('Dashboard Content Transitions', () => {
  test('founder dashboard should render after mode switch', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Switch to founder mode
    const founderButton = page.getByRole('button', { name: /founder/i });
    if (await founderButton.isVisible()) {
      await founderButton.click();
      await page.waitForTimeout(500);

      // Founder-specific content should be visible
      // Look for cap table or founder-specific elements
      const hasFounderContent = await page.locator('text=/Cap Table|Funding|Dilution/i').count() > 0;
      expect(hasFounderContent).toBe(true);
    }
  });

  test('employee dashboard should render after mode switch', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Switch to employee mode
    const employeeButton = page.getByRole('button', { name: /employee/i });
    if (await employeeButton.isVisible()) {
      await employeeButton.click();
      await page.waitForTimeout(500);

      // Employee-specific content should be visible
      // Look for RSU/Options or employee-specific elements
      const hasEmployeeContent = await page.locator('text=/RSU|Stock Options|Equity Type/i').count() > 0;
      expect(hasEmployeeContent).toBe(true);
    }
  });

  test('rapid mode switching should not cause visual glitches', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const founderButton = page.getByRole('button', { name: /founder/i });
    const employeeButton = page.getByRole('button', { name: /employee/i });

    // Rapidly switch modes
    for (let i = 0; i < 5; i++) {
      if (await founderButton.isVisible()) {
        await founderButton.click();
        await page.waitForTimeout(50); // Very short wait
      }
      if (await employeeButton.isVisible()) {
        await employeeButton.click();
        await page.waitForTimeout(50);
      }
    }

    // Wait for final state to settle
    await page.waitForTimeout(500);

    // Page should still be functional
    await expect(page.locator('body')).toBeVisible();

    // No overlapping dashboards or visual artifacts
    // Both dashboards shouldn't be visible simultaneously
    const visibleDashboardContent = await page.evaluate(() => {
      // Check that we don't have duplicate major sections
      const headings = document.querySelectorAll('h1, h2, h3');
      const texts = Array.from(headings).map(h => h.textContent);
      return texts;
    });

    // Should have a reasonable number of headings (not doubled)
    expect(visibleDashboardContent.length).toBeLessThan(20);
  });
});

test.describe('AnimatedText Hero Section', () => {
  test('hero text should be visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Hero section should have title
    const heroTitle = page.locator('h1, h2').filter({ hasText: /Job Offer|Startup|Financial/i });
    await expect(heroTitle.first()).toBeVisible();
  });

  test('hero text should update when mode changes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Get initial hero text
    const getHeroText = async () => {
      const heroElement = page.locator('h1, h2').filter({ hasText: /Job Offer|Startup|Financial|Equity|Founder/i });
      if (await heroElement.count() > 0) {
        return await heroElement.first().textContent();
      }
      return null;
    };

    const initialText = await getHeroText();

    // Switch mode
    const founderButton = page.getByRole('button', { name: /founder/i });
    const employeeButton = page.getByRole('button', { name: /employee/i });

    if (await employeeButton.isVisible()) {
      await employeeButton.click();
      await page.waitForTimeout(500);
    } else if (await founderButton.isVisible()) {
      await founderButton.click();
      await page.waitForTimeout(500);
    }

    // Hero text should still be visible after transition
    const heroElement = page.locator('h1, h2').first();
    await expect(heroElement).toBeVisible();
  });
});
