import { Page, expect } from '@playwright/test';
import { TEST_DATA, SELECTORS, TIMEOUTS } from './test-data';
import path from 'path';

/**
 * Helper class for common page interactions in Worth It tests
 */
export class WorthItHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the API to be connected
   */
  async waitForAPIConnection() {
    await this.page.waitForSelector(SELECTORS.results.connectedStatus, {
      timeout: TIMEOUTS.apiResponse,
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
   */
  async fillCurrentJobForm(params = TEST_DATA.currentJob) {
    // Monthly Salary
    const salaryInput = this.page.locator(SELECTORS.currentJob.monthlySalaryInput);
    await salaryInput.waitFor({ state: 'visible' });
    await salaryInput.fill(params.monthlySalary.toString());

    // Annual Salary Growth Rate
    const growthInput = this.page.locator(SELECTORS.currentJob.salaryGrowthInput);
    await growthInput.fill(params.annualSalaryGrowthRate.toString());

    // Assumed Annual ROI
    const roiInput = this.page.locator(SELECTORS.currentJob.roiInput);
    await roiInput.fill(params.assumedAnnualROI.toString());

    // Investment Frequency - click the combobox and select option
    // We'll look for the select by its label first
    const frequencySection = this.page.getByText('Investment Frequency').locator('..');
    const combobox = frequencySection.locator('button[role="combobox"]').first();
    await combobox.click();

    // Wait for dropdown and select the option
    await this.page.getByRole('option', { name: params.investmentFrequency }).click();
  }

  /**
   * Select RSU equity type in startup offer form
   */
  async selectRSUEquityType() {
    const rsuRadio = this.page.locator(SELECTORS.startupOffer.equityTypeRSU);
    await rsuRadio.click();
    await expect(rsuRadio).toBeChecked();
  }

  /**
   * Select Stock Options equity type in startup offer form
   */
  async selectStockOptionsEquityType() {
    const optionsRadio = this.page.locator(SELECTORS.startupOffer.equityTypeStockOptions);
    await optionsRadio.click();
    await expect(optionsRadio).toBeChecked();
  }

  /**
   * Fill in RSU form
   */
  async fillRSUForm(params = TEST_DATA.rsuEquity) {
    // First select RSU type
    await this.selectRSUEquityType();

    // Wait for RSU Monthly Salary input to appear
    const salaryInput = this.page.locator('input[name="monthly_salary"]').last();
    await salaryInput.waitFor({ state: 'visible' });
    await salaryInput.fill(params.monthlySalary.toString());

    // Total Equity Grant %
    const equityInput = this.page.locator(SELECTORS.rsu.equityGrantInput);
    await equityInput.fill(params.totalEquityGrantPct.toString());

    // Exit Valuation
    const valuationInput = this.page.locator(SELECTORS.rsu.exitValuationInput);
    await valuationInput.fill(params.exitValuation.toString());

    // Vesting Period (Radix UI Slider: min=1, step=1)
    await this.setSliderValue('Vesting Period', params.vestingPeriod, 1, 1);

    // Cliff Period (Radix UI Slider: min=0, step=1)
    await this.setSliderValue('Cliff Period', params.cliffPeriod, 0, 1);

    // Simulate Dilution toggle if needed
    if (params.simulateDilution) {
      const dilutionToggle = this.page.locator(SELECTORS.rsu.simulateDilutionToggle);
      const isChecked = await dilutionToggle.getAttribute('data-state') === 'checked';
      if (!isChecked) {
        await dilutionToggle.click();
      }
    }
  }

  /**
   * Fill in Stock Options form
   */
  async fillStockOptionsForm(params = TEST_DATA.stockOptions) {
    // First select Stock Options type
    await this.selectStockOptionsEquityType();

    // Wait for Stock Options Monthly Salary input to appear
    const salaryInput = this.page.locator('input[name="monthly_salary"]').last();
    await salaryInput.waitFor({ state: 'visible' });
    await salaryInput.fill(params.monthlySalary.toString());

    // Number of Options
    const numOptionsInput = this.page.locator(SELECTORS.stockOptions.numOptionsInput);
    await numOptionsInput.fill(params.numOptions.toString());

    // Strike Price
    const strikePriceInput = this.page.locator(SELECTORS.stockOptions.strikePriceInput);
    await strikePriceInput.fill(params.strikePrice.toString());

    // Exit Price Per Share
    const exitPriceInput = this.page.locator(SELECTORS.stockOptions.exitPriceInput);
    await exitPriceInput.fill(params.exitPricePerShare.toString());

    // Vesting Period (Radix UI Slider: min=1, step=1)
    await this.setSliderValue('Vesting Period', params.vestingPeriod, 1, 1);

    // Cliff Period (Radix UI Slider: min=0, step=1)
    await this.setSliderValue('Cliff Period', params.cliffPeriod, 0, 1);

    // Exercise Strategy - use combobox
    const strategySection = this.page.getByText('Exercise Strategy').locator('..');
    const combobox = strategySection.locator('button[role="combobox"]').first();
    await combobox.click();
    await this.page.getByRole('option', { name: params.exerciseStrategy }).click();
  }

  /**
   * Wait for scenario results to load
   */
  async waitForScenarioResults() {
    // Wait for either scenario results or calculating message
    await Promise.race([
      this.page.waitForSelector(SELECTORS.results.scenarioResults, {
        timeout: TIMEOUTS.calculation,
      }),
      this.page.waitForSelector('text=/Analyzing Your Scenario/i', {
        timeout: TIMEOUTS.calculation,
      }),
    ]);

    // Then wait for actual results
    await this.page.waitForSelector(SELECTORS.results.scenarioResults, {
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
