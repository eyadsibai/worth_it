import { test, expect, type Page } from "@playwright/test";
import { injectAxe, checkA11y } from "axe-playwright";

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
    // BUG (found while updating this suite, not fixed here -- out of scope
    // for an E2E-only task): axe currently reports two `moderate` violations
    // on `/`, confirmed live. Both are genuine product bugs, not stale
    // selectors:
    //  - `heading-order` on `<h3>Stay</h3>` -- the same skipped H1->H3
    //    hierarchy the "should have proper heading hierarchy" test below
    //    documents independently.
    //  - `region` on the SampleNotice banner's text (`div[role="note"] >
    //    span`) -- it renders as a sibling of `<main>`, not inside any
    //    landmark (`header`/`nav`/`main`), so "Ensure all page content is
    //    contained by landmarks" fails.
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
    // Every control a screen reader lands on, native or ARIA. The Ledger
    // landing's grant-type and invest-frequency pickers are `aria-pressed`
    // buttons (not covered by this selector list, same as any other button),
    // but its `Field` inputs and the masthead's currency `<select>` are.
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
    // BUG (found while updating this suite, not fixed here -- out of scope
    // for an E2E-only task): confirmed live that `/` renders `H1 "Offer
    // analysis"` immediately followed by `H3 "Stay"` with no `H2` in between
    // -- `StayColumn`'s `<h3>` (`components/ledger/stay-column.tsx`) renders
    // before `VerdictBand`'s `<h2>`, which doesn't exist yet while the duel
    // is incomplete. This assertion is pre-existing and correct; it will
    // fail against the current build until the skip is fixed.
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
      // A regex over `rgb.match(/\d+/g)` cannot read every color the Ledger
      // design system actually uses: it silently mis-parses `lab(...)`
      // backgrounds (extracting digits from the wrong syntax) and, worse,
      // ignores alpha entirely on `rgba(...)` ones -- so a semi-transparent
      // tint (e.g. the grant-type pill buttons' `rgba(10, 122, 61, 0.07)`
      // background under `rgb(10, 122, 61)` text) got compared as if it were
      // opaque, landing right on top of the text color and scoring a
      // contrast of ~1 even though the rendered pixels are nowhere near that.
      // A canvas 2D context resolves any valid CSS color (lab, oklch, named,
      // hex, rgba) to a normalized rgba() string the same way the renderer
      // does, and alpha-compositing each ancestor's background in turn -- the
      // way a browser actually paints them -- gives the true rendered color
      // instead of a parsing artifact.
      // Reading the `fillStyle` string back after assignment is not reliable
      // for every color function: this canvas implementation echoes an
      // unrecognized `lab(...)` string back unchanged instead of normalizing
      // or rejecting it, which fed the L/a/b numbers themselves into the RGB
      // math as if they were 0-255 channels. Actually painting the color and
      // reading the rasterized pixel back sidesteps that -- `fillRect` has to
      // resolve the color to concrete channel values to draw it at all,
      // regardless of what the setter's string serialization supports, and
      // `getImageData` returns straight (non-premultiplied) alpha, so a
      // filled pixel's bytes are directly usable as (r, g, b, a).
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      const toRgba = (color: string): { r: number; g: number; b: number; a: number } => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return { r, g, b, a: a / 255 };
      };

      const effectiveBackground = (el: Element): { r: number; g: number; b: number } => {
        const layers: Array<{ r: number; g: number; b: number; a: number }> = [];
        let node: Element | null = el;
        while (node) {
          const bg = toRgba(window.getComputedStyle(node).backgroundColor);
          if (bg.a > 0) layers.unshift(bg);
          if (bg.a >= 1) break;
          node = node.parentElement;
        }
        let composite = { r: 255, g: 255, b: 255 }; // page default if nothing opaque is found
        for (const layer of layers) {
          composite = {
            r: layer.r * layer.a + composite.r * (1 - layer.a),
            g: layer.g * layer.a + composite.g * (1 - layer.a),
            b: layer.b * layer.a + composite.b * (1 - layer.a),
          };
        }
        return composite;
      };

      const getContrast = (
        rgb1: { r: number; g: number; b: number },
        rgb2: { r: number; g: number; b: number }
      ) => {
        const getLuminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
          const [rl, gl, bl] = [r, g, b].map((v) => {
            const normalized = v / 255;
            return normalized <= 0.03928
              ? normalized / 12.92
              : Math.pow((normalized + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
        };

        const l1 = getLuminance(rgb1);
        const l2 = getLuminance(rgb2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };

      const elements = document.querySelectorAll('button, a, [role="button"], [role="link"]');
      const results: Array<{ element: string; contrast: number; sufficient: boolean }> = [];

      elements.forEach((el) => {
        const fg = toRgba(window.getComputedStyle(el).color);
        const bg = effectiveBackground(el);

        if (fg.a > 0) {
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
    // Every Ledger `Field` is a plain, always-interactive text input -- there
    // is no edit-mode chip to open first, unlike the legacy SliderField this
    // test used to unlock.
    const controls = await findControls(page, 'input:not([type="hidden"]), select, textarea');

    expect(controls.reachable).toBeGreaterThan(0);
    expect(controls.unnamed).toEqual([]);
  });

  // "should announce form errors to screen readers" is deleted: it exercised
  // the legacy SliderField's live salary-sanity warning ("did you mean
  // yearly?"), wired up in `lib/hooks/use-field-warnings.ts` and consumed by
  // `components/forms/form-fields.tsx`. The Ledger landing's `Field`
  // component (`components/ledger/field.tsx`) does support an `error` prop
  // (rendered as `role="alert"`), but nothing on the landing -- `StayColumn`,
  // `OfferColumn`, `OutcomesChapter` -- passes one; grepping the whole
  // frontend tree for a `<Field ... error=` confirms no caller does. There is
  // no live-validation warning left to provoke on this page.

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
