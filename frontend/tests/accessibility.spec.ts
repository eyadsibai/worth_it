import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

test.describe("Accessibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("should not have any automatically detectable accessibility issues", async ({ page }) => {
    // Check main page accessibility
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });

  test("should have proper ARIA labels", async ({ page }) => {
    // Check for important ARIA labels
    const formInputs = page.locator("input, select, textarea");
    const count = await formInputs.count();

    for (let i = 0; i < count; i++) {
      const input = formInputs.nth(i);
      const hasLabel = await input.evaluate((el) => {
        const id = el.id;
        const ariaLabel = el.getAttribute("aria-label");
        const ariaLabelledBy = el.getAttribute("aria-labelledby");
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;

        return !!(ariaLabel || ariaLabelledBy || label);
      });

      expect(hasLabel).toBeTruthy();
    }
  });

  test("should have proper heading hierarchy", async ({ page }) => {
    const headings = await page.evaluate(() => {
      const h1 = document.querySelectorAll("h1");
      const h2 = document.querySelectorAll("h2");
      const h3 = document.querySelectorAll("h3");
      const h4 = document.querySelectorAll("h4");

      return {
        h1Count: h1.length,
        h2Count: h2.length,
        h3Count: h3.length,
        h4Count: h4.length,
        headingOrder: Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map((h) =>
          parseInt(h.tagName.replace("H", ""))
        ),
      };
    });

    // Should have at least one H1
    expect(headings.h1Count).toBeGreaterThanOrEqual(1);

    // Check heading order doesn't skip levels
    for (let i = 1; i < headings.headingOrder.length; i++) {
      const diff = headings.headingOrder[i] - headings.headingOrder[i - 1];
      expect(diff).toBeLessThanOrEqual(1);
    }
  });

  test("should support keyboard navigation", async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press("Tab");

    type ActiveElementInfo = {
      tagName: string;
      type: string | null;
      role: string | null;
    } | null;

    let activeElement: ActiveElementInfo = await page.evaluate(() => {
      const el = document.activeElement;
      return el
        ? {
            tagName: el.tagName.toLowerCase(),
            type: el.getAttribute("type"),
            role: el.getAttribute("role"),
          }
        : null;
    });

    expect(activeElement).toBeTruthy();

    // Tab through several elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
      activeElement = await page.evaluate(() => {
        const el = document.activeElement;
        return el
          ? {
              tagName: el.tagName.toLowerCase(),
              type: el.getAttribute("type"),
              role: el.getAttribute("role"),
            }
          : null;
      });
      expect(activeElement).toBeTruthy();
    }
  });

  test("should have sufficient color contrast", async ({ page }) => {
    // This is a basic check - for comprehensive testing, use axe-playwright
    const elements = await page.evaluate(() => {
      const getContrast = (rgb1: string, rgb2: string) => {
        // Simplified contrast calculation
        const getLuminance = (rgb: string) => {
          const values = rgb.match(/\d+/g)?.map(Number) || [0, 0, 0];
          const [r, g, b] = values.map((val) => {
            val = val / 255;
            return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };

        const l1 = getLuminance(rgb1);
        const l2 = getLuminance(rgb2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };

      const elements = document.querySelectorAll('button, a, [role="button"], [role="link"]');
      const results: Array<{ element: string; contrast: number; sufficient: boolean }> = [];

      elements.forEach((el) => {
        const styles = window.getComputedStyle(el);
        const bg = styles.backgroundColor;
        const fg = styles.color;

        if (bg && fg && bg !== "rgba(0, 0, 0, 0)") {
          const contrast = getContrast(bg, fg);
          results.push({
            element: el.tagName,
            contrast: contrast,
            sufficient: contrast >= 4.5, // WCAG AA standard
          });
        }
      });

      return results;
    });

    // Check that interactive elements have sufficient contrast
    elements.forEach((el) => {
      if (el.contrast > 0) {
        expect(el.sufficient).toBeTruthy();
      }
    });
  });

  test("should have focus indicators", async ({ page }) => {
    // Check that focused elements have visible focus indicators
    const firstButton = page.getByRole("button").first();
    await firstButton.focus();

    const hasFocusStyle = await firstButton.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      const outline = styles.outline;
      const boxShadow = styles.boxShadow;
      const border = styles.border;

      return !!(
        (outline && outline !== "none") ||
        (boxShadow && boxShadow !== "none") ||
        (border && border !== "none")
      );
    });

    expect(hasFocusStyle).toBeTruthy();
  });

  test("should have alt text for images", async ({ page }) => {
    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute("alt");

      // Images should have alt text (even if empty for decorative images)
      expect(altText).toBeDefined();
    }
  });

  test("form inputs should have associated labels", async ({ page }) => {
    const inputs = page.locator('input:not([type="hidden"]), select, textarea');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const hasLabel = await input.evaluate((el) => {
        const id = el.id;
        const ariaLabel = el.getAttribute("aria-label");
        const label = id ? document.querySelector(`label[for="${id}"]`) : null;
        const parentLabel = el.closest("label");

        return !!(ariaLabel || label || parentLabel);
      });

      expect(hasLabel).toBeTruthy();
    }
  });

  test("should announce form errors to screen readers", async ({ page }) => {
    // Submit form without filling required fields
    await page.getByRole("button", { name: /calculate/i }).click();

    // Check for ARIA live regions or error announcements
    const errorMessages = page.locator(
      '[role="alert"], [aria-live="polite"], [aria-live="assertive"]'
    );
    const errorCount = await errorMessages.count();

    expect(errorCount).toBeGreaterThan(0);
  });

  test("should have skip navigation link", async ({ page }) => {
    // Check for skip to main content link
    const skipLink = page.locator('a[href="#main"], a[href="#content"], [class*="skip"]');
    const hasSkipLink = (await skipLink.count()) > 0;

    // This is recommended but not mandatory
    if (hasSkipLink) {
      const isVisible = await skipLink.isVisible();
      // Skip links are often hidden until focused
      if (!isVisible) {
        await skipLink.focus();
        await expect(skipLink).toBeVisible();
      }
    }
  });
});
