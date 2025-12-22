import { Page, expect } from '@playwright/test';
import { TEST_DATA, SELECTORS, TIMEOUTS } from './test-data';
import path from 'path';

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
    await this.page.waitForSelector('[role="slider"]', {
      timeout: TIMEOUTS.navigation,
    });

    // Wait for form inputs to be ready (number inputs render after React hydration)
    // Use input[type="number"] as it's more reliable than role selector during page load
    await this.page.waitForSelector('input[type="number"]', {
      timeout: TIMEOUTS.navigation,
    });
  }

  /**
   * Set a Radix UI slider value by label
   * Radix UI sliders don't use input elements, so we need keyboard interaction
   *
   * Note: The DOM structure is:
   * FormItem > [label container] + FormControl > Slider
   * We need to find the FormItem that contains the label, then find the slider within it.
   *
   * For sliders with small step values (e.g., 0.1), uses End/Home keys to jump to
   * extremes, then fine-tunes with ArrowLeft/ArrowRight from the closer end.
   * This is much faster than pressing ArrowRight 70+ times.
   */
  async setSliderValue(labelText: string, targetValue: number, min: number = 0, step: number = 1) {
    // Find the label with explicit timeout
    const label = this.page.getByText(labelText, { exact: true });
    await label.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // Find the closest ancestor that contains both the label and a slider
    // FormItem uses data-slot="form-item" attribute from shadcn/ui
    // Traverse up to find the FormItem, or use locator that contains both
    const formItem = this.page.locator('[data-slot="form-item"]').filter({ has: label });
    const slider = formItem.locator('[role="slider"]');

    // If no form-item found, try alternative: find slider near the label text
    const sliderCount = await slider.count();
    let targetSlider = slider;

    if (sliderCount === 0) {
      // Fallback: look for slider in the same section/card as the label
      const card = this.page.locator('.terminal-card').filter({ has: label });
      targetSlider = card.locator('[role="slider"]').first();
    }

    await targetSlider.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // Get slider max value from aria-valuemax
    const maxValue = parseFloat(await targetSlider.getAttribute('aria-valuemax') || '100');

    // Calculate steps needed from each end
    const stepsFromMin = Math.round((targetValue - min) / step);
    const stepsFromMax = Math.round((maxValue - targetValue) / step);

    await targetSlider.focus();

    // For integer step sliders (step >= 1), use the simpler approach
    if (step >= 1) {
      await targetSlider.press('Home');
      for (let i = 0; i < stepsFromMin; i++) {
        await targetSlider.press('ArrowRight');
      }
    } else {
      // For decimal step sliders, start from the closer end to minimize key presses
      if (stepsFromMin <= stepsFromMax) {
        // Start from min
        await targetSlider.press('Home');
        for (let i = 0; i < stepsFromMin; i++) {
          await targetSlider.press('ArrowRight');
        }
      } else {
        // Start from max
        await targetSlider.press('End');
        for (let i = 0; i < stepsFromMax; i++) {
          await targetSlider.press('ArrowLeft');
        }
      }
    }

    // Verify the value was set
    await expect(targetSlider).toHaveAttribute('aria-valuenow', targetValue.toString(), { timeout: TIMEOUTS.formInput });
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
    // Scope to Current Job card to avoid matching other forms - uses terminal-card class
    const currentJobCard = this.page.locator('.terminal-card').filter({ hasText: 'Current Job' });
    await currentJobCard.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // Monthly Salary - uses formatDisplay=true so it renders as textbox with placeholder
    // The placeholder is "e.g. 12,000" - use that to find the input
    const salaryInput = currentJobCard.getByRole('textbox', { name: 'e.g. 12,000' });
    await salaryInput.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });
    // Triple-click to select all (works cross-platform)
    await salaryInput.click({ clickCount: 3 });
    await this.page.keyboard.type(params.monthlySalary.toString());

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

    // Monthly Salary - uses textbox (formatDisplay=true)
    // It's the first textbox in the panel
    const textInputs = rsuPanel.locator('input[type="text"]');
    await textInputs.first().waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });
    // Triple-click to select all, then type new value
    await textInputs.nth(0).click({ clickCount: 3 });
    await this.page.keyboard.type(params.monthlySalary.toString());

    // Total Equity Grant % - uses number input (only one in the form)
    const numberInput = rsuPanel.locator('input[type="number"]');
    await numberInput.waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });
    await numberInput.fill(params.totalEquityGrantPct.toString());

    // Exit Valuation - uses textbox (formatDisplay=true)
    // It's the second textbox in the panel
    await textInputs.nth(1).click({ clickCount: 3 });
    await this.page.keyboard.type(params.exitValuation.toString());

    // Vesting Period (Radix UI Slider: min=1, step=1)
    await this.setSliderValue('Vesting Period', params.vestingPeriod, 1, 1);

    // Cliff Period (Radix UI Slider: min=0, step=1)
    await this.setSliderValue('Cliff Period', params.cliffPeriod, 0, 1);

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

    // Get text inputs (formatDisplay fields) within the Stock Options panel
    const textInputs = optionsPanel.locator('input[type="text"]');
    await textInputs.first().waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // Monthly Salary - first textbox (formatDisplay=true)
    await textInputs.nth(0).click({ clickCount: 3 });
    await this.page.keyboard.type(params.monthlySalary.toString());

    // Number of Options - second textbox (formatDisplay=true)
    await textInputs.nth(1).click({ clickCount: 3 });
    await this.page.keyboard.type(params.numOptions.toString());

    // Get number inputs (Strike Price, Exit Price)
    const numberInputs = optionsPanel.locator('input[type="number"]');
    await numberInputs.first().waitFor({ state: 'visible', timeout: TIMEOUTS.elementVisible });

    // Strike Price - first number input
    await numberInputs.nth(0).fill(params.strikePrice.toString());

    // Exit Price Per Share - second number input
    await numberInputs.nth(1).fill(params.exitPricePerShare.toString());

    // Vesting Period (Radix UI Slider: min=1, step=1)
    await this.setSliderValue('Vesting Period', params.vestingPeriod, 1, 1);

    // Cliff Period (Radix UI Slider: min=0, step=1)
    await this.setSliderValue('Cliff Period', params.cliffPeriod, 0, 1);

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
