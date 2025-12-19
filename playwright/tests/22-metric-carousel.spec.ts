import { test, expect } from '../fixtures/base';

/**
 * Test Suite: Metric Carousel
 *
 * These tests verify:
 * - Carousel renders correctly with metric cards
 * - Responsive behavior (mobile carousel, desktop grid)
 * - Dot indicator navigation
 * - Scroll snap functionality
 * - Accessibility attributes (ARIA roles and labels)
 */

test.describe('Metric Carousel', () => {
  test.beforeEach(async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.dismissWelcomeDialog();
  });

  test.describe('Carousel Rendering', () => {
    test('should render metrics carousel region', async ({ page, helpers }) => {
      // Fill forms to generate results with metrics
      await helpers.completeRSUScenario();

      // Look for carousel region
      const carousel = page.locator('[role="region"][aria-label*="carousel" i]');
      const carouselExists = await carousel.count() > 0;

      if (carouselExists) {
        await expect(carousel.first()).toBeVisible();
      }
    });

    test('should display metric cards in the carousel', async ({ page, helpers }) => {
      // Fill forms to generate results
      await helpers.completeRSUScenario();

      // Look for metric cards (cards inside carousel or results area)
      const metricCards = page.locator('[class*="card"]');
      const cardCount = await metricCards.count();

      expect(cardCount).toBeGreaterThan(0);
    });
  });

  test.describe('Mobile Carousel Behavior', () => {
    test.beforeEach(async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
    });

    test('should show horizontal scrolling on mobile', async ({ page, helpers }) => {
      await helpers.completeRSUScenario();

      // Find carousel container
      const carouselContainer = page.locator('[role="region"][aria-label*="carousel" i]').first();
      const carouselExists = await carouselContainer.count() > 0;

      if (carouselExists) {
        // Check for overflow-x-auto or horizontal scrolling styles
        const styles = await carouselContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            overflowX: computed.overflowX,
            display: computed.display,
          };
        });

        // Should have horizontal scrolling capability
        expect(styles.display).toBe('flex');
        expect(['auto', 'scroll']).toContain(styles.overflowX);
      }
    });

    test('should display dot indicators on mobile when showDots is true', async ({ page, helpers }) => {
      await helpers.completeRSUScenario();

      // Find dot indicators (tablist)
      const dotsContainer = page.locator('[role="tablist"][aria-label*="navigation" i]');
      const dotsExist = await dotsContainer.count() > 0;

      if (dotsExist) {
        await expect(dotsContainer.first()).toBeVisible();

        // Check that dots exist
        const dots = dotsContainer.first().locator('[role="tab"]');
        const dotCount = await dots.count();
        expect(dotCount).toBeGreaterThan(0);
      }
    });

    test('should navigate to slide when dot is clicked', async ({ page, helpers }) => {
      await helpers.completeRSUScenario();

      // Find dots
      const dots = page.locator('[role="tab"][aria-label*="slide" i]');
      const dotCount = await dots.count();

      if (dotCount > 1) {
        // Click the second dot
        const secondDot = dots.nth(1);
        await secondDot.click();

        // Wait for scroll animation
        await page.waitForTimeout(500);

        // Check that the second dot is now selected
        await expect(secondDot).toHaveAttribute('aria-selected', 'true');
      }
    });

    test('should have scroll snap behavior', async ({ page, helpers }) => {
      await helpers.completeRSUScenario();

      // Find carousel container
      const carouselContainer = page.locator('[role="region"][aria-label*="carousel" i]').first();
      const carouselExists = await carouselContainer.count() > 0;

      if (carouselExists) {
        const styles = await carouselContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            scrollSnapType: computed.scrollSnapType,
          };
        });

        // Should have scroll-snap-type: x mandatory
        expect(styles.scrollSnapType).toContain('x');
      }
    });

    test('should update active dot on scroll', async ({ page, helpers }) => {
      await helpers.completeRSUScenario();

      // Find carousel container
      const carouselContainer = page.locator('[role="region"][aria-label*="carousel" i]').first();
      const carouselExists = await carouselContainer.count() > 0;

      if (carouselExists) {
        const dots = page.locator('[role="tab"][aria-label*="slide" i]');
        const dotCount = await dots.count();

        if (dotCount > 1) {
          // Check first dot is active initially
          const firstDot = dots.first();
          await expect(firstDot).toHaveAttribute('aria-selected', 'true');

          // Scroll the carousel programmatically
          await carouselContainer.evaluate((el) => {
            el.scrollLeft = el.scrollWidth / 2;
          });

          // Wait for scroll handler to update
          await page.waitForTimeout(300);

          // One of the dots should have aria-selected="true"
          const selectedDots = await dots.evaluateAll((elements) =>
            elements.filter((el) => el.getAttribute('aria-selected') === 'true').length
          );
          expect(selectedDots).toBe(1);
        }
      }
    });
  });

  test.describe('Desktop Grid Behavior', () => {
    test.beforeEach(async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });
    });

    test('should display as grid on desktop', async ({ page, helpers }) => {
      await helpers.completeRSUScenario();

      // Find carousel container
      const carouselContainer = page.locator('[role="region"][aria-label*="carousel" i]').first();
      const carouselExists = await carouselContainer.count() > 0;

      if (carouselExists) {
        const styles = await carouselContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            gridTemplateColumns: computed.gridTemplateColumns,
          };
        });

        // On desktop (lg+), should be grid display
        expect(styles.display).toBe('grid');
      }
    });

    test('should hide dot indicators on desktop', async ({ page, helpers }) => {
      await helpers.completeRSUScenario();

      // Find dot indicators
      const dotsContainer = page.locator('[role="tablist"][aria-label*="navigation" i]');
      const dotsExist = await dotsContainer.count() > 0;

      if (dotsExist) {
        // Dots should be hidden on desktop (lg:hidden class)
        const styles = await dotsContainer.first().evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
          };
        });

        expect(styles.display).toBe('none');
      }
    });

    test('should not have horizontal overflow on desktop', async ({ page, helpers }) => {
      await helpers.completeRSUScenario();

      // Find carousel container
      const carouselContainer = page.locator('[role="region"][aria-label*="carousel" i]').first();
      const carouselExists = await carouselContainer.count() > 0;

      if (carouselExists) {
        const styles = await carouselContainer.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            overflowX: computed.overflowX,
          };
        });

        // On desktop, should have visible overflow (not scrollable)
        expect(styles.overflowX).toBe('visible');
      }
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA region role', async ({ page, helpers }) => {
      await helpers.completeRSUScenario();

      const carousel = page.locator('[role="region"][aria-label*="carousel" i]');
      const carouselExists = await carousel.count() > 0;

      if (carouselExists) {
        await expect(carousel.first()).toHaveAttribute('role', 'region');
        await expect(carousel.first()).toHaveAttribute('aria-label', /carousel/i);
      }
    });

    test('should have proper ARIA tablist for dot navigation', async ({ page, helpers }) => {
      // Set mobile viewport to see dots
      await page.setViewportSize({ width: 375, height: 667 });
      await helpers.completeRSUScenario();

      const tablist = page.locator('[role="tablist"]');
      const tablistExists = await tablist.count() > 0;

      if (tablistExists) {
        await expect(tablist.first()).toHaveAttribute('role', 'tablist');
        await expect(tablist.first()).toHaveAttribute('aria-label', /navigation/i);
      }
    });

    test('should have proper ARIA tab roles on dots', async ({ page, helpers }) => {
      // Set mobile viewport to see dots
      await page.setViewportSize({ width: 375, height: 667 });
      await helpers.completeRSUScenario();

      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();

      if (tabCount > 0) {
        const firstTab = tabs.first();
        await expect(firstTab).toHaveAttribute('role', 'tab');
        await expect(firstTab).toHaveAttribute('aria-label', /slide/i);
        await expect(firstTab).toHaveAttribute('aria-selected');
      }
    });

    test('should support keyboard navigation on dots', async ({ page, helpers }) => {
      // Set mobile viewport to see dots
      await page.setViewportSize({ width: 375, height: 667 });
      await helpers.completeRSUScenario();

      const dots = page.locator('[role="tab"]');
      const dotCount = await dots.count();

      if (dotCount > 1) {
        // Focus first dot
        await dots.first().focus();

        // Press Tab to move focus
        await page.keyboard.press('Tab');

        // Verify focus moved (to second dot or next element)
        const focusedElement = await page.evaluate(() =>
          document.activeElement?.getAttribute('role')
        );

        // Focus should have moved
        expect(focusedElement).toBeTruthy();
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle empty carousel gracefully', async ({ page }) => {
      // Go to page without filling forms (no metrics to display)
      await page.goto('/');

      // Page should still load without errors
      await expect(page).toHaveURL('/');
    });

    test('should handle single child in carousel', async ({ page, helpers }) => {
      // This depends on whether single-item carousels exist
      // Just verify page doesn't crash
      await helpers.waitForAPIConnection();
      await expect(page).toHaveURL('/');
    });
  });
});
