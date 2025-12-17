/**
 * Tests for sensitivity analysis utilities
 * Following TDD for Issue #155
 */
import { describe, it, expect } from "vitest";
import {
  buildSensitivityRequest,
  transformSensitivityResponse,
  calculateBreakevenThresholds,
  type SensitivityDataPoint,
} from "@/lib/sensitivity-utils";
import type { GlobalSettingsForm, CurrentJobForm, RSUForm } from "@/lib/schemas";

// Test data factories
function createGlobalSettings(overrides: Partial<GlobalSettingsForm> = {}): GlobalSettingsForm {
  return {
    exit_year: 5,
    ...overrides,
  };
}

function createCurrentJob(overrides: Partial<CurrentJobForm> = {}): CurrentJobForm {
  return {
    monthly_salary: 15000,
    annual_salary_growth_rate: 3,
    assumed_annual_roi: 7,
    investment_frequency: "Monthly",
    ...overrides,
  };
}

function createRSUEquity(overrides: Partial<RSUForm> = {}): RSUForm {
  return {
    equity_type: "RSU",
    monthly_salary: 12000,
    total_equity_grant_pct: 0.5,
    vesting_period: 4,
    cliff_period: 1,
    exit_valuation: 500000000,
    simulate_dilution: false,
    dilution_rounds: [],
    ...overrides,
  };
}

describe("buildSensitivityRequest", () => {
  it("builds request with base params from form data", () => {
    const globalSettings = createGlobalSettings();
    const currentJob = createCurrentJob();
    const equity = createRSUEquity();

    const request = buildSensitivityRequest(globalSettings, currentJob, equity);

    expect(request.base_params).toBeDefined();
    expect(request.base_params.exit_year).toBe(5);
    expect(request.base_params.monthly_salary).toBe(15000);
  });

  it("includes sim_param_configs for key variables", () => {
    const globalSettings = createGlobalSettings();
    const currentJob = createCurrentJob();
    const equity = createRSUEquity();

    const request = buildSensitivityRequest(globalSettings, currentJob, equity);

    expect(request.sim_param_configs).toBeDefined();
    expect(request.sim_param_configs.valuation).toBeDefined();
    expect(request.sim_param_configs.roi).toBeDefined();
  });

  it("uses PERT distribution for valuation with reasonable bounds", () => {
    const globalSettings = createGlobalSettings();
    const currentJob = createCurrentJob();
    const equity = createRSUEquity({ exit_valuation: 500000000 });

    const request = buildSensitivityRequest(globalSettings, currentJob, equity);

    const valuationConfig = request.sim_param_configs.valuation;
    expect(valuationConfig.mode).toBe(500000000);
    expect(valuationConfig.min_val).toBeLessThan(500000000);
    expect(valuationConfig.max_val).toBeGreaterThan(500000000);
  });

  it("uses normal distribution for ROI", () => {
    const globalSettings = createGlobalSettings();
    const currentJob = createCurrentJob({ assumed_annual_roi: 7 });
    const equity = createRSUEquity();

    const request = buildSensitivityRequest(globalSettings, currentJob, equity);

    const roiConfig = request.sim_param_configs.roi;
    expect(roiConfig.mean).toBeCloseTo(0.07);
    expect(roiConfig.std_dev).toBeDefined();
  });
});

describe("transformSensitivityResponse", () => {
  it("transforms API response to chart-friendly format", () => {
    const apiResponse = {
      data: [
        { Variable: "Exit Valuation", Low: 250000, High: 1200000, Impact: 950000 },
        { Variable: "Salary Growth", Low: 150000, High: 320000, Impact: 170000 },
      ],
    };

    const result = transformSensitivityResponse(apiResponse);

    expect(result).toHaveLength(2);
    expect(result[0].variable).toBe("Exit Valuation");
    expect(result[0].low).toBe(250000);
    expect(result[0].high).toBe(1200000);
    expect(result[0].impact).toBe(950000);
  });

  it("sorts results by impact descending", () => {
    const apiResponse = {
      data: [
        { Variable: "Salary Growth", Low: 150000, High: 320000, Impact: 170000 },
        { Variable: "Exit Valuation", Low: 250000, High: 1200000, Impact: 950000 },
      ],
    };

    const result = transformSensitivityResponse(apiResponse);

    expect(result[0].variable).toBe("Exit Valuation");
    expect(result[1].variable).toBe("Salary Growth");
  });

  it("handles empty response gracefully", () => {
    const apiResponse = { data: null };

    const result = transformSensitivityResponse(apiResponse);

    expect(result).toEqual([]);
  });

  it("calculates impact range for tornado chart", () => {
    const apiResponse = {
      data: [
        { Variable: "Exit Valuation", Low: -100000, High: 500000, Impact: 600000 },
      ],
    };

    const result = transformSensitivityResponse(apiResponse);

    expect(result[0].lowDelta).toBeDefined();
    expect(result[0].highDelta).toBeDefined();
    // For tornado chart: lowDelta should be negative (from baseline)
    // highDelta should be positive (from baseline)
  });
});

describe("calculateBreakevenThresholds", () => {
  it("calculates minimum valuation for breakeven", () => {
    const sensitivityData: SensitivityDataPoint[] = [
      { variable: "Exit Valuation", low: -50000, high: 500000, impact: 550000, lowDelta: -250000, highDelta: 300000 },
    ];
    const currentNetOutcome = 100000;

    const thresholds = calculateBreakevenThresholds(sensitivityData, currentNetOutcome);

    const valuationThreshold = thresholds.find(t => t.variable === "Exit Valuation");
    expect(valuationThreshold).toBeDefined();
    expect(valuationThreshold?.direction).toBe("minimum");
  });

  it("returns empty array when no sensitivity data", () => {
    const thresholds = calculateBreakevenThresholds([], 100000);

    expect(thresholds).toEqual([]);
  });

  it("identifies variables that can make outcome negative", () => {
    const sensitivityData: SensitivityDataPoint[] = [
      { variable: "Exit Valuation", low: -200000, high: 500000, impact: 700000, lowDelta: -300000, highDelta: 400000 },
      { variable: "Salary Growth", low: 50000, high: 150000, impact: 100000, lowDelta: -50000, highDelta: 50000 },
    ];
    const currentNetOutcome = 100000;

    const thresholds = calculateBreakevenThresholds(sensitivityData, currentNetOutcome);

    // Exit Valuation can make outcome negative (low = -200000)
    expect(thresholds.some(t => t.variable === "Exit Valuation")).toBe(true);
  });
});
