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
 * Build a sensitivity analysis request from form data
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

  // Base parameters for calculation
  const base_params = {
    exit_year: globalSettings.exit_year,
    monthly_salary: currentJob.monthly_salary,
    startup_monthly_salary: equity.monthly_salary,
    current_job_salary_growth_rate: currentJob.annual_salary_growth_rate / 100,
    annual_roi: currentJob.assumed_annual_roi / 100,
    investment_frequency: currentJob.investment_frequency,
    equity_type: isRSU ? "RSU" : "STOCK_OPTIONS",
    total_vesting_years: equity.vesting_period,
    cliff_years: equity.cliff_period,
    ...(isRSU
      ? {
          equity_pct: (equity as RSUForm).total_equity_grant_pct,
          target_exit_valuation: (equity as RSUForm).exit_valuation,
        }
      : {
          num_options: (equity as StockOptionsForm).num_options,
          strike_price: (equity as StockOptionsForm).strike_price,
          exit_price_per_share: (equity as StockOptionsForm).exit_price_per_share,
        }),
  };

  // Simulation parameter configurations
  // Use PERT distribution for valuation (bounded), normal for ROI
  const sim_param_configs = {
    valuation: {
      min_val: exitValuation * 0.2, // 20% of expected
      max_val: exitValuation * 2.0, // 200% of expected
      mode: exitValuation,
    },
    roi: {
      mean: currentJob.assumed_annual_roi / 100,
      std_dev: 0.02, // 2% standard deviation
    },
    salary_growth: {
      min_val: 0.0,
      max_val: 0.1, // 0-10% growth
      mode: currentJob.annual_salary_growth_rate / 100,
    },
    dilution: {
      min_val: 0.0,
      max_val: 0.5, // 0-50% dilution
      mode: 0.2, // Default 20% expected dilution
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
  if (response.data == null || response.data.length === 0) {
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
function calculateThresholdValue(
  data: SensitivityDataPoint,
  currentOutcome: number
): number {
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
    "Dilution": "%",
  };
  return units[variable] || "";
}

