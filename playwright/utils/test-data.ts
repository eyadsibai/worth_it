/**
 * Test data constants for Playwright tests
 * These represent realistic scenarios for testing the Worth It application
 */

/**
 * API Enum Values - Single source of truth for all enum values
 * These MUST match the backend EquityType enum in backend/src/worth_it/calculations/base.py
 */
export const API_ENUMS = {
  equityType: {
    RSU: 'RSU' as const,
    STOCK_OPTIONS: 'STOCK_OPTIONS' as const,
  },
  investmentFrequency: {
    Monthly: 'Monthly' as const,
    Quarterly: 'Quarterly' as const,
    Annually: 'Annually' as const,
  },
  exerciseStrategy: {
    AT_EXIT: 'At Exit' as const,
    IMMEDIATELY: 'Immediately' as const,
    AT_YEAR: 'At Year' as const,
  },
} as const;

export type EquityType = typeof API_ENUMS.equityType[keyof typeof API_ENUMS.equityType];
export type InvestmentFrequency = typeof API_ENUMS.investmentFrequency[keyof typeof API_ENUMS.investmentFrequency];

/**
 * API Request Builders - Create properly typed API payloads
 * These ensure all tests use the same request structure with correct enum values
 *
 * NOTE: The backend has TWO different formats:
 * - LEGACY format: Used by opportunity-cost endpoint (dict with equity_pct, target_exit_valuation)
 * - TYPED format: Used by startup-scenario, monte-carlo endpoints (RSUParams/StockOptionsParams)
 */
export const API_REQUESTS = {
  /**
   * Create RSU startup params in LEGACY format for opportunity-cost endpoint
   * Uses: equity_pct (decimal), target_exit_valuation, total_vesting_years, cliff_years
   */
  createLegacyRSUParams: (overrides?: Partial<{
    total_vesting_years: number;
    cliff_years: number;
    exit_year: number;
    equity_pct: number;
    target_exit_valuation: number;
    simulate_dilution: boolean;
  }>) => ({
    equity_type: API_ENUMS.equityType.RSU,
    total_vesting_years: overrides?.total_vesting_years ?? 4,
    cliff_years: overrides?.cliff_years ?? 1,
    exit_year: overrides?.exit_year ?? 4,
    rsu_params: {
      equity_pct: overrides?.equity_pct ?? 0.5,
      target_exit_valuation: overrides?.target_exit_valuation ?? 100000000,
      simulate_dilution: overrides?.simulate_dilution ?? false,
    },
    options_params: {},
  }),

  /**
   * Create RSU startup params in TYPED format for startup-scenario, monte-carlo endpoints
   * Uses: total_equity_grant_pct (0-100), exit_valuation, vesting_period, cliff_period
   */
  createTypedRSUParams: (overrides?: Partial<{
    monthly_salary: number;
    total_equity_grant_pct: number;
    vesting_period: number;
    cliff_period: number;
    exit_valuation: number;
    simulate_dilution: boolean;
  }>) => ({
    equity_type: API_ENUMS.equityType.RSU,
    monthly_salary: overrides?.monthly_salary ?? 12500,
    total_equity_grant_pct: overrides?.total_equity_grant_pct ?? 0.5, // 0.5% in percentage form
    vesting_period: overrides?.vesting_period ?? 4,
    cliff_period: overrides?.cliff_period ?? 1,
    exit_valuation: overrides?.exit_valuation ?? 100000000,
    simulate_dilution: overrides?.simulate_dilution ?? false,
  }),

  /**
   * Create base params for Monte Carlo API requests (TYPED format)
   */
  createTypedBaseParams: (overrides?: Partial<{
    exit_year: number;
    current_job_monthly_salary: number;
    startup_monthly_salary: number;
    current_job_salary_growth_rate: number;
    annual_roi: number;
    investment_frequency: InvestmentFrequency;
    failure_probability: number;
  }>) => ({
    exit_year: overrides?.exit_year ?? 5,
    current_job_monthly_salary: overrides?.current_job_monthly_salary ?? 15000,
    startup_monthly_salary: overrides?.startup_monthly_salary ?? 12500,
    current_job_salary_growth_rate: overrides?.current_job_salary_growth_rate ?? 0.03,
    annual_roi: overrides?.annual_roi ?? 0.07,
    investment_frequency: overrides?.investment_frequency ?? API_ENUMS.investmentFrequency.Monthly,
    failure_probability: overrides?.failure_probability ?? 0.25,
    startup_params: API_REQUESTS.createTypedRSUParams(),
  }),
};

export const TEST_DATA = {
  // Global Settings
  globalSettings: {
    exitYear: 5,
  },

  // Current Job Parameters
  currentJob: {
    monthlySalary: 15000, // $15,000/month = $180,000/year
    annualSalaryGrowthRate: 3, // 3% annual growth
    assumedAnnualROI: 7, // 7% return on investments
    investmentFrequency: 'Monthly' as const,
  },

  // RSU Equity Parameters
  rsuEquity: {
    monthlySalary: 12500, // $12,500/month = $150,000/year (startup typically pays less)
    equityType: 'RSU' as const,
    totalEquityGrantPct: 0.5, // 0.5%
    exitValuation: 100000000, // $100M exit
    vestingPeriod: 4, // 4 years
    cliffPeriod: 1, // 1 year cliff
    simulateDilution: true,
  },

  // Stock Options Parameters
  stockOptions: {
    monthlySalary: 12500,
    equityType: 'STOCK_OPTIONS' as const,
    numOptions: 50000,
    strikePrice: 1.0,
    exitPricePerShare: 10.0,
    vestingPeriod: 4,
    cliffPeriod: 1,
    exerciseStrategy: 'At Exit' as const,
    exerciseYear: 5,
  },

  // Dilution Rounds
  dilutionRounds: [
    {
      roundName: 'Series A',
      roundType: 'Series A',
      year: 1,
      dilutionPct: 20, // 20% dilution
      enabled: true,
    },
    {
      roundName: 'Series B',
      roundType: 'Series B',
      year: 3,
      dilutionPct: 15, // 15% dilution
      enabled: true,
    },
  ],

  // Monte Carlo Parameters
  monteCarlo: {
    numSimulations: 1000,
    minExitValuation: 50000000, // $50M
    maxExitValuation: 200000000, // $200M
    useTriangularDistribution: false,
    mostLikelyExitValuation: 100000000, // $100M
    simulateExitYear: false,
    minExitYear: 3,
    maxExitYear: 7,
  },
};

export const SELECTORS = {
  // Global Settings Form
  globalSettings: {
    // Radix UI Slider renders as div[role="slider"], not input
    // We target the slider by finding the FormItem containing the "Exit Year" label
    exitYearSlider: '[role="slider"]',
    exitYearLabel: 'text=Exit Year',
    exitYearValue: 'text=/Exit Year:/i',
  },

  // Current Job Form
  currentJob: {
    monthlySalaryInput: 'input[name="monthly_salary"]',
    salaryGrowthInput: 'input[name="annual_salary_growth_rate"]',
    roiInput: 'input[name="assumed_annual_roi"]',
    investmentFrequencySelect: 'button[role="combobox"]',
  },

  // Startup Offer Form
  startupOffer: {
    equityTypeRSU: 'input[value="RSU"]',
    equityTypeStockOptions: 'input[value="STOCK_OPTIONS"]',
    monthlySalaryInput: 'input[name="monthly_salary"]',
  },

  // RSU Form
  rsu: {
    equityGrantInput: 'input[name="total_equity_grant_pct"]',
    exitValuationInput: 'input[name="exit_valuation"]',
    // Radix UI Sliders render as div[role="slider"], not input elements
    vestingPeriodLabel: 'text=Vesting Period',
    vestingPeriodSlider: '[role="slider"]',
    cliffPeriodLabel: 'text=Cliff Period',
    cliffPeriodSlider: '[role="slider"]',
    simulateDilutionToggle: 'button[role="switch"]',
  },

  // Stock Options Form
  stockOptions: {
    numOptionsInput: 'input[name="num_options"]',
    strikePriceInput: 'input[name="strike_price"]',
    exitPriceInput: 'input[name="exit_price_per_share"]',
    // Radix UI Sliders render as div[role="slider"], not input elements
    vestingPeriodLabel: 'text=Vesting Period',
    vestingPeriodSlider: '[role="slider"]',
    cliffPeriodLabel: 'text=Cliff Period',
    cliffPeriodSlider: '[role="slider"]',
    exerciseStrategySelect: 'button[role="combobox"]',
  },

  // Results
  results: {
    pageTitle: 'text=/Offer Analysis|Worth It/i',
    scenarioResults: 'text=/Detailed Analysis/i',
    finalPayoutCard: 'text=/Final Payout/i',
    opportunityCostCard: 'text=/Opportunity Cost/i',
    netBenefitCard: 'text=/Net Benefit/i',
    breakEvenCard: 'text=/Break-Even/i',
  },

  // Monte Carlo
  monteCarlo: {
    numSimulationsInput: 'input[name="num_simulations"]',
    runSimulationButton: 'button:has-text("Run Simulation")',
    visualizations: 'text=/Monte Carlo Results/i',
  },

  // Theme Toggle
  // NOTE: This selector assumes the theme toggle button has an aria-label containing "theme".
  // If the frontend implementation changes, update this selector to match the actual UI element.
  // Tests relying on this selector may fail silently if it does not match any element.
  themeToggle: 'button[aria-label*="theme"]',
};

export const TIMEOUTS = {
  // Navigation and page load
  navigation: 15000, // 15s for page navigation
  pageLoad: 10000, // 10s for page to fully load

  // API operations
  apiResponse: 5000, // 5s for API responses
  apiHealth: 3000, // 3s for health check

  // Calculations
  calculation: 10000, // 10s for calculations to complete
  monteCarlo: 30000, // 30s for Monte Carlo simulations

  // UI assertions - granular step-level timeouts
  elementVisible: 5000, // 5s for element to become visible
  elementPresent: 3000, // 3s for element to exist in DOM
  textContent: 3000, // 3s for text content to appear
  formInput: 2000, // 2s for form input interactions
  animation: 1000, // 1s for animations to complete
  debounce: 1500, // 1.5s for debounced operations
};
