import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures/base';
import { TIMEOUTS } from '../utils/test-data';

/**
 * A currency amount with at least one non-zero digit, e.g. "$500,000" or the
 * compact "$1.2M"/"+$1.2M"/"-$45.3K" `formatMoney` emits for a signed stat
 * (`signDisplay: "exceptZero"` adds the leading sign for any non-zero value).
 * Deliberately does NOT match "$0" or "—", the placeholders shown before a
 * scenario has resolved -- exactly the symptom of a request that lost its
 * equity inputs on the way to the backend.
 */
const CURRENCY_WITH_NONZERO_VALUE = /[+-]?\$[\d,]*[1-9][\d,]*(\.\d+)?[KMB]?/;

/** The `aria-live="polite"` region carrying the verdict sentence/button. */
function verdictRegion(page: Page) {
  return page.locator('[aria-live="polite"]').first();
}

/**
 * A `VerdictBand` stat's value, found via its adjacent `<dt>` label (the
 * `<dl>` groups all four stats together, so a text search alone can't tell
 * them apart).
 */
function statValue(page: Page, label: string) {
  return page.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd[1]');
}

/**
 * Test Suite: Complete Scenario Analysis with RSU
 *
 * These tests verify the complete end-to-end flow on the Ledger landing:
 * - Fill the Stay column and an offer column
 * - Wait for the deterministic calculation
 * - Verify the verdict headline and its supporting stats render real numbers
 */

test.describe('Complete RSU Scenario Analysis', () => {
  test('should complete full RSU scenario and display a verdict', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    await expect(verdictRegion(page).locator('h2')).toBeVisible({ timeout: TIMEOUTS.calculation });
  });

  test('should display equity at exit', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Equity at exit is the closest surviving equivalent of the legacy
    // "Final Payout" card -- the Ledger verdict stats replace it.
    await expect(statValue(page, 'Equity at exit')).toHaveText(CURRENCY_WITH_NONZERO_VALUE, {
      timeout: TIMEOUTS.elementVisible,
    });
  });

  test('should display cost of leaving', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Cost of leaving is the closest surviving equivalent of the legacy
    // "Opportunity Cost" card. The old Charts tab this test also checked no
    // longer exists on the landing (the whole tabbed ScenarioResults panel
    // does not render here) -- there is nothing left of that half to verify.
    await expect(statValue(page, 'Cost of leaving')).toHaveText(CURRENCY_WITH_NONZERO_VALUE, {
      timeout: TIMEOUTS.elementVisible,
    });
  });

  test('should show a take-offer or stay verdict with a real net amount', async ({
    page,
    helpers,
  }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();
    await helpers.waitForScenarioResults();

    // A bare "$0"/"—" anywhere in the verdict sentence means the scenario
    // request reached the backend with the equity stripped out, which is
    // exactly the class of bug this smoke test guards.
    const heading = verdictRegion(page).locator('h2');
    await expect(heading).toHaveText(CURRENCY_WITH_NONZERO_VALUE, { timeout: TIMEOUTS.elementVisible });
  });

  test('should display results after filling the form field by field', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();

    // Start filling forms
    await helpers.fillGlobalSettings();
    await helpers.fillCurrentJobForm();
    await helpers.fillRSUForm();

    // The verdict resolves once every required field lands, without any
    // separate "calculate" step -- the deterministic scenario recomputes
    // continuously.
    await expect(verdictRegion(page).locator('h2')).toBeVisible({ timeout: TIMEOUTS.calculation });
  });

  test('should update results when form values change', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    const heading = verdictRegion(page).locator('h2');
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.calculation });

    // Change the horizon (the Ledger landing's equivalent of the legacy Exit
    // Year slider) and confirm a verdict is still shown afterwards.
    await helpers.fillGlobalSettings(7);
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.elementVisible });
  });

  test('should take screenshot of complete RSU scenario', async ({ page, helpers }) => {
    await page.goto('/');
    await helpers.waitForAPIConnection();
    await helpers.completeRSUScenario();

    // Wait for the verdict to be fully rendered
    await expect(verdictRegion(page).locator('h2')).toBeVisible({ timeout: TIMEOUTS.calculation });

    // Take screenshot
    await page.screenshot({
      path: 'playwright/screenshots/rsu-scenario-complete.png',
      fullPage: true,
    });
  });
});
