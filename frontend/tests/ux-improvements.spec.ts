import { test, expect } from "@playwright/test";

test.describe("UX Improvements - Issues #128, #129, #147", () => {
  /**
   * Issue #147 - Skip Link Accessibility
   *
   * BUG (found while writing this test, not fixed here -- out of scope for an
   * E2E-only task): the Ledger landing (`app/[locale]/page.tsx`) renders its
   * own `<Masthead />` + `<main>` shell instead of the legacy `AppShell`
   * (`components/layout/app-shell.tsx`), and `AppShell` is the only place
   * `SkipLink` (`components/layout/skip-link.tsx`) is rendered. There is no
   * "Skip to main content" link, and `<main>` carries no `id`, anywhere on
   * `/`. Confirmed live: `document.querySelectorAll('a')` matching
   * `/skip/i` returns none, and `document.querySelector('main')?.id` is
   * `null`. The four tests below assert the pre-existing WCAG 2.4.1
   * requirement and will fail against the current build until the landing's
   * shell regains a skip link.
   */
  test.describe("Skip Link (#147)", () => {
    test.beforeEach(async ({ context }) => {
      // Arrive as a returning visitor so the first-visit sample and its
      // SampleNotice banner don't add noise to tab order.
      await context.addInitScript(() => {
        localStorage.setItem("worth_it_onboarded", "true");
      });
    });

    test("skip link appears when focused via Tab key", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // First Tab should focus the skip link
      await page.keyboard.press("Tab");

      // Skip link should now be visible
      const skipLink = page.getByRole("link", { name: /skip to main content/i });
      await expect(skipLink).toBeVisible();
      await expect(skipLink).toBeFocused();
    });

    test("skip link navigates to main content on Enter", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Tab to skip link
      await page.keyboard.press("Tab");

      // Press Enter to activate
      await page.keyboard.press("Enter");

      // Main content should have focus or be scrolled to
      const mainContent = page.locator("#main-content");
      await expect(mainContent).toBeVisible();

      // Check that we've navigated (URL should have #main-content)
      await expect(page).toHaveURL(/#main-content/);
    });

    test("skip link has correct href attribute", async ({ page }) => {
      await page.goto("/");

      const skipLink = page.getByRole("link", { name: /skip to main content/i });
      await expect(skipLink).toHaveAttribute("href", "#main-content");
    });

    test("main element has id for skip link target", async ({ page }) => {
      await page.goto("/");

      const mainContent = page.locator("main#main-content");
      await expect(mainContent).toBeVisible();
    });
  });

  /**
   * Issue #129 - Sample comparison
   *
   * Replaces the retired onboarding modal: the Ledger landing pre-fills a
   * labeled sample on first visit and shows a `SampleNotice` banner
   * (`role="note"`) with a "Clear the sample" action instead. No `dialog`
   * role is ever rendered on first visit -- the welcome modal
   * (`components/onboarding/welcome-modal.tsx`) was deleted outright.
   */
  test.describe("Sample comparison (#129)", () => {
    test.beforeEach(async ({ context }) => {
      // Simulate a first visit. Init scripts re-run on every navigation, so a
      // sessionStorage sentinel keeps the reset to the first document load:
      // otherwise a reload would wipe the flag the app just wrote and the
      // return-visit test below could never observe it.
      await context.addInitScript(() => {
        if (sessionStorage.getItem("e2e_onboarding_reset")) return;
        sessionStorage.setItem("e2e_onboarding_reset", "1");
        localStorage.removeItem("worth_it_onboarded");
      });
    });

    test("shows the sample notice on first visit", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const notice = page.getByRole("note");
      await expect(notice).toBeVisible({ timeout: 5000 });
      await expect(notice).toHaveText(/sample comparison/i);
    });

    test("never shows a dialog on first visit", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      await expect(page.getByRole("dialog")).toHaveCount(0);
    });

    test('"Clear the sample" empties the salary field and hides the notice', async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const notice = page.getByRole("note");
      await expect(notice).toBeVisible({ timeout: 5000 });

      await notice.getByRole("button", { name: /clear the sample/i }).click();
      await expect(notice).toBeHidden();

      // The Stay column's Monthly salary field is first in document order.
      await expect(page.getByLabel("Monthly salary").first()).toHaveValue("");
    });

    test("does not show the sample notice on subsequent visits", async ({ page }) => {
      // First visit - clear the sample
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const notice = page.getByRole("note");
      await expect(notice).toBeVisible({ timeout: 5000 });
      await notice.getByRole("button", { name: /clear the sample/i }).click();
      await expect(notice).toBeHidden();

      // Reload the page (simulating return visit)
      await page.reload();
      await page.waitForLoadState("networkidle");

      // The banner is only mounted while a sample is active, so a returning
      // visitor with no sample never sees it at all.
      await expect(page.getByRole("note")).toHaveCount(0);
    });

    test("onboarding state persists in localStorage", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Loading the sample and marking the visitor onboarded happen together,
      // on mount -- no explicit dismissal action is required.
      await expect(page.getByRole("note")).toBeVisible({ timeout: 5000 });

      const onboardedValue = await page.evaluate(() => {
        return localStorage.getItem("worth_it_onboarded");
      });

      expect(onboardedValue).toBe("true");
    });
  });

  // Issue #128 - Form Field Hints: deleted. The legacy dashboard's
  // SliderField/NumberInputField (`components/forms/form-fields.tsx`) showed
  // industry-context hint text and example placeholders, wired through
  // `lib/hooks/use-field-warnings.ts`. The Ledger landing's `Field`
  // (`components/ledger/field.tsx`) supports neither: it has no `placeholder`
  // attribute at all, and while it accepts a `hint` prop, grepping every
  // `<Field` call site on the landing (`app/[locale]/page.tsx`,
  // `components/ledger/stay-column.tsx`, `components/ledger/offer-column.tsx`,
  // `components/ledger/chapters/outcomes-chapter.tsx`) turns up none that
  // pass one. There is no hint or placeholder feature left on this page for
  // these five tests to exercise.

  /**
   * Issue #147 - Live Region for Screen Readers
   * Tests that calculation results are announced
   */
  test.describe("Live Region Announcements (#147)", () => {
    test.beforeEach(async ({ context }) => {
      // Skip onboarding
      await context.addInitScript(() => {
        localStorage.setItem("worth_it_onboarded", "true");
      });
    });

    test("has live region for result announcements", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Look for status or alert live region
      const liveRegion = page.locator(
        '[role="status"], [role="alert"], [aria-live="polite"], [aria-live="assertive"]'
      );

      // At least one live region should exist
      const count = await liveRegion.count();
      expect(count).toBeGreaterThan(0);
    });

    test("live region announces calculation results", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // The verdict band's aria-live region carries the calculation's
      // headline sentence once a scenario resolves.
      const verdictRegion = page.locator('[aria-live="polite"]').first();
      await expect(verdictRegion).toBeVisible({ timeout: 5000 });

      const content = await verdictRegion.textContent();
      expect(content).toBeTruthy();
    });
  });

  /**
   * Issue #147 - Reduced Motion Support
   * Tests that animations respect user preferences
   */
  test.describe("Reduced Motion Support (#147)", () => {
    test("respects prefers-reduced-motion setting", async ({ page }) => {
      // Emulate reduced motion preference
      await page.emulateMedia({ reducedMotion: "reduce" });

      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Check that animations are disabled
      const animatedElement = page.locator(".animate-fade-in, .animate-slide-up").first();

      if ((await animatedElement.count()) > 0) {
        const animationDuration = await animatedElement.evaluate((el) => {
          return window.getComputedStyle(el).animationDuration;
        });

        // Should have very short or no animation
        expect(animationDuration).toMatch(/0\.01ms|0s|0ms/);
      }
    });
  });

  /**
   * Issue #147 - High Contrast Support
   * Tests that the app works with high contrast preferences
   */
  test.describe("High Contrast Support (#147)", () => {
    test("page is usable with forced-colors", async ({ page }) => {
      // Note: Playwright doesn't fully support forced-colors emulation,
      // but we can check that the page loads without errors
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Check that main interactive elements are visible
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("button").first()).toBeVisible();
    });
  });
});
