/**
 * Test data constants for Playwright tests
 * These represent realistic scenarios for testing the Worth It application
 */

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
    exitYearSlider: 'input[name="exit_year"]',
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
    vestingPeriodSlider: 'input[name="vesting_period"]',
    cliffPeriodSlider: 'input[name="cliff_period"]',
    simulateDilutionToggle: 'button[role="switch"]',
  },

  // Stock Options Form
  stockOptions: {
    numOptionsInput: 'input[name="num_options"]',
    strikePriceInput: 'input[name="strike_price"]',
    exitPriceInput: 'input[name="exit_price_per_share"]',
    vestingPeriodSlider: 'input[name="vesting_period"]',
    cliffPeriodSlider: 'input[name="cliff_period"]',
    exerciseStrategySelect: 'button[role="combobox"]',
  },

  // Results
  results: {
    apiStatusCard: 'text=/API Connection Status/i',
    connectedStatus: 'text=/Connected to API/i',
    scenarioResults: 'text=/Scenario Analysis/i',
    finalPayoutCard: 'text=/Final Payout/i',
    opportunityCostCard: 'text=/Opportunity Cost/i',
  },

  // Monte Carlo
  monteCarlo: {
    numSimulationsInput: 'input[name="num_simulations"]',
    runSimulationButton: 'button:has-text("Run Simulation")',
    visualizations: 'text=/Monte Carlo Results/i',
  },

  // Theme Toggle
  themeToggle: 'button[aria-label*="theme"]',
};

export const TIMEOUTS = {
  navigation: 30000, // 30s for page navigation
  calculation: 10000, // 10s for calculations to complete
  apiResponse: 5000, // 5s for API responses
  monteCarlo: 30000, // 30s for Monte Carlo simulations
};
