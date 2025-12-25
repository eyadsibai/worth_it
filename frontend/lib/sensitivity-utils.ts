/**
 * Sensitivity analysis utilities for Issue #155
 * Provides functions to build requests, transform responses,
 * and calculate breakeven thresholds
 */

import type {
  GlobalSettingsForm,
  CurrentJobForm,
  RSUForm,
  StockOptionsForm,
  SensitivityAnalysisRequest,
  SensitivityAnalysisResponse,
} from "@/lib/schemas";

/**
 * Transformed sensitivity data point for charts
 */
export interface SensitivityDataPoint {
  variable: string;
  low: number;
  high: number;
  impact: number;
  lowDelta: number;
  highDelta: number;
}

/**
 * Breakeven threshold for a variable
 */
export interface BreakevenThreshold {
  variable: string;
  threshold: number;
  direction: "minimum" | "maximum";
  unit: string;
  description: string;
}

/**
 * Build a sensitivity analysis request from form data.
 *
 * Uses the Issue #248 typed payload format with flat startup_params structure
 * and typed sim_param_configs keys.
 */
export function buildSensitivityRequest(
  globalSettings: GlobalSettingsForm,
  currentJob: CurrentJobForm,
  equity: RSUForm | StockOptionsForm
): SensitivityAnalysisRequest {
  // Determine equity type and params
  const isRSU = "total_equity_grant_pct" in equity;
  // For Stock Options, we estimate valuation from exit_price_per_share.
  // Note: This assumes ~1M shares outstanding, which is a rough estimate.
  // In practice, fully_diluted_shares would be needed for accurate valuation.
  const exitValuation = isRSU
    ? (equity as RSUForm).exit_valuation
    : (equity as StockOptionsForm).exit_price_per_share * 1000000;

  // Build flat startup_params using Issue #248 typed format
  const startup_params = isRSU
    ? {
        equity_type: "RSU" as const,
        monthly_salary: equity.monthly_salary,
        total_equity_grant_pct: (equity as RSUForm).total_equity_grant_pct,
        vesting_period: equity.vesting_period,
        cliff_period: equity.cliff_period,
        exit_valuation: (equity as RSUForm).exit_valuation,
        simulate_dilution: false,
        dilution_rounds: null,
      }
    : {
        equity_type: "STOCK_OPTIONS" as const,
        monthly_salary: equity.monthly_salary,
        num_options: (equity as StockOptionsForm).num_options,
        strike_price: (equity as StockOptionsForm).strike_price,
        vesting_period: equity.vesting_period,
        cliff_period: equity.cliff_period,
        exit_price_per_share: (equity as StockOptionsForm).exit_price_per_share,
        exercise_strategy: (equity as StockOptionsForm).exercise_strategy || "AT_EXIT",
        exercise_year: (equity as StockOptionsForm).exercise_year || null,
      };

  // Base parameters for calculation - uses Issue #248 TypedBaseParams format
  const base_params = {
    exit_year: globalSettings.exit_year,
    current_job_monthly_salary: currentJob.monthly_salary,
    startup_monthly_salary: equity.monthly_salary,
    current_job_salary_growth_rate: currentJob.annual_salary_growth_rate / 100,
    annual_roi: currentJob.assumed_annual_roi / 100,
    investment_frequency: currentJob.investment_frequency,
    failure_probability: 0.6, // 60% failure rate (realistic estimate)
    startup_params,
  };

  // Simulation parameter configurations using Issue #248 typed keys
  // Uses simple min/max ranges (conversion layer handles PERT/Normal distribution)
  const sim_param_configs = isRSU
    ? {
        exit_valuation: {
          min: exitValuation * 0.2, // 20% of expected
          max: exitValuation * 2.0, // 200% of expected
        },
        annual_roi: {
          min: Math.max(0, currentJob.assumed_annual_roi / 100 - 0.04),
          max: currentJob.assumed_annual_roi / 100 + 0.04,
        },
        current_job_salary_growth_rate: {
          min: 0.0,
          max: 0.1, // 0-10% growth
        },
      }
    : {
        exit_price_per_share: {
          min: (equity as StockOptionsForm).exit_price_per_share * 0.2,
          max: (equity as StockOptionsForm).exit_price_per_share * 2.0,
        },
        annual_roi: {
          min: Math.max(0, currentJob.assumed_annual_roi / 100 - 0.04),
          max: currentJob.assumed_annual_roi / 100 + 0.04,
        },
        current_job_salary_growth_rate: {
          min: 0.0,
          max: 0.1, // 0-10% growth
        },
      };

  return {
    base_params,
    sim_param_configs,
  };
}

/**
 * Transform API response to chart-friendly format.
 * Deltas are calculated relative to the current net outcome baseline.
 */
export function transformSensitivityResponse(
  response: SensitivityAnalysisResponse,
  currentNetOutcome: number
): SensitivityDataPoint[] {
  if (response.data === null || response.data === undefined || response.data.length === 0) {
    return [];
  }

  const data = response.data;

  // Transform and calculate delta values for tornado chart relative to current outcome
  // Note: Type assertions are used here because the API schema uses z.any() for flexibility.
  // The backend guarantees Variable, Low, High, Impact fields exist in each record.
  const transformed = data.map((item) => {
    const low = item.Low as number;
    const high = item.High as number;

    return {
      variable: item.Variable as string,
      low,
      high,
      impact: item.Impact as number,
      lowDelta: low - currentNetOutcome,
      highDelta: high - currentNetOutcome,
    };
  });

  // Sort by impact descending (most influential first)
  // Impact from backend is always positive, representing the outcome range
  return transformed.sort((a, b) => b.impact - a.impact);
}

/**
 * Calculate breakeven thresholds based on sensitivity data
 * Returns which variables can push outcome negative and their thresholds
 */
export function calculateBreakevenThresholds(
  sensitivityData: SensitivityDataPoint[],
  currentNetOutcome: number
): BreakevenThreshold[] {
  if (sensitivityData.length === 0) {
    return [];
  }

  const thresholds: BreakevenThreshold[] = [];

  for (const data of sensitivityData) {
    // Check if low scenario pushes outcome negative
    if (data.low < 0 && currentNetOutcome > 0) {
      // This variable can make the outcome negative
      const threshold: BreakevenThreshold = {
        variable: data.variable,
        threshold: calculateThresholdValue(data, currentNetOutcome),
        direction: "minimum",
        unit: getUnitForVariable(data.variable),
        description: `${data.variable} must be at least this value for the offer to be worth it`,
      };
      thresholds.push(threshold);
    }
  }

  return thresholds;
}

/**
 * Calculate the threshold value of the variable where the net outcome becomes zero.
 *
 * We assume a linear relationship between the variable value and the outcome
 * across the low/high range. The backend provides outcome *deltas* relative to
 * the current outcome, so we reconstruct the actual outcomes at the low and
 * high points, then linearly interpolate to find where outcome = 0.
 */
function calculateThresholdValue(data: SensitivityDataPoint, currentOutcome: number): number {
  const lowValue = data.low;
  const highValue = data.high;

  // Reconstruct actual outcomes at the low and high scenario points
  const lowOutcome = currentOutcome + data.lowDelta;
  const highOutcome = currentOutcome + data.highDelta;

  // Degenerate case: outcome does not change across the range
  if (lowOutcome === highOutcome) {
    return lowValue;
  }

  // If one endpoint already has zero outcome, return that variable value directly
  if (lowOutcome === 0) {
    return lowValue;
  }
  if (highOutcome === 0) {
    return highValue;
  }

  // If both outcomes are on the same side of zero, there is no breakeven within
  // [lowValue, highValue]. Fall back to the lower bound to avoid NaN/Infinity.
  if (lowOutcome * highOutcome > 0) {
    return lowValue;
  }

  // Standard linear interpolation where outcome crosses zero:
  // outcome(var) = lowOutcome + t * (highOutcome - lowOutcome)
  // var          = lowValue  + t * (highValue  - lowValue)
  // Solve for outcome(var) = 0:
  //   0 = lowOutcome + t * (highOutcome - lowOutcome)
  //   t = -lowOutcome / (highOutcome - lowOutcome)
  const denominator = highOutcome - lowOutcome;
  if (denominator === 0) {
    // Extra guard, though we already handled equal outcomes above
    return lowValue;
  }

  const t = -lowOutcome / denominator;
  return lowValue + (highValue - lowValue) * t;
}

/**
 * Get the appropriate unit for a variable
 */
function getUnitForVariable(variable: string): string {
  const units: Record<string, string> = {
    "Exit Valuation": "$",
    "Equity %": "%",
    "Salary Growth": "%",
    "Investment ROI": "%",
    Dilution: "%",
  };
  return units[variable] || "";
}
