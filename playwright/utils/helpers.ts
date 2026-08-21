import { Page, Locator, expect } from '@playwright/test';
import { TEST_DATA, TIMEOUTS } from './test-data';
import path from 'path';

/** Multipliers for the magnitude suffixes produced by formatLargeNumber(). */
const MAGNITUDE_SUFFIXES: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
};

/**
 * `aria-valuetext` is an abbreviated, rounded rendering of the underlying value
 * ("$12.3M" for 12,345,678), so it is compared with a tolerance matching that
 * display precision rather than demanding exact equality.
 */
const VALUE_TEXT_TOLERANCE_RATIO = 0.005;

/**
 * Parse the human-readable value a slider thumb exposes via `aria-valuetext`.
 *
 * The legacy cap table sliders (still in use behind `/cap-table`) label
 * themselves as "$100M", "$12,500", "5 years" or "0.5%".
 * Returns NaN when the text carries no parseable number.
 */
export function parseSliderValueText(valueText: string | null): number {
  if (!valueText) return NaN;

  // Drop currency symbols, thousands separators and whitespace so the number
  // and any magnitude suffix sit next to each other: "$1.5M" -> "1.5M".
  const cleaned = valueText.replace(/[$\s,]/g, '');
  const match = cleaned.match(/-?\d*\.?\d+/);
  if (!match) return NaN;

  const numeric = Number(match[0]);
  if (Number.isNaN(numeric)) return NaN;

  const suffix = cleaned.slice(match.index! + match[0].length).charAt(0).toLowerCase();
  return numeric * (MAGNITUDE_SUFFIXES[suffix] ?? 1);
}

/** Whether a slider's `aria-valuetext` describes the requested value. */
function valueTextMatches(valueText: string | null, targetValue: number): boolean {
  const parsed = parseSliderValueText(valueText);
  if (Number.isNaN(parsed)) return false;

  const tolerance = Math.max(Math.abs(targetValue) * VALUE_TEXT_TOLERANCE_RATIO, 0);
  return Math.abs(parsed - targetValue) <= tolerance;
}

/**
 * Helper class for common page interactions in Worth It tests
 */
export class WorthItHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the page to be ready (forms loaded and API responsive).
   *
   * The Ledger landing shows no welcome dialog on first visit (a `SampleNotice`
   * banner replaces it) and has no sliders at all -- every input is a Ledger
   * `Field` (a labeled text input) -- so readiness means the heading and the
   * first field are on screen.
   */
  async waitForAPIConnection() {
    // Wait for main heading to confirm page has loaded. The Ledger landing's
    // h1 is "Offer analysis"; this regex also still matches the legacy
    // "Worth It" branding used elsewhere (e.g. the masthead wordmark).
    await this.page.waitForSelector('text=/Offer Analysis|Worth It/i', {
      timeout: TIMEOUTS.navigation,
    });

    // Wait for the form to be interactive (the Stay column's Monthly salary
    // field, present as soon as the page has hydrated).
    await this.page.getByLabel('Monthly salary').first().waitFor({
      state: 'visible',
      timeout: TIMEOUTS.navigation,
    });
  }

  /**
   * The bordered duel-grid columns on the Ledger landing (`/`), in document
   * order: index 0 is the Stay column, index 1+ are the named offers.
   *
   * `.border-rule.border-e` is the layout class `app/[locale]/page.tsx` itself
   * uses to draw the hairline rules between columns -- there is no ARIA
   * landmark distinguishing Stay from an offer, or one offer from another, so
   * this mirrors the app's own structure rather than adding a test-only hook.
   */
  duelColumn(index: number): Locator {
    return this.page.locator('.border-rule.border-e').nth(index);
  }

  /**
   * Set a Radix UI slider value by using the direct input feature
   *
   * The SliderField component has an "Edit {label} value" button that opens
   * an input field for direct value entry. This is MUCH faster than using
   * keyboard navigation (ArrowRight/ArrowLeft) which can require 70+ key presses.
   *
   * Fallback: If the edit button isn't found (older slider style), uses keyboard navigation.
   *
   * Still needed for the legacy cap table surface behind `/cap-table`
   * (`FounderDashboard`/`CapTableManager`), which the Ledger redesign did not
   * touch and which still renders these as real Radix sliders.
   */
  async setSliderValue(labelText: string, targetValue: number, min: number = 0, step: number = 1, container?: Locator) {
    // Use container if provided (for disambiguation when the same label appears in multiple forms)
    const searchContext = container || this.page;

    // Find the label with explicit timeout (scoped to container for waiting)
    const label = searchContext.getByText(labelText, { exact: true });
    await label.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // Find the closest ancestor FormItem that contains both the label and a slider
    // IMPORTANT: filter({ has }) requires a page-level locator, not a container-scoped one
    const pageLabel = this.page.getByText(labelText, { exact: true });
    const formItem = searchContext.locator('[data-slot="form-item"]').filter({ has: pageLabel });

    // One handle for the thumb this helper drives, so the element verified at
    // the end is the element that was actually changed.
    //
    // `.first()` because getAttribute on a locator matching several elements
    // raises a Playwright strict-mode error, which reads as a crash in this
    // helper rather than as the value mismatch it almost always is. Nothing is
    // masked by it: the driving steps below use this same handle.
    let slider = formItem.locator('[role="slider"]').first();

    // Try the fast path: use the "Edit {label} value" button for direct input
    const editButton = formItem.getByRole('button', { name: `Edit ${labelText} value` });
    const hasEditButton = await editButton.count() > 0;

    if (hasEditButton) {
      // Fast path: Click edit button, type value, press Enter
      await editButton.click();

      // Wait for the input to appear (could be type="number" for SliderField
      // or type="text" for CurrencySliderField which supports shorthand like "10K")
      const valueInput = formItem.locator(`input[aria-label="${labelText} value"]`);
      await valueInput.waitFor({ state: 'visible', timeout: TIMEOUTS.formInput });

      // Clear and type the new value
      await valueInput.fill(targetValue.toString());

      // Press Enter to commit
      await valueInput.press('Enter');

      // Wait for the edit mode to close (button reappears)
      await editButton.waitFor({ state: 'visible', timeout: TIMEOUTS.formInput });
    } else {
      // Fallback: Use keyboard navigation for older slider styles.
      // If the form-item holds no slider, look for one in the same card as the
      // label. Reassigned rather than kept in a second variable so the
      // verification below still watches the thumb that was driven.
      if ((await formItem.locator('[role="slider"]').count()) === 0) {
        const card = this.page.locator('.terminal-card').filter({ has: label });
        slider = card.locator('[role="slider"]').first();
      }

      await slider.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

      // Get slider max value from aria-valuemax
      const maxValue = parseFloat(await slider.getAttribute('aria-valuemax') || '100');

      // Calculate steps needed from each end
      const stepsFromMin = Math.round((targetValue - min) / step);
      const stepsFromMax = Math.round((maxValue - targetValue) / step);

      await slider.focus();

      // Use the closer end to minimize key presses
      if (stepsFromMin <= stepsFromMax) {
        await slider.press('Home');
        for (let i = 0; i < Math.min(stepsFromMin, 20); i++) {
          await slider.press('ArrowRight');
        }
      } else {
        await slider.press('End');
        for (let i = 0; i < Math.min(stepsFromMax, 20); i++) {
          await slider.press('ArrowLeft');
        }
      }
    }

    // Verify the slider actually holds the target value.
    //
    // Linear sliders expose the value directly on `aria-valuenow`. Logarithmic
    // sliders (e.g. Exit Valuation, $1M-$10B) map the value onto a 0-100
    // *position*, so their `aria-valuenow` is that position and the real value
    // is only exposed via `aria-valuetext` ("$100M"). Accept either
    // representation so this helper works for both kinds of slider.
    await expect
      .poll(
        async () => {
          const [valueNow, valueText] = await Promise.all([
            slider.getAttribute('aria-valuenow'),
            slider.getAttribute('aria-valuetext'),
          ]);

          const matches =
            (valueNow !== null && Number(valueNow) === targetValue) ||
            valueTextMatches(valueText, targetValue);

          // Returning the target on success keeps the failure diff readable.
          return matches ? targetValue : `aria-valuenow="${valueNow}" aria-valuetext="${valueText}"`;
        },
        {
          timeout: TIMEOUTS.formInput,
          message: `Slider "${labelText}" never reported the value ${targetValue}`,
        }
      )
      .toBe(targetValue);
  }

  /**
   * Set a Ledger `Field`'s value by its accessible name.
   *
   * `getByLabel` matches case-insensitively on a substring by default, so a
   * plain label like "Vesting" still matches a `Field` whose unit text folds
   * into its accessible name (e.g. "Equity grant %"); no regex is needed for
   * that. `Field` only parses its text into a value on blur, so this fills
   * then blurs and waits for the (possibly clamped) value to render back.
   */
  async setFieldValue(label: string, value: number, container?: Locator) {
    const scope = container ?? this.page;
    const input = scope.getByLabel(label);
    await input.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });
    await input.fill(String(value));
    await input.blur();
    await expect(input).toHaveValue(String(value), { timeout: TIMEOUTS.formInput });
  }

  /**
   * Fill in the global settings form.
   *
   * The Ledger landing has no separate "Global Settings" section -- the
   * exit-year figure lives in the document header as the "Horizon" field.
   */
  async fillGlobalSettings(exitYear: number = TEST_DATA.globalSettings.exitYear) {
    await this.setFieldValue('Horizon', exitYear);
  }

  /**
   * Fill in the Stay column (the user's current job), scoped to duel column 0.
   */
  async fillCurrentJobForm(params = TEST_DATA.currentJob) {
    const stayColumn = this.duelColumn(0);
    await stayColumn.getByRole('heading', { name: 'Stay' }).waitFor({
      state: 'visible',
      timeout: TIMEOUTS.elementVisible,
    });

    await this.setFieldValue('Monthly salary', params.monthlySalary, stayColumn);
    await this.setFieldValue('Annual raise', params.annualSalaryGrowthRate, stayColumn);
    await this.setFieldValue('Surplus ROI', params.assumedAnnualROI, stayColumn);

    // Invest frequency is a pressed-state toggle group (Monthly/Annually),
    // not a combobox -- the Ledger landing dropped Quarterly entirely.
    const frequencyButton = stayColumn.getByRole('button', {
      name: params.investmentFrequency,
      exact: true,
    });
    await frequencyButton.click();
    await expect(frequencyButton).toHaveAttribute('aria-pressed', 'true');
  }

  /**
   * Select RSU equity type in an offer column.
   *
   * Grant type is a pressed-state toggle group (RSU/Options), not tabs -- the
   * Ledger redesign dropped the Radix Tabs the legacy dashboard form used.
   */
  async selectRSUEquityType(offerColumn: Locator = this.duelColumn(1)) {
    const rsuButton = offerColumn.getByRole('button', { name: 'RSU', exact: true });
    await rsuButton.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });
    await rsuButton.click();
    await expect(rsuButton).toHaveAttribute('aria-pressed', 'true');
  }

  /**
   * Select Stock Options equity type in an offer column.
   */
  async selectStockOptionsEquityType(offerColumn: Locator = this.duelColumn(1)) {
    const optionsButton = offerColumn.getByRole('button', { name: 'Options', exact: true });
    await optionsButton.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });
    await optionsButton.click();
    await expect(optionsButton).toHaveAttribute('aria-pressed', 'true');
  }

  /**
   * Fill in RSU form for an offer column (offer A -- duel column 1 -- by default).
   */
  async fillRSUForm(params = TEST_DATA.rsuEquity, offerColumn: Locator = this.duelColumn(1)) {
    // Select the grant type first: it resets the offer's equity details to
    // zeroed RSU defaults, so it must run before any of the fields below.
    await this.selectRSUEquityType(offerColumn);

    await this.setFieldValue('Monthly salary', params.monthlySalary, offerColumn);
    await this.setFieldValue('Equity grant', params.totalEquityGrantPct, offerColumn);
    await this.setFieldValue('Vesting', params.vestingPeriod, offerColumn);
    await this.setFieldValue('Cliff', params.cliffPeriod, offerColumn);
    await this.setFieldValue('Exit valuation', params.exitValuation, offerColumn);

    if (params.simulateDilution) {
      const dilutionButton = offerColumn.getByRole('button', { name: 'Simulate dilution to exit' });
      const isPressed = (await dilutionButton.getAttribute('aria-pressed')) === 'true';
      if (!isPressed) {
        await dilutionButton.click();
        await expect(dilutionButton).toHaveAttribute('aria-pressed', 'true');
      }
    }
  }

  /**
   * Fill in Stock Options form for an offer column (offer A -- duel column 1 -- by default).
   *
   * Note: the Ledger offer column has no "when to exercise" control at all --
   * `exercise_strategy` always defaults to `AT_EXIT` with no UI to change it,
   * unlike the legacy dashboard form. There is nothing to drive here for it.
   */
  async fillStockOptionsForm(params = TEST_DATA.stockOptions, offerColumn: Locator = this.duelColumn(1)) {
    await this.selectStockOptionsEquityType(offerColumn);

    await this.setFieldValue('Monthly salary', params.monthlySalary, offerColumn);
    await this.setFieldValue('Number of options', params.numOptions, offerColumn);
    await this.setFieldValue('Strike price', params.strikePrice, offerColumn);
    await this.setFieldValue('Vesting', params.vestingPeriod, offerColumn);
    await this.setFieldValue('Cliff', params.cliffPeriod, offerColumn);
    await this.setFieldValue('Exit price', params.exitPricePerShare, offerColumn);
  }

  /**
   * Wait for scenario results to load.
   *
   * The verdict headline renders as an `<h2>` inside the `aria-live="polite"`
   * region once every offer's deterministic calculation resolves; while any
   * offer is still incomplete it's a `<button>` instead (see `VerdictBand`).
   * Waiting for the `<h2>` specifically is what "results are ready" means on
   * this landing.
   */
  async waitForScenarioResults() {
    await this.page.locator('[aria-live="polite"] h2').first().waitFor({
      state: 'visible',
      timeout: TIMEOUTS.calculation,
    });
  }

  /**
   * Complete a full scenario flow with RSU
   */
  async completeRSUScenario() {
    await this.fillGlobalSettings();
    await this.fillCurrentJobForm();
    await this.fillRSUForm();
    await this.waitForScenarioResults();
  }

  /**
   * Complete a full scenario flow with Stock Options
   */
  async completeStockOptionsScenario() {
    await this.fillGlobalSettings();
    await this.fillCurrentJobForm();
    await this.fillStockOptionsForm();
    await this.waitForScenarioResults();
  }

  /**
   * Toggle theme (dark/light mode)
   */
  async toggleTheme() {
    // Find theme toggle button
    const themeToggle = this.page.getByRole('button', { name: /theme/i }).first();
    await themeToggle.click();
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async screenshot(name: string) {
    await this.page.screenshot({
      path: path.join(__dirname, '..', 'screenshots', `${name}.png`),
      fullPage: true,
    });
  }

  /**
   * Verify API is healthy
   */
  async verifyAPIHealth() {
    const apiUrl = process.env.API_BASE_URL || 'http://localhost:8000';
    const response = await this.page.request.get(`${apiUrl}/health`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('healthy');

    // `{"status": "healthy"}` is a common shape, so a stray unrelated service
    // squatting on the API port would otherwise satisfy this check. Worth It's
    // /health also reports a version, so require it.
    expect(data.version).toBeTruthy();
  }
}
