/**
 * Contextual tooltips for form fields throughout the application.
 * These provide helpful explanations for financial concepts and inputs.
 */

export const TOOLTIPS = {
  // Global Settings
  exitYear: "The year you expect the company to have a liquidity event (IPO, acquisition, etc.). This determines when you'd receive your equity payout.",

  // Current Job Form
  currentMonthlySalary: "Your gross monthly salary at your current job before taxes. This is used to calculate opportunity cost.",
  annualSalaryGrowthRate: "Expected yearly salary increase percentage at your current job. Industry average is typically 3-5%.",
  assumedAnnualROI: "Expected annual return on investments if you saved the salary difference. S&P 500 historical average is ~10%.",
  investmentFrequency: "How often salary savings would be invested. Monthly compounding maximizes returns through dollar-cost averaging.",

  // Startup Equity Common
  startupMonthlySalary: "Your gross monthly salary at the startup. Often lower than big tech to compensate with equity.",
  vestingPeriod: "Total time (in months) to fully vest your equity. Standard is 48 months (4 years).",
  cliffPeriod: "Months before any equity vests. Standard is 12 months. If you leave before the cliff, you get nothing.",

  // RSU Form
  totalEquityGrantPct: "Your equity stake as a percentage of fully diluted shares. This will be diluted by future funding rounds.",
  exitValuation: "Expected company valuation at exit. Your payout = (your equity % - dilution) × exit valuation.",
  simulateDilution: "Model how future funding rounds reduce your ownership percentage. Each round typically dilutes 15-25%.",

  // Stock Options Form
  numOptions: "Number of stock options granted. Each option gives the right to buy one share at the strike price.",
  strikePrice: "Price per share you'll pay to exercise options. Usually set at fair market value when options are granted.",
  exitPricePerShare: "Expected share price at exit. Your profit per option = exit price - strike price.",

  // Cap Table - Shareholder
  shareholderName: "Name of the investor, founder, or employee. Used for identification in the cap table.",
  sharesOwned: "Number of common shares held by this shareholder.",
  shareClass: "Type of shares: Common (founders/employees) or Preferred (investors with special rights).",
  isFounder: "Mark if this is a founder. Founders often have different vesting schedules and may have double-trigger acceleration.",

  // Cap Table - Funding Instruments
  instrumentType: "SAFE (Simple Agreement for Future Equity) or Convertible Note. Both convert to equity at a future priced round.",
  investmentAmount: "Capital invested through this instrument. Converts to equity based on valuation cap and/or discount.",
  valuationCap: "Maximum valuation used to calculate conversion price. Protects investors if company value increases significantly.",
  discountRate: "Percentage discount on share price at conversion. Rewards early investors for taking more risk.",
  interestRate: "Annual interest rate (for convertible notes only). Accrued interest converts to additional shares.",
  conversionDate: "Date the instrument converts to equity. For notes, this affects how much interest accrues.",
  proRataRights: "Right to invest in future rounds to maintain ownership percentage. Valuable for investors who want to double down.",
  mfnClause: "Most Favored Nation: if better terms are offered to later investors, this investor gets those terms too.",

  // Cap Table - Analysis
  exitValuationAnalysis: "Company valuation at exit to calculate each shareholder's proceeds based on their ownership stake.",
  liquidationPreference: "Investors with preferred shares get paid first before common shareholders. Usually 1x their investment.",
  participationCap: "Maximum multiple of investment that preferred shareholders can receive before common shareholders participate.",

  // Priced Round
  preMoneyValuation: "Company valuation before this funding round. The higher the pre-money, the less dilution founders experience.",
  amountRaised: "Total capital raised from all investors in this round. This amount is added to pre-money to get post-money valuation.",
  liquidationMultiplier: "Multiple of invested amount that preferred shareholders receive before common shareholders get anything. Standard is 1x, but can be 2x or 3x in difficult markets.",
  participatingPreferred: "If enabled, investors receive their liquidation preference AND participate pro-rata in remaining proceeds. More investor-friendly; reduces common shareholder payouts.",

  // Monte Carlo
  numSimulations: "Number of random scenarios to simulate. More simulations = more accurate probability distribution, but takes longer to compute.",

  // Exit Valuation (Normal distribution)
  exitValuationMean: "Expected (average) company valuation at exit. The simulation generates values centered around this number.",
  exitValuationStd: "Standard deviation measures uncertainty. Higher values mean more variance in simulated exit valuations. ~68% of outcomes fall within ±1 std dev of the mean.",

  // Salary Growth (PERT distribution)
  salaryGrowthMin: "Minimum annual salary growth rate. Consider inflation as a floor (typically 2-3%). This is the pessimistic scenario.",
  salaryGrowthMode: "Most likely annual salary growth rate. This value has the highest probability in the PERT distribution.",
  salaryGrowthMax: "Maximum annual salary growth rate. Top performers might see 8-10% increases. This is the optimistic scenario.",

  // ROI (Normal distribution)
  roiMean: "Expected annual return on invested savings. S&P 500 historical average is ~10%, but consider your risk tolerance.",
  roiStd: "Standard deviation of investment returns. Markets are volatile—higher std dev models more uncertainty in returns.",

  // Exit Year (PERT distribution)
  exitYearMin: "Earliest possible exit year. Very few startups exit in under 3 years.",
  exitYearMode: "Most likely year for an exit event. Most startup exits happen between years 5-7.",
  exitYearMax: "Latest possible exit year. Some startups take 10+ years to reach liquidity.",

  // Dilution (PERT distribution)
  dilutionMin: "Minimum expected dilution. Only achievable if company raises little or no additional funding.",
  dilutionMode: "Most likely total dilution by exit. Expect 25-50% dilution through typical funding rounds (Series A, B, C).",
  dilutionMax: "Maximum expected dilution. Multiple large funding rounds can dilute early employees 50-80%.",
} as const;

export type TooltipKey = keyof typeof TOOLTIPS;
