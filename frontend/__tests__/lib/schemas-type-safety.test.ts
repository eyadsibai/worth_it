/**
 * TDD tests for Bug #9: Replace z.any() with specific types in schemas.
 *
 * Verifies that schemas use proper types instead of z.any(),
 * which provides type safety and prevents invalid data from passing validation.
 */

import { describe, it, expect } from "vitest";
import {
  RSUParamsSchema,
  MonthlyDataGridRequestSchema,
  OpportunityCostRequestSchema,
  StartupScenarioRequestSchema,
  MonthlyDataGridResponseSchema,
  OpportunityCostResponseSchema,
  StartupScenarioResponseSchema,
  SensitivityAnalysisResponseSchema,
} from "@/lib/schemas";

describe("Bug #9: z.any() replaced with specific types", () => {
  describe("RSUParamsSchema.dilution_rounds", () => {
    it("should accept properly typed dilution round objects", () => {
      const result = RSUParamsSchema.safeParse({
        equity_type: "RSU",
        monthly_salary: 12000,
        total_equity_grant_pct: 0.5,
        vesting_period: 4,
        cliff_period: 1,
        exit_valuation: 100_000_000,
        simulate_dilution: true,
        dilution_rounds: [
          {
            round_name: "Series A",
            round_type: "PRICED_ROUND",
            year: 2,
            dilution_pct: 0.2,
            pre_money_valuation: 10_000_000,
            amount_raised: 2_000_000,
            salary_change: 1000,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject dilution_rounds with non-object elements", () => {
      const result = RSUParamsSchema.safeParse({
        equity_type: "RSU",
        monthly_salary: 12000,
        total_equity_grant_pct: 0.5,
        vesting_period: 4,
        cliff_period: 1,
        exit_valuation: 100_000_000,
        simulate_dilution: true,
        dilution_rounds: ["not an object", 42, true],
      });
      // With z.any(), this would pass. With proper types, it should fail.
      expect(result.success).toBe(false);
    });
  });

  describe("MonthlyDataGridRequestSchema.dilution_rounds", () => {
    it("should accept properly typed dilution round records", () => {
      const result = MonthlyDataGridRequestSchema.safeParse({
        exit_year: 5,
        current_job_monthly_salary: 15000,
        startup_monthly_salary: 12000,
        current_job_salary_growth_rate: 0.05,
        dilution_rounds: [
          {
            round_name: "Seed",
            year: 1,
            dilution_pct: 0.15,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("should reject dilution_rounds with non-object elements", () => {
      const result = MonthlyDataGridRequestSchema.safeParse({
        exit_year: 5,
        current_job_monthly_salary: 15000,
        startup_monthly_salary: 12000,
        current_job_salary_growth_rate: 0.05,
        dilution_rounds: [42, "invalid"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("DataFrame-like schemas use z.unknown() not z.any()", () => {
    it("OpportunityCostRequest.monthly_data should accept valid row data", () => {
      const result = OpportunityCostRequestSchema.safeParse({
        monthly_data: [
          { month: 1, salary: 15000, surplus: 3000 },
          { month: 2, salary: 15000, surplus: 3000 },
        ],
        annual_roi: 0.08,
        investment_frequency: "Monthly",
      });
      expect(result.success).toBe(true);
    });

    it("StartupScenarioRequest.opportunity_cost_data should accept valid row data", () => {
      const result = StartupScenarioRequestSchema.safeParse({
        opportunity_cost_data: [{ month: 1, cost: 1000 }],
        startup_params: {
          equity_type: "RSU",
          monthly_salary: 12000,
          total_equity_grant_pct: 0.5,
          vesting_period: 4,
          cliff_period: 1,
          exit_valuation: 100_000_000,
          simulate_dilution: false,
        },
      });
      expect(result.success).toBe(true);
    });

    it("MonthlyDataGridResponse.data should accept valid row data", () => {
      const result = MonthlyDataGridResponseSchema.safeParse({
        data: [{ month: 1, value: 15000 }],
      });
      expect(result.success).toBe(true);
    });

    it("OpportunityCostResponse.data should accept valid row data", () => {
      const result = OpportunityCostResponseSchema.safeParse({
        data: [{ month: 1, cost: 1000, cumulative: 1000 }],
      });
      expect(result.success).toBe(true);
    });

    it("StartupScenarioResponse.results_df should accept valid row data", () => {
      const result = StartupScenarioResponseSchema.safeParse({
        results_df: [{ month: 1, payout: 5000 }],
        final_payout_value: 100000,
        final_opportunity_cost: 50000,
        payout_label: "RSU Payout",
        breakeven_label: "Month 36",
      });
      expect(result.success).toBe(true);
    });

    it("SensitivityAnalysisResponse.data should accept valid row data", () => {
      const result = SensitivityAnalysisResponseSchema.safeParse({
        data: [{ Variable: "exit_valuation", Low: 50000, High: 200000, Impact: 150000 }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("OpportunityCostRequest typed params", () => {
    it("should accept valid options_params object", () => {
      const result = OpportunityCostRequestSchema.safeParse({
        monthly_data: [{ month: 1, salary: 15000 }],
        annual_roi: 0.08,
        investment_frequency: "Monthly",
        options_params: {
          num_options: 10000,
          strike_price: 1.5,
          total_vesting_years: 4,
          cliff_years: 1,
          exercise_strategy: "AT_EXIT",
          exit_price_per_share: 15.0,
        },
        startup_params: null,
      });
      expect(result.success).toBe(true);
    });

    it("should reject non-object options_params", () => {
      const result = OpportunityCostRequestSchema.safeParse({
        monthly_data: [{ month: 1, salary: 15000 }],
        annual_roi: 0.08,
        investment_frequency: "Monthly",
        options_params: "not an object",
        startup_params: null,
      });
      expect(result.success).toBe(false);
    });

    it("should reject non-object startup_params", () => {
      const result = OpportunityCostRequestSchema.safeParse({
        monthly_data: [{ month: 1, salary: 15000 }],
        annual_roi: 0.08,
        investment_frequency: "Monthly",
        options_params: null,
        startup_params: "not an object",
      });
      expect(result.success).toBe(false);
    });
  });
});
