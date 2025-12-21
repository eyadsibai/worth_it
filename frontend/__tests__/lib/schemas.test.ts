/**
 * Tests for Zod validation schemas
 * These schemas validate API requests/responses and form data
 */
import { describe, it, expect } from "vitest";
import { monteCarloRequestRSU } from "@/__tests__/fixtures/typed-payloads";
import {
  // Enums
  EquityTypeEnum,
  InvestmentFrequencyEnum,
  RoundTypeEnum,
  // Request schemas
  MonthlyDataGridRequestSchema,
  OpportunityCostRequestSchema,
  IRRRequestSchema,
  NPVRequestSchema,
  MonteCarloRequestSchema,
  DilutionFromValuationRequestSchema,
  // Response schemas
  HealthCheckResponseSchema,
  IRRResponseSchema,
  NPVResponseSchema,
  MonteCarloResponseSchema,
  DilutionFromValuationResponseSchema,
  // WebSocket schemas
  WSProgressMessageSchema,
  WSCompleteMessageSchema,
  WSErrorMessageSchema,
  WSMessageSchema,
  // Form schemas
  GlobalSettingsFormSchema,
  CurrentJobFormSchema,
  DilutionRoundFormSchema,
  RSUFormSchema,
  StockOptionsFormSchema,
} from "@/lib/schemas";

// =============================================================================
// Enum Tests
// =============================================================================

describe("EquityTypeEnum", () => {
  it("accepts valid equity types", () => {
    expect(EquityTypeEnum.parse("RSU")).toBe("RSU");
    expect(EquityTypeEnum.parse("STOCK_OPTIONS")).toBe("STOCK_OPTIONS");
  });

  it("rejects invalid equity types", () => {
    expect(() => EquityTypeEnum.parse("INVALID")).toThrow();
    expect(() => EquityTypeEnum.parse("")).toThrow();
    expect(() => EquityTypeEnum.parse(123)).toThrow();
  });
});

describe("InvestmentFrequencyEnum", () => {
  it("accepts valid frequencies", () => {
    expect(InvestmentFrequencyEnum.parse("Monthly")).toBe("Monthly");
    expect(InvestmentFrequencyEnum.parse("Annually")).toBe("Annually");
  });

  it("rejects invalid frequencies", () => {
    expect(() => InvestmentFrequencyEnum.parse("Weekly")).toThrow();
    expect(() => InvestmentFrequencyEnum.parse("monthly")).toThrow(); // case sensitive
  });
});

describe("RoundTypeEnum", () => {
  it("accepts valid round types", () => {
    expect(RoundTypeEnum.parse("SAFE_NOTE")).toBe("SAFE_NOTE");
    expect(RoundTypeEnum.parse("PRICED_ROUND")).toBe("PRICED_ROUND");
  });

  it("rejects invalid round types", () => {
    expect(() => RoundTypeEnum.parse("SEED")).toThrow();
  });
});

// =============================================================================
// Request Schema Tests
// =============================================================================

describe("MonthlyDataGridRequestSchema", () => {
  it("validates correct monthly data grid request", () => {
    const validData = {
      exit_year: 5,
      current_job_monthly_salary: 15000,
      startup_monthly_salary: 12000,
      current_job_salary_growth_rate: 0.05,
    };
    expect(() => MonthlyDataGridRequestSchema.parse(validData)).not.toThrow();
  });

  it("rejects exit_year outside 1-20 range", () => {
    const invalidLow = {
      exit_year: 0,
      current_job_monthly_salary: 15000,
      startup_monthly_salary: 12000,
      current_job_salary_growth_rate: 0.05,
    };
    const invalidHigh = {
      exit_year: 21,
      current_job_monthly_salary: 15000,
      startup_monthly_salary: 12000,
      current_job_salary_growth_rate: 0.05,
    };
    expect(() => MonthlyDataGridRequestSchema.parse(invalidLow)).toThrow();
    expect(() => MonthlyDataGridRequestSchema.parse(invalidHigh)).toThrow();
  });

  it("rejects negative salaries", () => {
    const invalidData = {
      exit_year: 5,
      current_job_monthly_salary: -1000,
      startup_monthly_salary: 12000,
      current_job_salary_growth_rate: 0.05,
    };
    expect(() => MonthlyDataGridRequestSchema.parse(invalidData)).toThrow();
  });

  it("rejects growth rate above 100%", () => {
    const invalidData = {
      exit_year: 5,
      current_job_monthly_salary: 15000,
      startup_monthly_salary: 12000,
      current_job_salary_growth_rate: 1.5,
    };
    expect(() => MonthlyDataGridRequestSchema.parse(invalidData)).toThrow();
  });

  it("accepts optional dilution_rounds", () => {
    const withRounds = {
      exit_year: 5,
      current_job_monthly_salary: 15000,
      startup_monthly_salary: 12000,
      current_job_salary_growth_rate: 0.05,
      dilution_rounds: [{ round_name: "Series A", dilution_pct: 20 }],
    };
    const withNull = {
      exit_year: 5,
      current_job_monthly_salary: 15000,
      startup_monthly_salary: 12000,
      current_job_salary_growth_rate: 0.05,
      dilution_rounds: null,
    };
    expect(() => MonthlyDataGridRequestSchema.parse(withRounds)).not.toThrow();
    expect(() => MonthlyDataGridRequestSchema.parse(withNull)).not.toThrow();
  });
});

describe("IRRRequestSchema", () => {
  it("validates correct IRR request", () => {
    const validData = {
      monthly_surpluses: [1000, 1500, 2000, 2500],
      final_payout_value: 50000,
    };
    expect(() => IRRRequestSchema.parse(validData)).not.toThrow();
  });

  it("accepts empty monthly_surpluses array", () => {
    const validData = {
      monthly_surpluses: [],
      final_payout_value: 50000,
    };
    expect(() => IRRRequestSchema.parse(validData)).not.toThrow();
  });

  it("rejects non-array monthly_surpluses", () => {
    const invalidData = {
      monthly_surpluses: "not an array",
      final_payout_value: 50000,
    };
    expect(() => IRRRequestSchema.parse(invalidData)).toThrow();
  });
});

describe("NPVRequestSchema", () => {
  it("validates correct NPV request", () => {
    const validData = {
      monthly_surpluses: [1000, 1500, 2000],
      annual_roi: 0.08,
      final_payout_value: 50000,
    };
    expect(() => NPVRequestSchema.parse(validData)).not.toThrow();
  });

  it("rejects annual_roi above 100%", () => {
    const invalidData = {
      monthly_surpluses: [1000, 1500, 2000],
      annual_roi: 1.5,
      final_payout_value: 50000,
    };
    expect(() => NPVRequestSchema.parse(invalidData)).toThrow();
  });

  it("rejects negative annual_roi", () => {
    const invalidData = {
      monthly_surpluses: [1000, 1500, 2000],
      annual_roi: -0.05,
      final_payout_value: 50000,
    };
    expect(() => NPVRequestSchema.parse(invalidData)).toThrow();
  });
});

describe("MonteCarloRequestSchema", () => {
  it("validates correct Monte Carlo request with typed format", () => {
    // Issue #248: Use typed payload fixture for validation
    expect(() => MonteCarloRequestSchema.parse(monteCarloRequestRSU)).not.toThrow();
  });

  it("rejects num_simulations below 1", () => {
    const invalidData = {
      ...monteCarloRequestRSU,
      num_simulations: 0,
    };
    expect(() => MonteCarloRequestSchema.parse(invalidData)).toThrow();
  });

  it("rejects num_simulations above 100000", () => {
    const invalidData = {
      ...monteCarloRequestRSU,
      num_simulations: 100001,
    };
    expect(() => MonteCarloRequestSchema.parse(invalidData)).toThrow();
  });
});

describe("DilutionFromValuationRequestSchema", () => {
  it("validates correct dilution request", () => {
    const validData = {
      pre_money_valuation: 10000000,
      amount_raised: 2000000,
    };
    expect(() => DilutionFromValuationRequestSchema.parse(validData)).not.toThrow();
  });

  it("rejects negative valuations", () => {
    const invalidData = {
      pre_money_valuation: -10000000,
      amount_raised: 2000000,
    };
    expect(() => DilutionFromValuationRequestSchema.parse(invalidData)).toThrow();
  });

  it("rejects negative amount_raised", () => {
    const invalidData = {
      pre_money_valuation: 10000000,
      amount_raised: -2000000,
    };
    expect(() => DilutionFromValuationRequestSchema.parse(invalidData)).toThrow();
  });
});

// =============================================================================
// Response Schema Tests
// =============================================================================

describe("HealthCheckResponseSchema", () => {
  it("validates correct health check response", () => {
    const validData = {
      status: "healthy",
      version: "1.0.0",
    };
    expect(() => HealthCheckResponseSchema.parse(validData)).not.toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => HealthCheckResponseSchema.parse({ status: "healthy" })).toThrow();
    expect(() => HealthCheckResponseSchema.parse({ version: "1.0.0" })).toThrow();
  });
});

describe("IRRResponseSchema", () => {
  it("validates IRR response with number", () => {
    expect(() => IRRResponseSchema.parse({ irr: 0.15 })).not.toThrow();
  });

  it("validates IRR response with null (no valid IRR)", () => {
    expect(() => IRRResponseSchema.parse({ irr: null })).not.toThrow();
  });
});

describe("NPVResponseSchema", () => {
  it("validates NPV response with number", () => {
    expect(() => NPVResponseSchema.parse({ npv: 125000 })).not.toThrow();
  });

  it("validates NPV response with null", () => {
    expect(() => NPVResponseSchema.parse({ npv: null })).not.toThrow();
  });
});

describe("MonteCarloResponseSchema", () => {
  it("validates correct Monte Carlo response", () => {
    const validData = {
      net_outcomes: [10000, 20000, -5000, 30000],
      simulated_valuations: [500000, 750000, 250000, 1000000],
    };
    expect(() => MonteCarloResponseSchema.parse(validData)).not.toThrow();
  });

  it("accepts empty arrays", () => {
    const validData = {
      net_outcomes: [],
      simulated_valuations: [],
    };
    expect(() => MonteCarloResponseSchema.parse(validData)).not.toThrow();
  });
});

describe("DilutionFromValuationResponseSchema", () => {
  it("validates correct dilution response", () => {
    expect(() => DilutionFromValuationResponseSchema.parse({ dilution: 0.166667 })).not.toThrow();
  });

  it("rejects missing dilution field", () => {
    expect(() => DilutionFromValuationResponseSchema.parse({})).toThrow();
  });
});

// =============================================================================
// WebSocket Message Schema Tests
// =============================================================================

describe("WSProgressMessageSchema", () => {
  it("validates correct progress message", () => {
    const validData = {
      type: "progress",
      current: 500,
      total: 1000,
      percentage: 50,
    };
    expect(() => WSProgressMessageSchema.parse(validData)).not.toThrow();
  });

  it("rejects wrong type literal", () => {
    const invalidData = {
      type: "update", // should be "progress"
      current: 500,
      total: 1000,
      percentage: 50,
    };
    expect(() => WSProgressMessageSchema.parse(invalidData)).toThrow();
  });
});

describe("WSCompleteMessageSchema", () => {
  it("validates correct complete message", () => {
    const validData = {
      type: "complete",
      net_outcomes: [10000, 20000, 30000],
      simulated_valuations: [500000, 750000, 1000000],
    };
    expect(() => WSCompleteMessageSchema.parse(validData)).not.toThrow();
  });
});

describe("WSErrorMessageSchema", () => {
  it("validates correct error message with structured format", () => {
    const validData = {
      type: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: "Simulation failed due to invalid parameters",
      },
    };
    expect(() => WSErrorMessageSchema.parse(validData)).not.toThrow();
  });

  it("validates error message with field details", () => {
    const validData = {
      type: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid input parameters",
        details: [
          { field: "exit_year", message: "Must be at least 1" },
          { field: "monthly_salary", message: "Required" },
        ],
      },
    };
    expect(() => WSErrorMessageSchema.parse(validData)).not.toThrow();
  });
});

describe("WSMessageSchema (discriminated union)", () => {
  it("correctly discriminates progress messages", () => {
    const message = WSMessageSchema.parse({
      type: "progress",
      current: 100,
      total: 1000,
      percentage: 10,
    });
    expect(message.type).toBe("progress");
    if (message.type === "progress") {
      expect(message.current).toBe(100);
    }
  });

  it("correctly discriminates complete messages", () => {
    const message = WSMessageSchema.parse({
      type: "complete",
      net_outcomes: [1000],
      simulated_valuations: [500000],
    });
    expect(message.type).toBe("complete");
    if (message.type === "complete") {
      expect(message.net_outcomes).toHaveLength(1);
    }
  });

  it("correctly discriminates error messages", () => {
    const message = WSMessageSchema.parse({
      type: "error",
      error: {
        code: "VALIDATION_ERROR",
        message: "Test error",
      },
    });
    expect(message.type).toBe("error");
    if (message.type === "error") {
      expect(message.error.message).toBe("Test error");
      expect(message.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects unknown message types", () => {
    expect(() =>
      WSMessageSchema.parse({
        type: "unknown",
        data: "something",
      })
    ).toThrow();
  });
});

// =============================================================================
// Form Schema Tests
// =============================================================================

describe("GlobalSettingsFormSchema", () => {
  it("validates correct global settings", () => {
    expect(() => GlobalSettingsFormSchema.parse({ exit_year: 5 })).not.toThrow();
  });

  it("rejects exit_year below 1", () => {
    expect(() => GlobalSettingsFormSchema.parse({ exit_year: 0 })).toThrow();
  });

  it("rejects exit_year above 20", () => {
    expect(() => GlobalSettingsFormSchema.parse({ exit_year: 21 })).toThrow();
  });

  it("rejects non-integer exit_year", () => {
    expect(() => GlobalSettingsFormSchema.parse({ exit_year: 5.5 })).toThrow();
  });
});

describe("CurrentJobFormSchema", () => {
  it("validates correct current job form", () => {
    const validData = {
      monthly_salary: 15000,
      annual_salary_growth_rate: 0.05,
      assumed_annual_roi: 0.08,
      investment_frequency: "Monthly",
    };
    expect(() => CurrentJobFormSchema.parse(validData)).not.toThrow();
  });

  it("rejects negative monthly_salary", () => {
    const invalidData = {
      monthly_salary: -15000,
      annual_salary_growth_rate: 0.05,
      assumed_annual_roi: 0.08,
      investment_frequency: "Monthly",
    };
    expect(() => CurrentJobFormSchema.parse(invalidData)).toThrow();
  });

  it("rejects growth rate above 10 (1000%)", () => {
    const invalidData = {
      monthly_salary: 15000,
      annual_salary_growth_rate: 11,
      assumed_annual_roi: 0.08,
      investment_frequency: "Monthly",
    };
    expect(() => CurrentJobFormSchema.parse(invalidData)).toThrow();
  });

  it("rejects ROI above 20 (2000%)", () => {
    const invalidData = {
      monthly_salary: 15000,
      annual_salary_growth_rate: 0.05,
      assumed_annual_roi: 21,
      investment_frequency: "Monthly",
    };
    expect(() => CurrentJobFormSchema.parse(invalidData)).toThrow();
  });

  it("rejects invalid investment frequency", () => {
    const invalidData = {
      monthly_salary: 15000,
      annual_salary_growth_rate: 0.05,
      assumed_annual_roi: 0.08,
      investment_frequency: "Weekly",
    };
    expect(() => CurrentJobFormSchema.parse(invalidData)).toThrow();
  });
});

describe("DilutionRoundFormSchema", () => {
  it("validates correct dilution round", () => {
    const validData = {
      round_name: "Series A",
      round_type: "PRICED_ROUND",
      year: 2,
      dilution_pct: 20,
      pre_money_valuation: 10000000,
      amount_raised: 2000000,
      salary_change: 1000,
      enabled: true,
    };
    expect(() => DilutionRoundFormSchema.parse(validData)).not.toThrow();
  });

  it("rejects dilution_pct above 100", () => {
    const invalidData = {
      round_name: "Series A",
      round_type: "PRICED_ROUND",
      year: 2,
      dilution_pct: 101,
      pre_money_valuation: 10000000,
      amount_raised: 2000000,
      salary_change: 1000,
      enabled: true,
    };
    expect(() => DilutionRoundFormSchema.parse(invalidData)).toThrow();
  });

  it("rejects year above 20", () => {
    const invalidData = {
      round_name: "Series A",
      round_type: "PRICED_ROUND",
      year: 25,
      dilution_pct: 20,
      pre_money_valuation: 10000000,
      amount_raised: 2000000,
      salary_change: 1000,
      enabled: true,
    };
    expect(() => DilutionRoundFormSchema.parse(invalidData)).toThrow();
  });

  it("accepts negative salary_change (salary decrease)", () => {
    const validData = {
      round_name: "Down Round",
      round_type: "PRICED_ROUND",
      year: 3,
      dilution_pct: 30,
      pre_money_valuation: 5000000,
      amount_raised: 1000000,
      salary_change: -500,
      enabled: true,
    };
    expect(() => DilutionRoundFormSchema.parse(validData)).not.toThrow();
  });
});

describe("RSUFormSchema", () => {
  it("validates correct RSU form", () => {
    const validData = {
      equity_type: "RSU",
      monthly_salary: 12000,
      total_equity_grant_pct: 0.5,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 100000000,
    };
    expect(() => RSUFormSchema.parse(validData)).not.toThrow();
  });

  it("rejects equity_type other than RSU", () => {
    const invalidData = {
      equity_type: "STOCK_OPTIONS", // wrong type for RSUFormSchema
      monthly_salary: 12000,
      total_equity_grant_pct: 0.5,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 100000000,
    };
    expect(() => RSUFormSchema.parse(invalidData)).toThrow();
  });

  it("rejects equity_pct above 100", () => {
    const invalidData = {
      equity_type: "RSU",
      monthly_salary: 12000,
      total_equity_grant_pct: 101,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 100000000,
    };
    expect(() => RSUFormSchema.parse(invalidData)).toThrow();
  });

  it("rejects vesting_period above 10", () => {
    const invalidData = {
      equity_type: "RSU",
      monthly_salary: 12000,
      total_equity_grant_pct: 0.5,
      vesting_period: 11,
      cliff_period: 1,
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 100000000,
    };
    expect(() => RSUFormSchema.parse(invalidData)).toThrow();
  });

  it("uses default values for vesting and cliff periods", () => {
    const minimalData = {
      equity_type: "RSU",
      monthly_salary: 12000,
      total_equity_grant_pct: 0.5,
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 100000000,
    };
    const parsed = RSUFormSchema.parse(minimalData);
    expect(parsed.vesting_period).toBe(4);
    expect(parsed.cliff_period).toBe(1);
  });
});

describe("StockOptionsFormSchema", () => {
  it("validates correct stock options form", () => {
    const validData = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 12000,
      num_options: 10000,
      strike_price: 1.5,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 15,
    };
    expect(() => StockOptionsFormSchema.parse(validData)).not.toThrow();
  });

  it("rejects equity_type other than STOCK_OPTIONS", () => {
    const invalidData = {
      equity_type: "RSU",
      monthly_salary: 12000,
      num_options: 10000,
      strike_price: 1.5,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 15,
    };
    expect(() => StockOptionsFormSchema.parse(invalidData)).toThrow();
  });

  it("rejects negative num_options", () => {
    const invalidData = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 12000,
      num_options: -1000,
      strike_price: 1.5,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 15,
    };
    expect(() => StockOptionsFormSchema.parse(invalidData)).toThrow();
  });

  it("accepts AFTER_VESTING exercise strategy with exercise_year", () => {
    const validData = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 12000,
      num_options: 10000,
      strike_price: 1.5,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AFTER_VESTING",
      exercise_year: 2,
      exit_price_per_share: 15,
    };
    expect(() => StockOptionsFormSchema.parse(validData)).not.toThrow();
  });

  it("rejects invalid exercise_strategy", () => {
    const invalidData = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 12000,
      num_options: 10000,
      strike_price: 1.5,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "IMMEDIATELY",
      exit_price_per_share: 15,
    };
    expect(() => StockOptionsFormSchema.parse(invalidData)).toThrow();
  });
});
