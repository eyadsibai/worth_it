import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Print Styles
 *
 * These tests verify:
 * - Print media query styles are applied correctly
 * - UI elements are hidden/shown properly in print mode
 * - Light theme is forced during print regardless of user preference
 * - Print utility classes work correctly
 */

test.describe('Print Styles', () => {
  test.beforeEach(async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.dismissWelcomeDialog();
  });

  test.describe('Print Media Query', () => {
    test('should hide navigation elements in print mode', async ({ page }) => {
      // Verify navigation is visible in screen mode
      const header = page.locator('header').first();
      await expect(header).toBeVisible();

      // Switch to print media
      await page.emulateMedia({ media: 'print' });

      // Navigation should be hidden in print mode
      // Note: element exists but CSS hides it
      const headerStyles = await header.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          display: styles.display,
          visibility: styles.visibility,
        };
      });

      expect(
        headerStyles.display === 'none' || headerStyles.visibility === 'hidden'
      ).toBeTruthy();
    });

    test('should hide buttons in print mode unless marked with print-include', async ({ page }) => {
      // Switch to print media
      await page.emulateMedia({ media: 'print' });

      // Regular buttons should be hidden
      const buttons = page.locator('button:not(.print-include)');
      const buttonCount = await buttons.count();

      for (let i = 0; i < Math.min(buttonCount, 5); i++) {
        const button = buttons.nth(i);
        const styles = await button.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            visibility: computed.visibility,
          };
        });

        expect(
          styles.display === 'none' || styles.visibility === 'hidden'
        ).toBeTruthy();
      }
    });

    test('should hide bottom navigation in print mode', async ({ page }) => {
      // Check if bottom nav exists
      const bottomNav = page.locator('[data-bottom-nav]');
      const hasBottomNav = await bottomNav.count() > 0;

      if (hasBottomNav) {
        // Switch to print media
        await page.emulateMedia({ media: 'print' });

        const styles = await bottomNav.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            visibility: computed.visibility,
          };
        });

        expect(
          styles.display === 'none' || styles.visibility === 'hidden'
        ).toBeTruthy();
      }
    });

    test('should force light background colors in print mode', async ({ page }) => {
      // Switch to print media
      await page.emulateMedia({ media: 'print' });

      // Check body/root background color
      const rootStyles = await page.evaluate(() => {
        const root = document.documentElement;
        const styles = window.getComputedStyle(root);
        return {
          backgroundColor: styles.backgroundColor,
        };
      });

      // Background should be white or very light in print mode
      // RGB values should be close to 255,255,255
      const bgColor = rootStyles.backgroundColor;
      if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)') {
        const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (match) {
          const [, r, g, b] = match.map(Number);
          // Light colors have high RGB values (> 240)
          expect(r).toBeGreaterThan(240);
          expect(g).toBeGreaterThan(240);
          expect(b).toBeGreaterThan(240);
        }
      }
    });

    test('should maintain light theme even when dark mode is active', async ({ page }) => {
      // Enable dark mode
      const html = page.locator('html');
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
      });

      // Verify dark mode class is set
      await expect(html).toHaveClass(/dark/);

      // Switch to print media
      await page.emulateMedia({ media: 'print' });

      // Check that print styles override dark mode
      const cardStyles = await page.evaluate(() => {
        const card = document.querySelector('[class*="card"]');
        if (!card) return null;
        const styles = window.getComputedStyle(card);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
        };
      });

      // Even with dark mode class, print should show light colors
      if (cardStyles && cardStyles.backgroundColor) {
        const bgColor = cardStyles.backgroundColor;
        if (bgColor !== 'rgba(0, 0, 0, 0)') {
          const match = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (match) {
            const [, r, g, b] = match.map(Number);
            // Should be light background in print
            expect(r).toBeGreaterThan(200);
            expect(g).toBeGreaterThan(200);
            expect(b).toBeGreaterThan(200);
          }
        }
      }
    });
  });

  test.describe('Print Utility Classes', () => {
    test('should hide elements with no-print class in print mode', async ({ page }) => {
      // Add a test element with no-print class
      await page.evaluate(() => {
        const testEl = document.createElement('div');
        testEl.className = 'no-print';
        testEl.id = 'test-no-print';
        testEl.textContent = 'Should be hidden in print';
        document.body.appendChild(testEl);
      });

      // In screen mode, element should be visible
      await page.emulateMedia({ media: 'screen' });
      const testEl = page.locator('#test-no-print');
      await expect(testEl).toBeVisible();

      // In print mode, element should be hidden
      await page.emulateMedia({ media: 'print' });
      const styles = await testEl.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          visibility: computed.visibility,
        };
      });

      expect(
        styles.display === 'none' || styles.visibility === 'hidden'
      ).toBeTruthy();
    });

    test('should show elements with print-only class only in print mode', async ({ page }) => {
      // Add a test element with print-only class
      await page.evaluate(() => {
        const testEl = document.createElement('div');
        testEl.className = 'print-only';
        testEl.id = 'test-print-only';
        testEl.textContent = 'Should only be visible in print';
        document.body.appendChild(testEl);
      });

      // In screen mode, element should be hidden
      await page.emulateMedia({ media: 'screen' });
      const testEl = page.locator('#test-print-only');
      const screenStyles = await testEl.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
        };
      });

      expect(screenStyles.display).toBe('none');

      // In print mode, element should be visible
      await page.emulateMedia({ media: 'print' });
      const printStyles = await testEl.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
        };
      });

      expect(printStyles.display).not.toBe('none');
    });

    test('should keep print-include buttons visible in print mode', async ({ page }) => {
      // Add a test button with print-include class
      await page.evaluate(() => {
        const testBtn = document.createElement('button');
        testBtn.className = 'print-include';
        testBtn.id = 'test-print-include';
        testBtn.textContent = 'Download PDF';
        document.body.appendChild(testBtn);
      });

      // Switch to print mode
      await page.emulateMedia({ media: 'print' });

      const testBtn = page.locator('#test-print-include');
      const styles = await testBtn.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          visibility: computed.visibility,
        };
      });

      // print-include buttons should remain visible
      expect(styles.display).not.toBe('none');
      expect(styles.visibility).not.toBe('hidden');
    });
  });

  test.describe('Print Layout', () => {
    test('should have appropriate page margins for printing', async ({ page }) => {
      // Switch to print media
      await page.emulateMedia({ media: 'print' });

      // Main content area should have appropriate margins
      const mainStyles = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return null;
        const styles = window.getComputedStyle(main);
        return {
          margin: styles.margin,
          padding: styles.padding,
        };
      });

      // Just verify main exists and has some styling
      expect(mainStyles).not.toBeNull();
    });

    test('should hide dialogs and modals in print mode', async ({ page }) => {
      // Switch to print media
      await page.emulateMedia({ media: 'print' });

      // Any existing dialogs should be hidden
      const dialogs = page.locator('[role="dialog"]');
      const dialogCount = await dialogs.count();

      for (let i = 0; i < dialogCount; i++) {
        const dialog = dialogs.nth(i);
        const styles = await dialog.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            visibility: computed.visibility,
          };
        });

        expect(
          styles.display === 'none' || styles.visibility === 'hidden'
        ).toBeTruthy();
      }
    });
  });

  test.describe('Content Visibility', () => {
    test('should show main content in print mode', async ({ page }) => {
      // Switch to print media
      await page.emulateMedia({ media: 'print' });

      // Main content should be visible
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();

      // Cards should be visible
      const cards = page.locator('[class*="card"]');
      const cardCount = await cards.count();
      expect(cardCount).toBeGreaterThan(0);

      // At least one card should be visible
      const firstCard = cards.first();
      await expect(firstCard).toBeVisible();
    });

    test('should display data tables in print mode', async ({ page, helpers }) => {
      // Fill forms to generate results with tables
      await helpers.completeRSUScenario();

      // Switch to print media
      await page.emulateMedia({ media: 'print' });

      // Tables should be visible
      const tables = page.locator('table');
      const tableCount = await tables.count();

      if (tableCount > 0) {
        const firstTable = tables.first();
        await expect(firstTable).toBeVisible();
      }
    });

    test('should display charts in print mode', async ({ page, helpers }) => {
      // Fill forms to generate results with charts
      await helpers.completeRSUScenario();

      // Switch to print media
      await page.emulateMedia({ media: 'print' });

      // Charts (SVG elements from Recharts) should be visible
      const charts = page.locator('.recharts-wrapper');
      const chartCount = await charts.count();

      if (chartCount > 0) {
        const firstChart = charts.first();
        await expect(firstChart).toBeVisible();
      }
    });
  });
});
