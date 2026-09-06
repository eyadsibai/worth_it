import { test, expect } from "@playwright/test";

/**
 * The employee dashboard's empty state offers a "Focus Missing Field" button
 * that is meant to scroll to and focus the first incomplete equity input.
 *
 * This can only be checked against the real page. The dashboard's own unit test
 * mocks every form component away, so the element the handler searches for does
 * not exist there and no assertion made in that file can notice the handler
 * finding nothing.
 */
test.describe("Actionable empty state", () => {
  test.beforeEach(async ({ context, page }) => {
    // Arrive as a returning visitor: the welcome modal owns a focus trap, so it
    // would both cover the empty state and capture the focus under test.
    await context.addInitScript(() => {
      localStorage.setItem("worth_it_onboarded", "true");
    });
    await page.goto("/");
  });

  test("Focus Missing Field moves focus to the first incomplete field", async ({ page }) => {
    const focusMissing = page.getByRole("button", { name: /focus missing field/i });
    await expect(focusMissing).toBeVisible();

    await focusMissing.click();

    // Every equity field is a Radix slider, so the control that should receive
    // focus is a thumb. The form renders no <input name> at all, which is what
    // the handler used to look for.
    const focused = page.locator(":focus");
    await expect(focused).toHaveAttribute("role", "slider");
    // Named, not just any slider: landing on the wrong control is the same
    // dead end for the user as landing nowhere. RSU is the default equity
    // type, so the first field the empty state asks for is the grant size.
    await expect(focused).toHaveAttribute("aria-label", /total equity grant/i);
  });
});
