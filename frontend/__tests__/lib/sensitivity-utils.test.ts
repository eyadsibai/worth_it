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
import type { GlobalSettingsForm, CurrentJobForm, RSUForm, StockOptionsForm } from "@/lib/schemas";

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

function createStockOptionsEquity(overrides: Partial<StockOptionsForm> = {}): StockOptionsForm {
  return {
    equity_type: "STOCK_OPTIONS",
    monthly_salary: 10000,
    num_options: 50000,
    strike_price: 1.0,
    exit_price_per_share: 10.0,
    exercise_strategy: "AT_EXIT",
    vesting_period: 4,
    cliff_period: 1,
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
    expect(request.base_params.current_job_monthly_salary).toBe(15000);
    // Verify nested startup_params structure
    expect(request.base_params.startup_params).toBeDefined();
    expect(request.base_params.startup_params.equity_type).toBe("RSU");
  });

  it("includes sim_param_configs for key variables (RSU)", () => {
    const globalSettings = createGlobalSettings();
    const currentJob = createCurrentJob();
    const equity = createRSUEquity();

    const request = buildSensitivityRequest(globalSettings, currentJob, equity);

    expect(request.sim_param_configs).toBeDefined();
    // Issue #248: Uses typed keys exit_valuation and annual_roi
    expect(request.sim_param_configs.exit_valuation).toBeDefined();
    expect(request.sim_param_configs.annual_roi).toBeDefined();
  });

  it("uses simple min/max ranges for valuation with reasonable bounds", () => {
    const globalSettings = createGlobalSettings();
    const currentJob = createCurrentJob();
    const equity = createRSUEquity({ exit_valuation: 500000000 });

    const request = buildSensitivityRequest(globalSettings, currentJob, equity);

    // Issue #248: Uses simple {min, max} format instead of PERT distribution
    const valuationConfig = request.sim_param_configs.exit_valuation!;
    expect(valuationConfig.min).toBeLessThan(500000000);
    expect(valuationConfig.max).toBeGreaterThan(500000000);
    // 20% to 200% of expected valuation
    expect(valuationConfig.min).toBe(500000000 * 0.2);
    expect(valuationConfig.max).toBe(500000000 * 2.0);
  });

  it("uses simple min/max ranges for ROI", () => {
    const globalSettings = createGlobalSettings();
    const currentJob = createCurrentJob({ assumed_annual_roi: 7 });
    const equity = createRSUEquity();

    const request = buildSensitivityRequest(globalSettings, currentJob, equity);

    // Issue #248: Uses simple {min, max} format instead of Normal distribution
    const roiConfig = request.sim_param_configs.annual_roi!;
    expect(roiConfig.min).toBeDefined();
    expect(roiConfig.max).toBeDefined();
    // ROI range should center around 7% (0.07)
    expect(roiConfig.min).toBeCloseTo(0.03); // 0.07 - 0.04
    expect(roiConfig.max).toBeCloseTo(0.11); // 0.07 + 0.04
  });

  it("builds request with Stock Options equity type", () => {
    const globalSettings = createGlobalSettings();
    const currentJob = createCurrentJob();
    const equity = createStockOptionsEquity({
      num_options: 50000,
      strike_price: 1.0,
      exit_price_per_share: 10.0,
    });

    const request = buildSensitivityRequest(globalSettings, currentJob, equity);

    // Issue #248: Uses flat startup_params structure for Stock Options
    const startup = request.base_params.startup_params;
    expect(startup.equity_type).toBe("STOCK_OPTIONS");
    // Use type narrowing to access Stock Options specific fields
    if (startup.equity_type === "STOCK_OPTIONS") {
      expect(startup.num_options).toBe(50000);
      expect(startup.strike_price).toBe(1.0);
      expect(startup.exit_price_per_share).toBe(10.0);
    }
  });

  it("includes sim_param_configs for Stock Options with exit_price_per_share", () => {
    const globalSettings = createGlobalSettings();
    const currentJob = createCurrentJob();
    const equity = createStockOptionsEquity({ exit_price_per_share: 50.0 });

    const request = buildSensitivityRequest(globalSettings, currentJob, equity);

    // Issue #248: Stock Options use exit_price_per_share instead of exit_valuation
    const priceConfig = request.sim_param_configs.exit_price_per_share!;
    // 20% to 200% of expected price
    expect(priceConfig.min).toBe(50.0 * 0.2);
    expect(priceConfig.max).toBe(50.0 * 2.0);
  });
});

describe("transformSensitivityResponse", () => {
  const currentNetOutcome = 200000; // baseline for delta calculations

  it("transforms API response to chart-friendly format", () => {
    const apiResponse = {
      data: [
        { Variable: "Exit Valuation", Low: 250000, High: 1200000, Impact: 950000 },
        { Variable: "Salary Growth", Low: 150000, High: 320000, Impact: 170000 },
      ],
    };

    const result = transformSensitivityResponse(apiResponse, currentNetOutcome);

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

    const result = transformSensitivityResponse(apiResponse, currentNetOutcome);

    expect(result[0].variable).toBe("Exit Valuation");
    expect(result[1].variable).toBe("Salary Growth");
  });

  it("handles empty response gracefully", () => {
    const apiResponse = { data: null };

    const result = transformSensitivityResponse(apiResponse, currentNetOutcome);

    expect(result).toEqual([]);
  });

  it("calculates deltas relative to currentNetOutcome", () => {
    const apiResponse = {
      data: [{ Variable: "Exit Valuation", Low: -100000, High: 500000, Impact: 600000 }],
    };

    const result = transformSensitivityResponse(apiResponse, currentNetOutcome);

    expect(result[0].lowDelta).toBe(-100000 - currentNetOutcome); // -300000
    expect(result[0].highDelta).toBe(500000 - currentNetOutcome); // 300000
  });
});

describe("calculateBreakevenThresholds", () => {
  it("calculates minimum valuation for breakeven", () => {
    const sensitivityData: SensitivityDataPoint[] = [
      {
        variable: "Exit Valuation",
        low: -50000,
        high: 500000,
        impact: 550000,
        lowDelta: -250000,
        highDelta: 300000,
      },
    ];
    const currentNetOutcome = 100000;

    const thresholds = calculateBreakevenThresholds(sensitivityData, currentNetOutcome);

    const valuationThreshold = thresholds.find((t) => t.variable === "Exit Valuation");
    expect(valuationThreshold).toBeDefined();
    expect(valuationThreshold?.direction).toBe("minimum");
  });

  it("returns empty array when no sensitivity data", () => {
    const thresholds = calculateBreakevenThresholds([], 100000);

    expect(thresholds).toEqual([]);
  });

  it("identifies variables that can make outcome negative", () => {
    const sensitivityData: SensitivityDataPoint[] = [
      {
        variable: "Exit Valuation",
        low: -200000,
        high: 500000,
        impact: 700000,
        lowDelta: -300000,
        highDelta: 400000,
      },
      {
        variable: "Salary Growth",
        low: 50000,
        high: 150000,
        impact: 100000,
        lowDelta: -50000,
        highDelta: 50000,
      },
    ];
    const currentNetOutcome = 100000;

    const thresholds = calculateBreakevenThresholds(sensitivityData, currentNetOutcome);

    // Exit Valuation can make outcome negative (low = -200000)
    expect(thresholds.some((t) => t.variable === "Exit Valuation")).toBe(true);
  });
});
