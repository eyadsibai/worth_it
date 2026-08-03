/**
 * Tests for Zod validation schemas
 * These schemas validate API requests/responses and form data
 */
import { describe, it, expect } from "vitest";
import { monteCarloRequestRSU } from "@/__tests__/fixtures/typed-payloads";
import { EXAMPLE_SCENARIOS, type ExampleScenario } from "@/lib/constants/examples";
import { toDilutionRoundWires } from "@/lib/hooks/use-scenario-calculation";
import type { DilutionRoundWire } from "@/lib/schemas";
import {
  // Enums
  EquityTypeEnum,
  InvestmentFrequencyEnum,
  RoundTypeEnum,
  // Wire schemas
  DilutionRoundWireSchema,
  // Export schemas (must mirror backend Pydantic export models)
  ExportRequestSchema,
  FirstChicagoExportRequestSchema,
  PreRevenueExportRequestSchema,
  // Request schemas
  MonthlyDataGridRequestSchema,
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

  it("accepts optional dilution_rounds in the backend wire shape", () => {
    const withRounds = {
      exit_year: 5,
      current_job_monthly_salary: 15000,
      startup_monthly_salary: 12000,
      current_job_salary_growth_rate: 0.05,
      dilution_rounds: [{ year: 2, dilution: 0.2, status: "upcoming" }],
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

  it("rejects dilution_rounds sent in the form shape the backend silently discards", () => {
    // `year` IS present, so this round is only rejectable because the remaining
    // keys are unknown to the wire contract. Without a strict object the extra
    // keys are stripped, the round parses as `{ year: 2 }`, and the backend
    // computes zero dilution while the payout is silently overstated.
    const formShaped = {
      exit_year: 5,
      current_job_monthly_salary: 15000,
      startup_monthly_salary: 12000,
      current_job_salary_growth_rate: 0.05,
      dilution_rounds: [
        {
          year: 2,
          round_name: "Series A",
          round_type: "PRICED_ROUND",
          dilution_pct: 20,
          pre_money_valuation: 20000000,
          amount_raised: 5000000,
          salary_change: 10000,
        },
      ],
    };
    expect(() => MonthlyDataGridRequestSchema.parse(formShaped)).toThrow();
  });

  it("rejects dilution expressed as a 0-100 percentage", () => {
    const percentScaled = {
      exit_year: 5,
      current_job_monthly_salary: 15000,
      startup_monthly_salary: 12000,
      current_job_salary_growth_rate: 0.05,
      dilution_rounds: [{ year: 2, dilution: 20 }],
    };
    expect(() => MonthlyDataGridRequestSchema.parse(percentScaled)).toThrow();
  });
});

describe("DilutionRoundWireSchema", () => {
  it("accepts the exact keys the backend DilutionRound TypedDict declares", () => {
    const wire = {
      year: 2,
      dilution: 0.2,
      new_salary: 10000,
      is_safe_note: false,
      valuation_at_sale: 20000000,
      percent_to_sell: 0.1,
      status: "upcoming",
    };
    expect(DilutionRoundWireSchema.parse(wire)).toEqual(wire);
  });

  it("rejects unknown keys instead of silently stripping them", () => {
    // Pydantic drops keys a TypedDict does not declare rather than raising, so
    // this guard has to live on the client. `dilution_pct` is the form's key
    // name: stripping it would send a round with no `dilution` at all.
    const result = DilutionRoundWireSchema.safeParse({ year: 2, dilution_pct: 20 });
    expect(result.success).toBe(false);
  });

  it("never yields a round whose dilution was dropped on the floor", () => {
    const result = DilutionRoundWireSchema.safeParse({ year: 2, dilution_pct: 20 });
    // The regression this pins: parse used to SUCCEED with `{ year: 2 }`.
    expect(result.success ? result.data : null).not.toEqual({ year: 2 });
  });

  it("rejects a misnamed salary key rather than dropping the salary change", () => {
    const result = DilutionRoundWireSchema.safeParse({ year: 2, salary_change: 10000 });
    expect(result.success).toBe(false);
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
      seed: 424242,
    };
    expect(() => WSCompleteMessageSchema.parse(validData)).not.toThrow();
  });

  it("keeps the seed that replays the run", () => {
    const message = WSCompleteMessageSchema.parse({
      type: "complete",
      net_outcomes: [10000],
      simulated_valuations: [500000],
      seed: 424242,
    });
    expect(message.seed).toBe(424242);
  });

  it("rejects a complete message without a seed", () => {
    expect(
      WSCompleteMessageSchema.safeParse({
        type: "complete",
        net_outcomes: [10000],
        simulated_valuations: [500000],
      }).success
    ).toBe(false);
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
      seed: 424242,
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

  // REWRITTEN: this test used to be "accepts negative salary_change (salary
  // decrease)" and asserted that -500 parses. That codified the delta reading of
  // the field. `salary_change` is an ABSOLUTE monthly salary (backend
  // `new_salary`), so a negative value is meaningless - the backend's `> 0`
  // guard would silently ignore it, which is exactly the silent-drop class of
  // bug this contract layer exists to prevent.
  it("rejects a negative salary_change: the field is an absolute salary, not a delta", () => {
    const invalidData = {
      round_name: "Down Round",
      round_type: "PRICED_ROUND",
      year: 3,
      dilution_pct: 30,
      pre_money_valuation: 5000000,
      amount_raised: 1000000,
      salary_change: -500,
      enabled: true,
    };
    expect(() => DilutionRoundFormSchema.parse(invalidData)).toThrow();
  });

  it("accepts 0 salary_change as 'salary unchanged'", () => {
    const validData = {
      round_name: "Down Round",
      round_type: "PRICED_ROUND",
      year: 3,
      dilution_pct: 30,
      pre_money_valuation: 5000000,
      amount_raised: 1000000,
      salary_change: 0,
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

// =============================================================================
// Shipped Example Scenarios - wire contract pinning
//
// The examples are the first thing a new user loads. `salary_change` on a
// funding round is an ABSOLUTE monthly salary (the form labels it "New Salary"),
// and `toDilutionRoundWire` forwards it to the backend as `new_salary`, which
// `create_monthly_data_grid` assigns straight onto StartupSalary from that
// round's start month onward. A delta smuggled into that field silently
// collapses the startup salary and roughly triples the reported opportunity
// cost, so every shipped example is pinned to an exact expected number here.
// =============================================================================

const MONTHS_PER_YEAR = 12;

/** Mirror of backend `create_monthly_data_grid` StartupSalary column. */
function startupSalaryByMonth(
  baseMonthlySalary: number,
  rounds: DilutionRoundWire[],
  totalMonths: number
): number[] {
  const salaries = new Array<number>(totalMonths).fill(baseMonthlySalary);
  const sorted = [...rounds].sort((a, b) => a.year - b.year);
  for (const round of sorted) {
    const newSalary = round.new_salary ?? 0;
    if (newSalary > 0) {
      const startMonth = Math.max(0, (round.year - 1) * MONTHS_PER_YEAR);
      for (let month = startMonth; month < totalMonths; month += 1) {
        salaries[month] = newSalary;
      }
    }
  }
  return salaries;
}

/** Mirror of backend `create_monthly_data_grid` CurrentJobSalary column. */
function currentJobSalaryByMonth(
  baseMonthlySalary: number,
  annualGrowthPct: number,
  totalMonths: number
): number[] {
  return Array.from(
    { length: totalMonths },
    (_, month) =>
      baseMonthlySalary * (1 + annualGrowthPct / 100) ** Math.floor(month / MONTHS_PER_YEAR)
  );
}

interface ExampleProjection {
  totalMonths: number;
  startupSalaries: number[];
  currentJobSalaries: number[];
  /** Cumulative nominal salary surplus forgone across the whole horizon. */
  principalForgone: number;
}

function projectExample(example: ExampleScenario): ExampleProjection {
  const equity = example.equityDetails;
  if (equity.equity_type !== "RSU") {
    throw new Error(`Example ${example.id} is not an RSU scenario`);
  }
  const totalMonths = example.globalSettings.exit_year * MONTHS_PER_YEAR;
  const wireRounds = equity.simulate_dilution ? toDilutionRoundWires(equity.dilution_rounds) : [];
  const startupSalaries = startupSalaryByMonth(equity.monthly_salary, wireRounds, totalMonths);
  const currentJobSalaries = currentJobSalaryByMonth(
    example.currentJob.monthly_salary,
    example.currentJob.annual_salary_growth_rate,
    totalMonths
  );
  const principalForgone = currentJobSalaries.reduce(
    (sum, salary, month) => sum + (salary - startupSalaries[month]),
    0
  );
  return { totalMonths, startupSalaries, currentJobSalaries, principalForgone };
}

describe("EXAMPLE_SCENARIOS wire contract", () => {
  it("emits wire rounds that satisfy DilutionRoundWireSchema", () => {
    for (const example of EXAMPLE_SCENARIOS) {
      const equity = example.equityDetails;
      if (equity.equity_type !== "RSU") continue;
      for (const wire of toDilutionRoundWires(equity.dilution_rounds)) {
        const result = DilutionRoundWireSchema.safeParse(wire);
        expect(result.success, `${example.id} produced an invalid wire round`).toBe(true);
      }
    }
  });

  it("never treats salary_change as a delta: every round is 0 or a real salary", () => {
    for (const example of EXAMPLE_SCENARIOS) {
      const equity = example.equityDetails;
      if (equity.equity_type !== "RSU") continue;
      for (const round of equity.dilution_rounds) {
        if (round.salary_change === 0) continue;
        expect(
          round.salary_change,
          `${example.id}/${round.round_name}: salary_change ${round.salary_change} is a raise ` +
            `amount, not an absolute monthly salary (base is ${equity.monthly_salary})`
        ).toBeGreaterThanOrEqual(equity.monthly_salary);
      }
    }
  });

  it("never lets a funding round cut the startup salary below its starting value", () => {
    for (const example of EXAMPLE_SCENARIOS) {
      const equity = example.equityDetails;
      if (equity.equity_type !== "RSU") continue;
      const { startupSalaries } = projectExample(example);
      for (const salary of startupSalaries) {
        expect(salary, `${example.id} startup salary dipped below its base`).toBeGreaterThanOrEqual(
          equity.monthly_salary
        );
      }
    }
  });

  it.each([
    { id: "early-stage", principalForgone: 171690.9, finalStartupSalary: 12000 },
    { id: "growth-stage", principalForgone: 134363.52, finalStartupSalary: 13500 },
    { id: "late-stage", principalForgone: 54480, finalStartupSalary: 16000 },
    { id: "big-tech", principalForgone: -42763.776, finalStartupSalary: 20000 },
  ])(
    "pins $id to a principal-forgone of $principalForgone",
    ({ id, principalForgone, finalStartupSalary }) => {
      const example = EXAMPLE_SCENARIOS.find((scenario) => scenario.id === id);
      expect(example, `example ${id} is missing`).toBeDefined();
      const projection = projectExample(example as ExampleScenario);
      expect(projection.principalForgone).toBeCloseTo(principalForgone, 2);
      expect(projection.startupSalaries[projection.totalMonths - 1]).toBe(finalStartupSalary);
    }
  );

  it("keeps the flagship early-stage demo from swinging wildly negative", () => {
    const example = EXAMPLE_SCENARIOS.find((scenario) => scenario.id === "early-stage");
    const { principalForgone } = projectExample(example as ExampleScenario);
    // The delta-vs-absolute regression pushed this to ~$627K.
    expect(principalForgone).toBeLessThan(250_000);
  });
});

// =============================================================================
// Export Schemas - must mirror backend Pydantic export models
// (backend/src/worth_it/models.py: ExportRequest, ExportParams,
//  FirstChicagoExportResult, PreRevenueExportResult, ExportFactor)
// =============================================================================

const UNSAFE_REPORT_TEXT = "<script>Acme</script>";

describe("ExportRequestSchema", () => {
  it("defaults format to json, matching the backend default", () => {
    expect(ExportRequestSchema.parse({ company_name: "Acme Inc" }).format).toBe("json");
  });

  it("rejects an empty company_name", () => {
    expect(ExportRequestSchema.safeParse({ company_name: "" }).success).toBe(false);
  });

  it("rejects a company_name longer than the backend max of 120", () => {
    expect(ExportRequestSchema.safeParse({ company_name: "A".repeat(121) }).success).toBe(false);
    expect(ExportRequestSchema.safeParse({ company_name: "A".repeat(120) }).success).toBe(true);
  });

  it("rejects a company_name with characters ReportLab would parse as markup", () => {
    expect(ExportRequestSchema.safeParse({ company_name: UNSAFE_REPORT_TEXT }).success).toBe(false);
  });

  it("accepts the punctuation the backend pattern allows", () => {
    const result = ExportRequestSchema.safeParse({
      company_name: "Acme, Sons & Co. (Holdings) - Series-A/B +1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an industry label with unsafe characters or over 60 chars", () => {
    expect(
      ExportRequestSchema.safeParse({ company_name: "Acme", industry: UNSAFE_REPORT_TEXT }).success
    ).toBe(false);
    expect(
      ExportRequestSchema.safeParse({ company_name: "Acme", industry: "A".repeat(61) }).success
    ).toBe(false);
  });
});

describe("FirstChicagoExportRequestSchema", () => {
  const validRequest = {
    company_name: "Acme Inc",
    result: {
      weighted_value: 5_000_000,
      present_value: 3_500_000,
      scenario_values: { Base: 5_000_000 },
      scenario_present_values: { Base: 3_500_000 },
    },
    params: { discount_rate: 0.25 },
  };

  it("accepts a fully typed payload", () => {
    expect(FirstChicagoExportRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("requires the numeric fields the backend declares on result", () => {
    expect(
      FirstChicagoExportRequestSchema.safeParse({ ...validRequest, result: { foo: "bar" } }).success
    ).toBe(false);
  });

  it("enforces 0 < discount_rate < 1 on params", () => {
    for (const discount_rate of [0, 1, 1.5, -0.2]) {
      expect(
        FirstChicagoExportRequestSchema.safeParse({ ...validRequest, params: { discount_rate } })
          .success,
        `discount_rate ${discount_rate} should be rejected`
      ).toBe(false);
    }
    expect(
      FirstChicagoExportRequestSchema.safeParse({
        ...validRequest,
        params: { discount_rate: 0.99 },
      }).success
    ).toBe(true);
  });

  it("allows a null discount_rate, matching the backend default", () => {
    expect(FirstChicagoExportRequestSchema.safeParse({ ...validRequest, params: {} }).success).toBe(
      true
    );
    // The backend field is `float | None`, so an explicit null is as valid as
    // an omitted key and both reach the report as "no discount rate quoted".
    expect(
      FirstChicagoExportRequestSchema.safeParse({
        ...validRequest,
        params: { discount_rate: null },
      }).success
    ).toBe(true);
  });

  it("rejects scenario maps that name different scenarios", () => {
    expect(
      FirstChicagoExportRequestSchema.safeParse({
        ...validRequest,
        result: { ...validRequest.result, scenario_present_values: { Upside: 3_500_000 } },
      }).success,
      "a scenario with no present value should be rejected"
    ).toBe(false);
    expect(
      FirstChicagoExportRequestSchema.safeParse({
        ...validRequest,
        result: {
          ...validRequest.result,
          scenario_present_values: { Base: 3_500_000, Upside: 9_000_000 },
        },
      }).success,
      "a present value with no matching scenario should be rejected"
    ).toBe(false);
    expect(
      FirstChicagoExportRequestSchema.safeParse({
        ...validRequest,
        result: { weighted_value: 5_000_000, present_value: 3_500_000 },
      }).success,
      "both maps omitted default to empty and stay consistent"
    ).toBe(true);
  });

  it("rejects an unsafe scenario label", () => {
    expect(
      FirstChicagoExportRequestSchema.safeParse({
        ...validRequest,
        result: { ...validRequest.result, scenario_values: { [UNSAFE_REPORT_TEXT]: 1 } },
      }).success
    ).toBe(false);
  });

  it("validates the optional monte_carlo_result shape", () => {
    expect(
      FirstChicagoExportRequestSchema.safeParse({
        ...validRequest,
        monte_carlo_result: { mean: 1, num_simulations: -1, percentiles: {} },
      }).success
    ).toBe(false);
    expect(
      FirstChicagoExportRequestSchema.safeParse({
        ...validRequest,
        monte_carlo_result: { mean: 1, num_simulations: 10000, percentiles: { p50: 2 } },
      }).success
    ).toBe(true);
  });
});

describe("PreRevenueExportRequestSchema", () => {
  const validRequest = {
    company_name: "Acme Inc",
    method_name: "Berkus",
    result: { valuation: 2_000_000, factors: [{ name: "Sound Idea", value: 500_000 }] },
    params: { discount_rate: 0.3 },
  };

  it("accepts a fully typed payload", () => {
    expect(PreRevenueExportRequestSchema.safeParse(validRequest).success).toBe(true);
  });

  it("rejects a non-numeric valuation", () => {
    expect(
      PreRevenueExportRequestSchema.safeParse({
        ...validRequest,
        result: { valuation: "a lot" },
      }).success
    ).toBe(false);
  });

  it("rejects an unsafe method_name or factor name", () => {
    expect(
      PreRevenueExportRequestSchema.safeParse({ ...validRequest, method_name: UNSAFE_REPORT_TEXT })
        .success
    ).toBe(false);
    expect(
      PreRevenueExportRequestSchema.safeParse({
        ...validRequest,
        result: { valuation: 1, factors: [{ name: UNSAFE_REPORT_TEXT, value: 1 }] },
      }).success
    ).toBe(false);
  });

  it("caps factors at the backend maximum of 30", () => {
    const factors = Array.from({ length: 31 }, (_, i) => ({ name: `Factor ${i}`, value: 1 }));
    expect(
      PreRevenueExportRequestSchema.safeParse({
        ...validRequest,
        result: { valuation: 1, factors },
      }).success
    ).toBe(false);
  });

  it("enforces 0 < discount_rate < 1 on params", () => {
    expect(
      PreRevenueExportRequestSchema.safeParse({ ...validRequest, params: { discount_rate: 1 } })
        .success
    ).toBe(false);
  });
});
