import { Page, Locator, expect } from '@playwright/test';
import { TEST_DATA, SELECTORS, TIMEOUTS } from './test-data';
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
 * Sliders in this app label themselves as "$100M", "$12,500", "5 years" or "0.5%".
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
   * Wait for the page to be ready (forms loaded and API responsive)
   * Since the UI no longer shows explicit "Connected to API" status,
   * we wait for the main form elements to be loaded which indicates
   * the app has initialized and is ready for interaction.
   *
   * Note: Uses navigation timeout (30s) for page elements since React hydration
   * and form rendering can take longer than typical API responses.
   */
  async waitForAPIConnection() {
    // Wait for main heading to confirm page has loaded
    // UI now shows "Offer Analysis" or "Worth It" branding
    await this.page.waitForSelector('text=/Offer Analysis|Worth It/i', {
      timeout: TIMEOUTS.navigation,
    });

    // Dismiss welcome dialog if present (shown for first-time visitors)
    await this.dismissWelcomeDialog();

    // Wait for the form to be interactive (Exit Year slider)
    // All form fields now use touch-friendly SliderField components (no input[type="number"])
    await this.page.waitForSelector('[role="slider"]', {
      timeout: TIMEOUTS.navigation,
    });
  }

  /**
   * Set a Radix UI slider value by using the direct input feature
   *
   * The SliderField component has an "Edit {label} value" button that opens
   * an input field for direct value entry. This is MUCH faster than using
   * keyboard navigation (ArrowRight/ArrowLeft) which can require 70+ key presses.
   *
   * Fallback: If the edit button isn't found (older slider style), uses keyboard navigation.
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
   * Fill in the global settings form
   */
  async fillGlobalSettings(exitYear: number = TEST_DATA.globalSettings.exitYear) {
    // Set the exit year slider (min=1, step=1 from form config)
    await this.setSliderValue('Exit Year', exitYear, 1, 1);
  }

  /**
   * Fill in the current job form
   * Note: Uses direct spinbutton selectors within card containers since
   * shadcn/ui FormLabel doesn't use proper label-input associations (for/id attributes)
   */
  async fillCurrentJobForm(params = TEST_DATA.currentJob) {
    // Scope to Current Job card using the collapsible trigger button for precise matching
    // (hasText: 'Current Job' can match result cards that mention "current job")
    const currentJobCard = this.page.locator('.terminal-card').filter({
      has: this.page.getByRole('button', { name: /^Current Job/ }),
    });
    await currentJobCard.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // Monthly Salary - uses SliderField (touch-friendly), scoped to Current Job card
    // to avoid matching Startup Offer's Monthly Salary
    await this.setSliderValue('Monthly Salary', params.monthlySalary, 0, 500, currentJobCard);

    // Annual Salary Growth Rate - uses slider, set via setSliderValue
    await this.setSliderValue('Annual Salary Growth Rate', params.annualSalaryGrowthRate, 0, 0.1);

    // Assumed Annual ROI - uses slider, set via setSliderValue
    await this.setSliderValue('Assumed Annual ROI', params.assumedAnnualROI, 0, 0.1);

    // Investment Frequency - use accessible name directly
    const combobox = currentJobCard.getByRole('combobox', { name: 'Investment Frequency' });
    await combobox.click();

    // Wait for dropdown and select the option
    await this.page.getByRole('option', { name: params.investmentFrequency }).click();
  }

  /**
   * Select RSU equity type in startup offer form
   * Note: UI uses tabs instead of radio buttons for equity type selection
   */
  async selectRSUEquityType() {
    // Scope to Startup Offer card - look for the card containing RSUs/Stock Options tabs
    const startupCard = this.page.locator('.terminal-card').filter({ has: this.page.getByRole('tab', { name: 'RSUs' }) });
    await startupCard.waitFor({ state: 'visible' });

    // Find the RSUs tab
    const rsuTab = startupCard.getByRole('tab', { name: 'RSUs' });
    await rsuTab.click();
    await expect(rsuTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Select Stock Options equity type in startup offer form
   * Note: UI uses tabs instead of radio buttons for equity type selection
   */
  async selectStockOptionsEquityType() {
    // Scope to Startup Offer card - look for the card containing RSUs/Stock Options tabs
    const startupCard = this.page.locator('.terminal-card').filter({ has: this.page.getByRole('tab', { name: 'Stock Options' }) });
    await startupCard.waitFor({ state: 'visible' });

    // Find the Stock Options tab
    const optionsTab = startupCard.getByRole('tab', { name: 'Stock Options' });
    await optionsTab.click();
    await expect(optionsTab).toHaveAttribute('aria-selected', 'true');
  }

  /**
   * Fill in RSU form
   * Note: Uses direct spinbutton/textbox selectors within card containers since
   * shadcn/ui FormLabel doesn't use proper label-input associations (for/id attributes)
   *
   * The RSU form has inputs in this order:
   * 1. Monthly Salary (textbox - uses formatDisplay=true)
   * 2. Total Equity Grant (number input)
   * 3. Exit Valuation (textbox - uses formatDisplay=true)
   */
  async fillRSUForm(params = TEST_DATA.rsuEquity) {
    // First select RSU type
    await this.selectRSUEquityType();

    // After selecting RSUs tab, find the visible RSU tabpanel
    // Use tabpanel role which is more reliable than CSS class selectors
    const rsuPanel = this.page.getByRole('tabpanel', { name: 'RSUs' });
    await rsuPanel.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // All form fields now use touch-friendly SliderField components
    // Monthly Salary - scoped to RSU panel to avoid matching Current Job's
    await this.setSliderValue('Monthly Salary', params.monthlySalary, 0, 500, rsuPanel);

    // Total Equity Grant %
    await this.setSliderValue('Total Equity Grant', params.totalEquityGrantPct, 0, 0.01, rsuPanel);

    // Exit Valuation
    await this.setSliderValue('Exit Valuation', params.exitValuation, 0, 1000000, rsuPanel);

    // Vesting Period (min=1, step=1)
    await this.setSliderValue('Vesting Period', params.vestingPeriod, 1, 1, rsuPanel);

    // Cliff Period (min=0, step=1)
    await this.setSliderValue('Cliff Period', params.cliffPeriod, 0, 1, rsuPanel);

    // Simulate Dilution checkbox if needed (it's a Checkbox, not a switch)
    if (params.simulateDilution) {
      const dilutionCheckbox = rsuPanel.locator('button[role="checkbox"]');
      const isChecked = await dilutionCheckbox.getAttribute('data-state') === 'checked';
      if (!isChecked) {
        await dilutionCheckbox.click();
      }
    }
  }

  /**
   * Fill in Stock Options form
   * Note: Uses direct spinbutton selectors within card containers since
   * shadcn/ui FormLabel doesn't use proper label-input associations (for/id attributes)
   *
   * The Stock Options form has inputs in this order:
   * 1. Monthly Salary (textbox - uses formatDisplay=true)
   * 2. Number of Options (textbox - uses formatDisplay=true)
   * 3. Strike Price (number input)
   * 4. Exit Price Per Share (number input)
   */
  async fillStockOptionsForm(params = TEST_DATA.stockOptions) {
    // First select Stock Options type
    await this.selectStockOptionsEquityType();

    // After selecting Stock Options tab, find the visible tabpanel
    // Use tabpanel role which is more reliable than CSS class selectors
    const optionsPanel = this.page.getByRole('tabpanel', { name: 'Stock Options' });
    await optionsPanel.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // All form fields now use touch-friendly SliderField components
    // Monthly Salary - scoped to options panel to avoid matching Current Job's
    await this.setSliderValue('Monthly Salary', params.monthlySalary, 0, 500, optionsPanel);

    // Number of Options
    await this.setSliderValue('Number of Options', params.numOptions, 0, 1000, optionsPanel);

    // Strike Price
    await this.setSliderValue('Strike Price', params.strikePrice, 0, 0.1, optionsPanel);

    // Exit Price Per Share
    await this.setSliderValue('Exit Price Per Share', params.exitPricePerShare, 0, 0.1, optionsPanel);

    // Vesting Period (min=1, step=1)
    await this.setSliderValue('Vesting Period', params.vestingPeriod, 1, 1, optionsPanel);

    // Cliff Period (min=0, step=1)
    await this.setSliderValue('Cliff Period', params.cliffPeriod, 0, 1, optionsPanel);

    // Exercise Strategy - use combobox (label is "When to Exercise")
    const strategySection = optionsPanel.getByText('When to Exercise').locator('..');
    const combobox = strategySection.locator('button[role="combobox"]').first();
    await combobox.click();
    // Map friendly name to actual option text
    const strategyMapping: Record<string, string> = {
      'At Exit': 'At Exit (IPO/Acquisition)',
      'After Vesting': 'After Vesting',
    };
    const optionText = strategyMapping[params.exerciseStrategy] || params.exerciseStrategy;
    await this.page.getByRole('option', { name: optionText }).click();
  }

  /**
   * Wait for scenario results to load
   */
  async waitForScenarioResults() {
    // Wait for the detailed analysis section to be visible
    await this.page.waitForSelector(SELECTORS.results.scenarioResults, {
      timeout: TIMEOUTS.calculation,
    });

    // Also verify the results table is showing data
    await this.page.waitForSelector('table', {
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
    const themeToggle = this.page.locator(SELECTORS.themeToggle).first();
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

  /**
   * Dismiss the welcome dialog if present
   * The app shows a welcome dialog on first visit that needs to be dismissed
   * before interacting with other UI elements
   */
  async dismissWelcomeDialog() {
    try {
      // Wait for the Skip button to appear (with timeout for when dialog doesn't show)
      const skipButton = this.page.getByRole('button', { name: 'Skip' });
      await skipButton.waitFor({ state: 'visible', timeout: 3000 });

      // Click the skip button to dismiss the dialog
      await skipButton.click();

      // Wait for the dialog to fully close
      await this.page.locator('[data-slot="dialog-overlay"]').waitFor({
        state: 'hidden',
        timeout: 5000
      }).catch(() => {});
    } catch {
      // Dialog not present or already dismissed, continue
    }
  }
}
