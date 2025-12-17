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
  const exitValuation = isRSU
    ? (equity as RSUForm).exit_valuation
    : (equity as StockOptionsForm).exit_price_per_share * 1000000; // Estimate valuation

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
 * Transform API response to chart-friendly format
 */
export function transformSensitivityResponse(
  response: SensitivityAnalysisResponse
): SensitivityDataPoint[] {
  if (!response.data || response.data.length === 0) {
    return [];
  }

  // Transform and calculate delta values for tornado chart
  const transformed = response.data.map((item) => {
    const low = item.Low as number;
    const high = item.High as number;
    const baseline = (low + high) / 2; // Approximate baseline

    return {
      variable: item.Variable as string,
      low,
      high,
      impact: item.Impact as number,
      lowDelta: low - baseline,
      highDelta: high - baseline,
    };
  });

  // Sort by impact descending (most influential first)
  return transformed.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
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
 * Calculate the threshold value where outcome becomes zero
 */
function calculateThresholdValue(
  data: SensitivityDataPoint,
  currentOutcome: number
): number {
  // Linear interpolation to find where outcome = 0
  const range = data.high - data.low;
  const impactRange = data.highDelta - data.lowDelta;

  if (impactRange === 0) return data.low;

  // Find the point where outcome crosses zero
  const ratio = Math.abs(data.lowDelta) / Math.abs(impactRange);
  return data.low + range * ratio;
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

/**
 * Format variable names for display
 */
export function formatVariableName(variable: string): string {
  const displayNames: Record<string, string> = {
    valuation: "Exit Valuation",
    roi: "Investment ROI",
    salary_growth: "Salary Growth",
    dilution: "Dilution",
    equity_pct: "Equity %",
  };
  return displayNames[variable] || variable;
}

/**
 * Get color for sensitivity bar based on impact direction
 */
export function getSensitivityColor(
  value: number,
  isPositive: boolean
): string {
  if (isPositive) {
    return value >= 0 ? "var(--chart-3)" : "var(--destructive)";
  }
  return value >= 0 ? "var(--destructive)" : "var(--chart-3)";
}
