import { test, expect } from "@playwright/test";

/**
 * The Ledger landing's incomplete verdict sentence is itself the "focus
 * missing field" control: `VerdictBand` renders it as a `<button>` (instead
 * of the usual `<h2>`) whenever an offer is missing a required field, and
 * clicking it is meant to move focus to that field (`handleFocusMissing` in
 * `app/[locale]/page.tsx`).
 *
 * This can only be checked against the real page. A component-level test
 * would have to mock away the very DOM structure (`columnRefs`, the offer
 * column's actual inputs) that `handleFocusMissing` walks to find the field.
 */
test.describe("Incomplete verdict focuses the missing field", () => {
  test.beforeEach(async ({ context, page }) => {
    // Arrive as a returning visitor with no saved data, so the first-visit
    // sample never loads and the duel starts genuinely blank.
    await context.addInitScript(() => {
      localStorage.setItem("worth_it_onboarded", "true");
    });
    await page.goto("/");
  });

  test("names the missing field and moves focus to it", async ({ page }) => {
    // A blank offer has no equity details at all yet, so the first missing
    // field is "the equity grant" (see `deriveMissingField` in
    // `components/ledger/offer-column.tsx`) -- not the salary, which is
    // checked only once an equity type has been touched.
    const verdictButton = page.locator('[aria-live="polite"] button');
    await expect(verdictButton).toBeVisible();
    await expect(verdictButton).toHaveText(/enter the equity grant/i);

    await verdictButton.click();

    // BUG (found while writing this test, not fixed here -- out of scope for
    // an E2E-only task): `handleFocusMissing` in `app/[locale]/page.tsx`
    // focuses the first empty <input> in the offer's column by DOM order,
    // without regard to which field `missingField` actually names. The
    // offer's own "Offer name" input is empty by default and renders before
    // every `Field`, so it wins that race and receives focus instead of the
    // "Equity grant" field the verdict sentence names. Reproduced manually:
    // clicking the verdict button focuses `aria-label="Offer name"`, not the
    // Equity grant `Field`, even after the offer has been renamed (Monthly
    // salary -- also empty and also earlier in DOM order -- wins instead).
    //
    // This assertion encodes the *intended* behaviour per the product spec
    // and will fail against the current build until that bug is fixed.
    const equityGrantInput = page.getByLabel("Equity grant");
    await expect(equityGrantInput).toBeFocused();
  });
});
