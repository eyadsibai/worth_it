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
    await this.page.waitForSelector('text=/Job Offer Financial Analyzer/i', {
      timeout: TIMEOUTS.navigation,
    });

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
   */
  async setSliderValue(labelText: string, targetValue: number, min: number = 0, step: number = 1) {
    // Find the label
    const label = this.page.getByText(labelText, { exact: true });
    await label.waitFor({ state: 'visible' });

    // Find the slider within the same FormItem
    const formItem = label.locator('..').locator('..');
    const slider = formItem.locator('[role="slider"]');
    await slider.waitFor({ state: 'visible' });

    // Focus and set to minimum first
    await slider.focus();
    await slider.press('Home');

    // Calculate steps needed
    const steps = Math.round((targetValue - min) / step);

    // Use ArrowRight to increment
    for (let i = 0; i < steps; i++) {
      await slider.press('ArrowRight');
    }

    // Verify the value was set
    await expect(slider).toHaveAttribute('aria-valuenow', targetValue.toString());
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
    // Scope to Current Job card to avoid matching other forms
    const currentJobCard = this.page.locator('.glass-card').filter({ hasText: 'Current Job' });
    await currentJobCard.waitFor({ state: 'visible' });

    // Monthly Salary - first number input in the Current Job card
    const salaryInput = currentJobCard.locator('input[type="number"]').first();
    await salaryInput.waitFor({ state: 'visible' });
    await salaryInput.fill(params.monthlySalary.toString());

    // Annual Salary Growth Rate - uses slider, set via setSliderValue
    await this.setSliderValue('Annual Salary Growth Rate', params.annualSalaryGrowthRate, 0, 0.1);

    // Assumed Annual ROI - uses slider, set via setSliderValue
    await this.setSliderValue('Assumed Annual ROI', params.assumedAnnualROI, 0, 0.1);

    // Investment Frequency - click the combobox and select option
    const frequencySection = currentJobCard.getByText('Investment Frequency').locator('..');
    const combobox = frequencySection.locator('button[role="combobox"]').first();
    await combobox.click();

    // Wait for dropdown and select the option
    await this.page.getByRole('option', { name: params.investmentFrequency }).click();
  }

  /**
   * Select RSU equity type in startup offer form
   * Note: UI uses tabs instead of radio buttons for equity type selection
   */
  async selectRSUEquityType() {
    // Scope to Startup Offer card
    const startupCard = this.page.locator('.glass-card').filter({ hasText: 'Startup Offer' });
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
    // Scope to Startup Offer card
    const startupCard = this.page.locator('.glass-card').filter({ hasText: 'Startup Offer' });
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
   * 1. Monthly Salary (spinbutton)
   * 2. Total Equity Grant (spinbutton)
   * 3. Exit Valuation (textbox - uses formatted display)
   */
  async fillRSUForm(params = TEST_DATA.rsuEquity) {
    // First select RSU type
    await this.selectRSUEquityType();

    // After selecting RSUs tab, find the visible RSU tabpanel
    // Use tabpanel role which is more reliable than CSS class selectors
    const rsuPanel = this.page.getByRole('tabpanel', { name: 'RSUs' });
    await rsuPanel.waitFor({ state: 'visible' });

    // Get number inputs within the RSU panel
    const numberInputs = rsuPanel.locator('input[type="number"]');
    await numberInputs.first().waitFor({ state: 'visible' });

    // Monthly Salary - first number input
    await numberInputs.nth(0).fill(params.monthlySalary.toString());

    // Total Equity Grant % - second number input
    await numberInputs.nth(1).fill(params.totalEquityGrantPct.toString());

    // Exit Valuation - uses textbox (formatDisplay mode)
    // Use direct page-level search since tabpanel scoping has issues
    // After clicking, use page.keyboard to type (avoids re-querying element)
    const valuationInput = this.page.getByRole('textbox').first();
    await valuationInput.waitFor({ state: 'visible' });
    await valuationInput.click();
    // Use page.keyboard after focusing - more reliable with custom inputs
    await this.page.keyboard.press('Control+a');
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
   * 1. Monthly Salary (spinbutton)
   * 2. Number of Options (textbox - formatted display)
   * 3. Strike Price (spinbutton)
   * 4. Exit Price Per Share (spinbutton)
   */
  async fillStockOptionsForm(params = TEST_DATA.stockOptions) {
    // First select Stock Options type
    await this.selectStockOptionsEquityType();

    // After selecting Stock Options tab, find the visible tabpanel
    // Use tabpanel role which is more reliable than CSS class selectors
    const optionsPanel = this.page.getByRole('tabpanel', { name: 'Stock Options' });
    await optionsPanel.waitFor({ state: 'visible' });

    // Get number inputs within the Stock Options panel
    const numberInputs = optionsPanel.locator('input[type="number"]');
    await numberInputs.first().waitFor({ state: 'visible' });

    // Monthly Salary - first number input
    await numberInputs.nth(0).fill(params.monthlySalary.toString());

    // Number of Options - uses textbox (formatDisplay mode)
    // Use direct page-level search since tabpanel scoping has issues
    // After clicking, use page.keyboard to type (avoids re-querying element)
    const numOptionsInput = this.page.getByRole('textbox').first();
    await numOptionsInput.waitFor({ state: 'visible' });
    await numOptionsInput.click();
    // Use page.keyboard after focusing - more reliable with custom inputs
    await this.page.keyboard.press('Control+a');
    await this.page.keyboard.type(params.numOptions.toString());

    // Strike Price - second number input
    await numberInputs.nth(1).fill(params.strikePrice.toString());

    // Exit Price Per Share - third number input
    await numberInputs.nth(2).fill(params.exitPricePerShare.toString());

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
}
