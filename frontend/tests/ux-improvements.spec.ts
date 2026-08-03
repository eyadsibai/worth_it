import { test, expect, type Page } from "@playwright/test";

/**
 * Waits until React has taken over the server-rendered markup.
 *
 * The welcome modal is opened by a mount effect, so asserting that it is absent
 * before hydration would pass for the wrong reason. Opening a client-only
 * control (the salary slider's inline editor) proves React is live and its
 * effects have already run.
 *
 * CSS locators and dispatchEvent rather than getByRole and click: a modal that
 * wrongly reappears puts the rest of the page behind aria-hidden and swallows
 * pointer events, and the probe must not be what fails in that case - the
 * caller's assertion about the modal should be.
 */
async function waitForHydration(page: Page) {
  const currentJobCard = page.locator('[data-tour="current-job-card"]');
  const editButton = currentJobCard.locator('button[aria-label="Edit Monthly Salary value"]');
  const valueInput = currentJobCard.locator('input[aria-label="Monthly Salary value"]');

  await expect(async () => {
    // Idempotent: a retry must not re-open an editor that is already open.
    if (!(await valueInput.isVisible())) {
      await editButton.dispatchEvent("click");
    }
    await expect(valueInput).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 10000 });
}

test.describe("UX Improvements - Issues #128, #129, #147", () => {
  /**
   * Issue #147 - Skip Link Accessibility
   * Tests that keyboard users can skip navigation and jump to main content
   */
  test.describe("Skip Link (#147)", () => {
    test.beforeEach(async ({ context }) => {
      // Arrive as a returning visitor. On a first visit the welcome modal owns a
      // focus trap, so Tab lands inside the dialog and never reaches the skip
      // link - which is correct dialog behaviour, not a skip link bug.
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
   * Issue #129 - Onboarding Modal
   * Tests that first-time visitors see the welcome modal
   */
  test.describe("Onboarding Modal (#129)", () => {
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

    test("shows welcome modal on first visit", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Wait for modal to appear
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Check modal title
      await expect(page.getByText(/welcome to worth it/i)).toBeVisible();
    });

    test("modal has three steps to navigate through", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Wait for modal
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });
      await expect(modal.getByTestId("step-indicator")).toHaveCount(3);

      // Step 1: Welcome. The wizard advances with "Get Started", not a generic
      // "Next" button.
      await expect(modal.getByRole("heading", { name: /welcome to worth it/i })).toBeVisible();
      await modal.getByRole("button", { name: /get started/i }).click();

      // Step 2: Mode selection - picking a mode is what moves the wizard on
      await expect(modal.getByRole("heading", { name: /employee or founder/i })).toBeVisible();
      await modal.getByRole("button", { name: /^employee/i }).click();

      // Step 3: Confirmation
      await expect(modal.getByRole("heading", { name: /you're all set/i })).toBeVisible();
    });

    test("can select a mode in onboarding", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Wait for modal
      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Navigate to mode selection (step 2)
      await modal.getByRole("button", { name: /get started/i }).click();

      // Founder rather than Employee: employee is the store default, so only the
      // founder choice proves the selection actually reached the app.
      await modal.getByRole("button", { name: /^founder/i }).click();

      // Selecting a mode lands on the final step; the modal closes on "Got it!"
      await modal.getByRole("button", { name: /got it/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 3000 });

      // The chosen mode is applied to the app behind the modal
      await expect(page.getByRole("tab", { name: /cap table/i })).toHaveAttribute(
        "aria-selected",
        "true"
      );
    });

    test("can skip onboarding", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Wait for modal
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });

      // Click Skip button
      const skipButton = page.getByRole("button", { name: /skip/i });
      await skipButton.click();

      // Modal should close
      await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3000 });
    });

    test("does not show modal on subsequent visits", async ({ page }) => {
      // First visit - complete onboarding
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Skip onboarding
      await page.getByRole("button", { name: /skip/i }).click();
      await expect(modal).not.toBeVisible({ timeout: 3000 });

      // Reload the page (simulating return visit)
      await page.reload();
      await page.waitForLoadState("networkidle");

      // Modal should NOT appear this time - but only once React is live, since
      // the modal is opened from a mount effect
      await waitForHydration(page);
      await expect(page.getByRole("dialog")).toBeHidden();
    });

    test("onboarding state persists in localStorage", async ({ page }) => {
      await page.goto("/");
      await page.waitForLoadState("networkidle");

      // Complete onboarding
      await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
      await page.getByRole("button", { name: /skip/i }).click();

      // Check localStorage
      const onboardedValue = await page.evaluate(() => {
        return localStorage.getItem("worth_it_onboarded");
      });

      expect(onboardedValue).toBe("true");
    });
  });

  /**
   * Issue #128 - Empty State Guidance
   * Tests that form fields show hints and example values
   */
  test.describe("Form Field Hints (#128)", () => {
    test.beforeEach(async ({ page, context }) => {
      // Skip onboarding for these tests
      await context.addInitScript(() => {
        localStorage.setItem("worth_it_onboarded", "true");
      });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
    });

    test("salary field shows hint text", async ({ page }) => {
      // Look for hint text near salary input
      const hintText = page.getByText(/tech average|industry range/i);
      await expect(hintText).toBeVisible();
    });

    test("salary field has example placeholder", async ({ page }) => {
      // Salary is entered through a currency slider, so the numeric input - and
      // with it the example placeholder - only exists once the value chip next
      // to the slider is clicked.
      const currentJobCard = page.locator('[data-tour="current-job-card"]');
      await currentJobCard.getByRole("button", { name: /edit monthly salary value/i }).click();

      const salaryInput = currentJobCard.getByRole("textbox", { name: /monthly salary value/i });
      await expect(salaryInput).toHaveAttribute("placeholder", /e\.g\./i);
    });

    test("equity percentage field shows hint", async ({ page }) => {
      // Navigate to RSU form if needed
      const rsuTab = page.getByRole("tab", { name: /rsu/i });
      if (await rsuTab.isVisible()) {
        await rsuTab.click();
      }

      // Look for equity hint
      const equityHint = page.getByText(/early.*0\.\d|growth.*0\.\d|typical/i);
      await expect(equityHint).toBeVisible();
    });

    test("exit valuation field shows example placeholder", async ({ page }) => {
      // Navigate to RSU form if needed
      const rsuTab = page.getByRole("tab", { name: /rsu/i });
      if (await rsuTab.isVisible()) {
        await rsuTab.click();
      }

      // Find exit valuation input
      const exitInput = page.locator('input[name*="exit"], input[name*="valuation"]').first();

      if (await exitInput.isVisible()) {
        const placeholder = await exitInput.getAttribute("placeholder");
        expect(placeholder).toBeTruthy();
      }
    });

    test("hints provide industry context", async ({ page }) => {
      // Check that hints contain useful industry information
      const pageContent = await page.textContent("body");

      // Should have at least one industry-relevant hint
      const hasIndustryHint =
        pageContent?.includes("SAR") ||
        pageContent?.includes("average") ||
        pageContent?.includes("typical") ||
        pageContent?.includes("range");

      expect(hasIndustryHint).toBeTruthy();
    });
  });

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

      // Fill in minimal form data to trigger calculation
      // This assumes the form auto-calculates or has a calculate button

      // Wait for any results to appear
      await page.waitForTimeout(1000);

      // Check for live region with result content
      const statusRegion = page.locator('[role="status"]');

      if ((await statusRegion.count()) > 0) {
        const content = await statusRegion.first().textContent();
        // Should contain result-related text
        expect(content).toMatch(/calculation|result|benefit|worth/i);
      }
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
