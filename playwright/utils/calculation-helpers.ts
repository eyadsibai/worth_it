/**
 * Calculation Helpers
 *
 * Helper utilities for verifying calculation accuracy in E2E tests.
 * These provide reference calculations to compare against API results.
 */

/**
 * Calculate simple pro-rata payout
 */
export function calculateProRataPayout(ownershipPct: number, exitValuation: number): number {
  return (ownershipPct / 100) * exitValuation;
}

/**
 * Calculate post-money valuation
 */
export function calculatePostMoneyValuation(preMoneyValuation: number, amountRaised: number): number {
  return preMoneyValuation + amountRaised;
}

/**
 * Calculate dilution percentage for existing shareholders
 */
export function calculateDilution(preMoneyValuation: number, amountRaised: number): number {
  const postMoney = calculatePostMoneyValuation(preMoneyValuation, amountRaised);
  return amountRaised / postMoney;
}

/**
 * Calculate RSU value at exit
 */
export function calculateRSUValue(
  equityGrantPct: number,
  exitValuation: number,
  vestingFraction: number = 1
): number {
  return (equityGrantPct / 100) * exitValuation * vestingFraction;
}

/**
 * Calculate stock option value at exit
 */
export function calculateOptionValue(
  numOptions: number,
  exitPricePerShare: number,
  strikePrice: number
): number {
  return Math.max(0, numOptions * (exitPricePerShare - strikePrice));
}

/**
 * Calculate annual opportunity cost
 * (simplified version for testing)
 */
export function calculateAnnualOpportunityCost(
  currentSalary: number,
  startupSalary: number,
  years: number,
  annualRoi: number = 0.07
): number {
  let totalOpportunityCost = 0;
  const monthlyDiff = currentSalary - startupSalary;

  for (let month = 0; month < years * 12; month++) {
    const remainingMonths = years * 12 - month;
    const compoundFactor = Math.pow(1 + annualRoi / 12, remainingMonths);
    totalOpportunityCost += monthlyDiff * compoundFactor;
  }

  return totalOpportunityCost;
}

/**
 * Approximate IRR calculation
 * Uses Newton-Raphson method for approximation
 */
export function approximateIRR(cashFlows: number[], tolerance: number = 0.0001): number {
  let rate = 0.1; // Initial guess (10%)

  for (let iteration = 0; iteration < 100; iteration++) {
    let npv = 0;
    let derivative = 0;

    for (let i = 0; i < cashFlows.length; i++) {
      const factor = Math.pow(1 + rate, i);
      npv += cashFlows[i] / factor;
      if (i > 0) {
        derivative -= (i * cashFlows[i]) / Math.pow(1 + rate, i + 1);
      }
    }

    if (Math.abs(npv) < tolerance) {
      return rate;
    }

    if (derivative === 0) {
      break;
    }

    rate = rate - npv / derivative;
  }

  return rate;
}

/**
 * Calculate NPV
 */
export function calculateNPV(
  cashFlows: number[],
  discountRate: number,
  finalValue: number = 0
): number {
  let npv = 0;
  const monthlyRate = discountRate / 12;

  for (let i = 0; i < cashFlows.length; i++) {
    npv += cashFlows[i] / Math.pow(1 + monthlyRate, i);
  }

  // Add final value discounted
  npv += finalValue / Math.pow(1 + monthlyRate, cashFlows.length);

  return npv;
}

/**
 * Generate test scenarios
 */
export const TEST_SCENARIOS = {
  // Profitable RSU scenario
  profitableRSU: {
    currentJobSalary: 15000,
    startupSalary: 12500,
    exitYear: 5,
    equityGrantPct: 0.5,
    exitValuation: 100000000, // $100M
    vestingPeriod: 4,
    expectedPositiveOutcome: true,
  },

  // Breakeven scenario
  breakeven: {
    currentJobSalary: 15000,
    startupSalary: 12500,
    exitYear: 4,
    equityGrantPct: 0.1,
    exitValuation: 50000000, // $50M
    vestingPeriod: 4,
    expectedPositiveOutcome: false, // Borderline
  },

  // High risk/reward scenario
  highRiskReward: {
    currentJobSalary: 20000,
    startupSalary: 8000,
    exitYear: 5,
    equityGrantPct: 2.0,
    exitValuation: 500000000, // $500M
    vestingPeriod: 4,
    expectedPositiveOutcome: true,
  },

  // Low risk scenario
  lowRisk: {
    currentJobSalary: 12000,
    startupSalary: 11000,
    exitYear: 3,
    equityGrantPct: 0.1,
    exitValuation: 100000000,
    vestingPeriod: 3,
    expectedPositiveOutcome: true, // Small salary gap
  },

  // Stock options scenario
  stockOptions: {
    currentJobSalary: 15000,
    startupSalary: 12500,
    exitYear: 5,
    numOptions: 50000,
    strikePrice: 1.0,
    exitPrice: 10.0,
    vestingPeriod: 4,
    // Expected value: 50000 * (10 - 1) = $450,000
  },
};

/**
 * Generate random test data within valid ranges
 */
export function generateRandomScenario(): {
  currentJobSalary: number;
  startupSalary: number;
  exitYear: number;
  equityGrantPct: number;
  exitValuation: number;
} {
  return {
    currentJobSalary: Math.floor(Math.random() * 30000) + 5000, // $5K - $35K
    startupSalary: Math.floor(Math.random() * 20000) + 3000, // $3K - $23K
    exitYear: Math.floor(Math.random() * 10) + 1, // 1-10 years
    equityGrantPct: Math.random() * 2, // 0-2%
    exitValuation: Math.floor(Math.random() * 900000000) + 100000000, // $100M - $1B
  };
}

/**
 * Format currency for comparison (handles floating point)
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Compare two numbers within tolerance
 */
export function isWithinTolerance(
  actual: number,
  expected: number,
  tolerancePct: number = 0.01
): boolean {
  if (expected === 0) {
    return Math.abs(actual) < tolerancePct;
  }
  return Math.abs(actual - expected) / Math.abs(expected) < tolerancePct;
}
