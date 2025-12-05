/**
 * Zod schemas matching the Pydantic models from the backend API.
 * These provide type-safe validation for API requests and responses.
 */

import { z } from "zod";

// ============================================================================
// Enums
// ============================================================================

export const EquityTypeEnum = z.enum(["RSU", "STOCK_OPTIONS"]);
export type EquityType = z.infer<typeof EquityTypeEnum>;

export const InvestmentFrequencyEnum = z.enum(["Monthly", "Annually"]);
export type InvestmentFrequency = z.infer<typeof InvestmentFrequencyEnum>;

export const RoundTypeEnum = z.enum(["SAFE_NOTE", "PRICED_ROUND"]);
export type RoundType = z.infer<typeof RoundTypeEnum>;

// ============================================================================
// Request Schemas
// ============================================================================

export const MonthlyDataGridRequestSchema = z.object({
  exit_year: z.number().int().min(1).max(20),
  current_job_monthly_salary: z.number().min(0),
  startup_monthly_salary: z.number().min(0),
  current_job_salary_growth_rate: z.number().min(0).max(1),
  dilution_rounds: z.array(z.record(z.string(), z.any())).optional().nullable(),
});
export type MonthlyDataGridRequest = z.infer<typeof MonthlyDataGridRequestSchema>;

export const OpportunityCostRequestSchema = z.object({
  monthly_data: z.array(z.record(z.string(), z.any())),
  annual_roi: z.number().min(0).max(1),
  investment_frequency: InvestmentFrequencyEnum,
  options_params: z.record(z.string(), z.any()).optional().nullable(),
  startup_params: z.record(z.string(), z.any()).optional().nullable(),
});
export type OpportunityCostRequest = z.infer<typeof OpportunityCostRequestSchema>;

export const StartupScenarioRequestSchema = z.object({
  opportunity_cost_data: z.array(z.record(z.string(), z.any())),
  startup_params: z.record(z.string(), z.any()),
});
export type StartupScenarioRequest = z.infer<typeof StartupScenarioRequestSchema>;

export const IRRRequestSchema = z.object({
  monthly_surpluses: z.array(z.number()),
  final_payout_value: z.number(),
});
export type IRRRequest = z.infer<typeof IRRRequestSchema>;

export const NPVRequestSchema = z.object({
  monthly_surpluses: z.array(z.number()),
  annual_roi: z.number().min(0).max(1),
  final_payout_value: z.number(),
});
export type NPVRequest = z.infer<typeof NPVRequestSchema>;

export const MonteCarloRequestSchema = z.object({
  num_simulations: z.number().int().min(1).max(10000),
  base_params: z.record(z.string(), z.any()),
  sim_param_configs: z.record(z.string(), z.any()),
});
export type MonteCarloRequest = z.infer<typeof MonteCarloRequestSchema>;

export const SensitivityAnalysisRequestSchema = z.object({
  base_params: z.record(z.string(), z.any()),
  sim_param_configs: z.record(z.string(), z.any()),
});
export type SensitivityAnalysisRequest = z.infer<typeof SensitivityAnalysisRequestSchema>;

export const DilutionFromValuationRequestSchema = z.object({
  pre_money_valuation: z.number().min(0),
  amount_raised: z.number().min(0),
});
export type DilutionFromValuationRequest = z.infer<typeof DilutionFromValuationRequestSchema>;

// ============================================================================
// Response Schemas
// ============================================================================

export const MonthlyDataGridResponseSchema = z.object({
  data: z.array(z.record(z.string(), z.any())),
});
export type MonthlyDataGridResponse = z.infer<typeof MonthlyDataGridResponseSchema>;

export const OpportunityCostResponseSchema = z.object({
  data: z.array(z.record(z.string(), z.any())),
});
export type OpportunityCostResponse = z.infer<typeof OpportunityCostResponseSchema>;

export const StartupScenarioResponseSchema = z.object({
  results_df: z.array(z.record(z.string(), z.any())),
  final_payout_value: z.number(),
  final_opportunity_cost: z.number(),
  payout_label: z.string(),
  breakeven_label: z.string(),
  total_dilution: z.number().optional().nullable(),
  diluted_equity_pct: z.number().optional().nullable(),
});
export type StartupScenarioResponse = z.infer<typeof StartupScenarioResponseSchema>;

export const IRRResponseSchema = z.object({
  irr: z.number().nullable(),
});
export type IRRResponse = z.infer<typeof IRRResponseSchema>;

export const NPVResponseSchema = z.object({
  npv: z.number().nullable(),
});
export type NPVResponse = z.infer<typeof NPVResponseSchema>;

export const MonteCarloResponseSchema = z.object({
  net_outcomes: z.array(z.number()),
  simulated_valuations: z.array(z.number()),
});
export type MonteCarloResponse = z.infer<typeof MonteCarloResponseSchema>;

export const SensitivityAnalysisResponseSchema = z.object({
  data: z.array(z.record(z.string(), z.any())).optional().nullable(),
});
export type SensitivityAnalysisResponse = z.infer<typeof SensitivityAnalysisResponseSchema>;

export const DilutionFromValuationResponseSchema = z.object({
  dilution: z.number(),
});
export type DilutionFromValuationResponse = z.infer<typeof DilutionFromValuationResponseSchema>;

export const HealthCheckResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
});
export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

// ============================================================================
// WebSocket Message Schemas
// ============================================================================

export const WSProgressMessageSchema = z.object({
  type: z.literal("progress"),
  current: z.number(),
  total: z.number(),
  percentage: z.number(),
});
export type WSProgressMessage = z.infer<typeof WSProgressMessageSchema>;

export const WSCompleteMessageSchema = z.object({
  type: z.literal("complete"),
  net_outcomes: z.array(z.number()),
  simulated_valuations: z.array(z.number()),
});
export type WSCompleteMessage = z.infer<typeof WSCompleteMessageSchema>;

export const WSErrorMessageSchema = z.object({
  type: z.literal("error"),
  message: z.string(),
});
export type WSErrorMessage = z.infer<typeof WSErrorMessageSchema>;

export const WSMessageSchema = z.discriminatedUnion("type", [
  WSProgressMessageSchema,
  WSCompleteMessageSchema,
  WSErrorMessageSchema,
]);
export type WSMessage = z.infer<typeof WSMessageSchema>;

// ============================================================================
// Form Schemas (for React Hook Form)
// ============================================================================

export const GlobalSettingsFormSchema = z.object({
  exit_year: z.number().int().min(1).max(20),
});
export type GlobalSettingsForm = z.infer<typeof GlobalSettingsFormSchema>;

export const CurrentJobFormSchema = z.object({
  monthly_salary: z.number().min(0),
  annual_salary_growth_rate: z.number().min(0).max(10),
  assumed_annual_roi: z.number().min(0).max(20),
  investment_frequency: InvestmentFrequencyEnum,
});
export type CurrentJobForm = z.infer<typeof CurrentJobFormSchema>;

export const DilutionRoundFormSchema = z.object({
  round_name: z.string(),
  round_type: RoundTypeEnum,
  year: z.number().min(0).max(20),
  dilution_pct: z.number().min(0).max(100),
  pre_money_valuation: z.number().min(0),
  amount_raised: z.number().min(0),
  salary_change: z.number(),
  enabled: z.boolean(),
});
export type DilutionRoundForm = z.infer<typeof DilutionRoundFormSchema>;

export const RSUFormSchema = z.object({
  equity_type: z.literal("RSU"),
  monthly_salary: z.number().min(0),
  total_equity_grant_pct: z.number().min(0).max(100),
  vesting_period: z.number().int().min(1).max(10).default(4),
  cliff_period: z.number().int().min(0).max(5).default(1),
  simulate_dilution: z.boolean().default(false),
  dilution_rounds: z.array(DilutionRoundFormSchema),
  exit_valuation: z.number().min(0),
});
export type RSUForm = z.infer<typeof RSUFormSchema>;

export const StockOptionsFormSchema = z.object({
  equity_type: z.literal("STOCK_OPTIONS"),
  monthly_salary: z.number().min(0),
  num_options: z.number().int().min(0),
  strike_price: z.number().min(0),
  vesting_period: z.number().int().min(1).max(10).default(4),
  cliff_period: z.number().int().min(0).max(5).default(1),
  exercise_strategy: z.enum(["AT_EXIT", "AFTER_VESTING"]).default("AT_EXIT"),
  exercise_year: z.number().int().min(1).max(20).optional(),
  exit_price_per_share: z.number().min(0),
});
export type StockOptionsForm = z.infer<typeof StockOptionsFormSchema>;

export const StartupOfferFormSchema = z.object({
  monthly_salary: z.number().min(0),
  equity_details: z.union([RSUFormSchema, StockOptionsFormSchema]),
});
export type StartupOfferForm = z.infer<typeof StartupOfferFormSchema>;
