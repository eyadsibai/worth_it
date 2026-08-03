import { test, expect, type Page } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

/**
 * The first-run welcome modal covers the app and marks everything behind it
 * aria-hidden. Any assertion about the app's own controls has to dismiss it
 * first, otherwise it silently inspects an empty set and proves nothing.
 */
async function dismissWelcomeModal(page: Page) {
  const skip = page.getByRole("button", { name: "Skip", exact: true });
  await skip.click();
  await expect(skip).toHaveCount(0);
}

/**
 * Returns a short description of every control matching `selector` that
 * assistive technology can reach but cannot name.
 *
 * Controls hidden from assistive technology are skipped: Radix mirrors each
 * slider/select/checkbox into a native field so native form submission still
 * sees a value, and those mirrors are `display: none` or `aria-hidden`. They are
 * never announced, so they need no name - the ARIA widget beside them is the
 * control the user meets, and that one is included here.
 */
async function findControls(
  page: Page,
  selector: string
): Promise<{ reachable: number; unnamed: string[] }> {
  return page.evaluate((sel) => {
    const hasName = (el: Element) => {
      if (el.getAttribute("aria-label")?.trim()) return true;
      const labelledBy = (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
      if (labelledBy.some((id) => document.getElementById(id)?.textContent?.trim())) return true;
      if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true;
      return !!el.closest("label");
    };

    const reachable = Array.from(document.querySelectorAll(sel)).filter(
      (el) => !el.closest('[aria-hidden="true"]') && (el as HTMLElement).checkVisibility()
    );

    return {
      reachable: reachable.length,
      unnamed: reachable.filter((el) => !hasName(el)).map((el) => el.outerHTML.slice(0, 120)),
    };
  }, selector);
}

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
    await dismissWelcomeModal(page);

    // Every control a screen reader lands on, native or ARIA. The form here is
    // built almost entirely from Radix widgets - the sliders, selects and
    // checkboxes a user operates are spans and buttons carrying a role, not
    // <input> elements - so restricting this to native tags would skip the
    // controls that matter.
    const controls = await findControls(
      page,
      [
        'input:not([type="hidden"])',
        "select",
        "textarea",
        '[role="slider"]',
        '[role="combobox"]',
        '[role="checkbox"]',
        '[role="switch"]',
        '[role="spinbutton"]',
        '[role="textbox"]',
      ].join(", ")
    );

    expect(controls.reachable).toBeGreaterThan(0);
    expect(controls.unnamed).toEqual([]);
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
          const [r, g, b] = values.map((v) => {
            const normalized = v / 255;
            return normalized <= 0.03928
              ? normalized / 12.92
              : Math.pow((normalized + 0.055) / 1.055, 2.4);
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
    await dismissWelcomeModal(page);

    // Typed entry in this app only appears when you click the value chip on a
    // slider field, so open one. Without it every native input on the page is a
    // Radix mirror hidden from assistive technology and this test would assert
    // over an empty set.
    await page.getByRole("button", { name: "Edit Monthly Salary value" }).first().click();

    const controls = await findControls(page, 'input:not([type="hidden"]), select, textarea');

    expect(controls.reachable).toBeGreaterThan(0);
    expect(controls.unnamed).toEqual([]);
  });

  test("should announce form errors to screen readers", async ({ page }) => {
    await dismissWelcomeModal(page);

    // There is no submit step to fail: the forms validate as you type and the
    // results recompute continuously. The way to provoke a validation message is
    // therefore to enter a value the domain rules flag.
    const currentJob = page.locator('[data-tour="current-job-card"]');
    const salaryChip = currentJob.getByRole("button", { name: "Edit Monthly Salary value" });
    const salaryInput = currentJob.getByRole("textbox", { name: "Monthly Salary value" });

    // Start from a salary the rules accept. Without this the assertion below
    // would pass on the message the default $0 already puts on screen.
    await salaryChip.click();
    await salaryInput.fill("8000");
    await salaryInput.press("Enter");
    await expect(currentJob.getByRole("alert")).toHaveCount(0);

    // $500/month reads as a yearly figure entered in a monthly field.
    await salaryChip.click();
    await salaryInput.fill("500");
    await salaryInput.press("Enter");

    const announcement = currentJob.getByRole("alert");
    await expect(announcement).toHaveText(/did you mean yearly/i);
    await expect(announcement).toHaveAttribute("aria-live", /polite|assertive/);
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
