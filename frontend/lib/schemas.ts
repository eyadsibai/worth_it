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

export const ExerciseStrategyEnum = z.enum(["AT_EXIT", "AFTER_VESTING"]);
export type ExerciseStrategy = z.infer<typeof ExerciseStrategyEnum>;

// Variable parameters that can be varied in Monte Carlo/Sensitivity analysis
// These are the allowed keys for sim_param_configs dictionary
export const VariableParamEnum = z.enum([
  "exit_valuation",
  "exit_year",
  "failure_probability",
  "current_job_monthly_salary",
  "startup_monthly_salary",
  "current_job_salary_growth_rate",
  "annual_roi",
  "total_equity_grant_pct",
  "num_options",
  "strike_price",
  "exit_price_per_share",
]);
export type VariableParam = z.infer<typeof VariableParamEnum>;

export const RoundTypeEnum = z.enum(["SAFE_NOTE", "PRICED_ROUND"]);
export type RoundType = z.infer<typeof RoundTypeEnum>;

export const RoundStatusEnum = z.enum(["completed", "upcoming"]);
export type RoundStatus = z.infer<typeof RoundStatusEnum>;

export const CompanyStageEnum = z.enum([
  "pre-seed",
  "seed",
  "series-a",
  "series-b",
  "series-c",
  "series-d",
  "pre-ipo",
]);
export type CompanyStage = z.infer<typeof CompanyStageEnum>;

// Error codes matching backend ErrorCode enum
export const ErrorCodeEnum = z.enum([
  "VALIDATION_ERROR",
  "CALCULATION_ERROR",
  "RATE_LIMIT_ERROR",
  "NOT_FOUND_ERROR",
  "INTERNAL_ERROR",
]);
export type ErrorCode = z.infer<typeof ErrorCodeEnum>;

// ============================================================================
// Error Response Schemas
// ============================================================================

/**
 * Field-level validation error detail.
 */
export const FieldErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
});
export type FieldError = z.infer<typeof FieldErrorSchema>;

/**
 * Structured error information.
 */
export const ErrorDetailSchema = z.object({
  code: ErrorCodeEnum,
  message: z.string(),
  details: z.array(FieldErrorSchema).optional().nullable(),
});
export type ErrorDetail = z.infer<typeof ErrorDetailSchema>;

/**
 * Standard API error response wrapper.
 */
export const APIErrorResponseSchema = z.object({
  error: ErrorDetailSchema,
});
export type APIErrorResponse = z.infer<typeof APIErrorResponseSchema>;

// ============================================================================
// Typed API Payload Schemas (Issue #248)
// These match the Pydantic models in backend/src/worth_it/models.py
// ============================================================================

/**
 * Range for a variable parameter in Monte Carlo/Sensitivity simulations.
 * The simulation will sample values between min and max.
 */
export const SimParamRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .refine((data) => data.min <= data.max, {
    message: "min must be less than or equal to max",
  });
export type SimParamRange = z.infer<typeof SimParamRangeSchema>;

/**
 * RSU (Restricted Stock Unit) parameters for typed API payloads.
 * Uses flat structure with all RSU-specific fields at top level.
 */
export const RSUParamsSchema = z.object({
  equity_type: z.literal("RSU"),
  monthly_salary: z.number().min(0),
  total_equity_grant_pct: z.number().min(0).max(100), // Percentage (0-100)
  vesting_period: z.number().int().min(1).max(10),
  cliff_period: z.number().int().min(0).max(5),
  exit_valuation: z.number().min(0),
  simulate_dilution: z.boolean().default(false),
  dilution_rounds: z.array(z.any()).nullable().optional(),
  discount_rate: z.number().min(0).max(1).nullable().optional(), // For NPV calculation
});
export type RSUParams = z.infer<typeof RSUParamsSchema>;

/**
 * Stock Options parameters for typed API payloads.
 * Uses flat structure with all options-specific fields at top level.
 */
export const StockOptionsParamsSchema = z.object({
  equity_type: z.literal("STOCK_OPTIONS"),
  monthly_salary: z.number().min(0),
  num_options: z.number().int().min(0),
  strike_price: z.number().min(0),
  vesting_period: z.number().int().min(1).max(10),
  cliff_period: z.number().int().min(0).max(5),
  exit_price_per_share: z.number().min(0),
  exercise_strategy: ExerciseStrategyEnum.default("AT_EXIT"),
  exercise_year: z.number().int().min(1).max(20).nullable().optional(),
  discount_rate: z.number().min(0).max(1).nullable().optional(), // For NPV calculation
});
export type StockOptionsParams = z.infer<typeof StockOptionsParamsSchema>;

/**
 * Discriminated union of RSU or Stock Options params.
 * Uses equity_type as the discriminator field.
 */
export const StartupParamsSchema = z.discriminatedUnion("equity_type", [
  RSUParamsSchema,
  StockOptionsParamsSchema,
]);
export type StartupParams = z.infer<typeof StartupParamsSchema>;

/**
 * Typed base parameters for Monte Carlo and Sensitivity Analysis.
 * Contains all the common parameters plus nested startup_params.
 */
export const TypedBaseParamsSchema = z.object({
  exit_year: z.number().int().min(1).max(20),
  current_job_monthly_salary: z.number().min(0),
  startup_monthly_salary: z.number().min(0),
  current_job_salary_growth_rate: z.number().min(0).max(1),
  annual_roi: z.number().min(0).max(1),
  investment_frequency: InvestmentFrequencyEnum,
  failure_probability: z.number().min(0).max(1),
  startup_params: StartupParamsSchema,
});
export type TypedBaseParams = z.infer<typeof TypedBaseParamsSchema>;

/**
 * Type-safe simulation parameter configs.
 * Maps variable parameter names to their min/max ranges.
 * All fields are optional, allowing any subset of the available parameters.
 */
export const SimParamConfigsSchema = z.object({
  exit_valuation: SimParamRangeSchema.optional(),
  exit_year: SimParamRangeSchema.optional(),
  failure_probability: SimParamRangeSchema.optional(),
  current_job_monthly_salary: SimParamRangeSchema.optional(),
  startup_monthly_salary: SimParamRangeSchema.optional(),
  current_job_salary_growth_rate: SimParamRangeSchema.optional(),
  annual_roi: SimParamRangeSchema.optional(),
  total_equity_grant_pct: SimParamRangeSchema.optional(),
  num_options: SimParamRangeSchema.optional(),
  strike_price: SimParamRangeSchema.optional(),
  exit_price_per_share: SimParamRangeSchema.optional(),
});
export type SimParamConfigs = z.infer<typeof SimParamConfigsSchema>;

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

/**
 * Typed request for calculating startup scenario.
 * Uses discriminated union for startup_params (RSU or Stock Options).
 */
export const StartupScenarioRequestSchema = z.object({
  opportunity_cost_data: z.array(z.record(z.string(), z.any())),
  startup_params: StartupParamsSchema,
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

/**
 * Typed request for Monte Carlo simulation.
 * Uses TypedBaseParams for base parameters and SimParamConfigs for variable configs.
 */
export const MonteCarloRequestSchema = z.object({
  num_simulations: z.number().int().min(1).max(100000),
  base_params: TypedBaseParamsSchema,
  sim_param_configs: SimParamConfigsSchema,
});
export type MonteCarloRequest = z.infer<typeof MonteCarloRequestSchema>;

/**
 * Typed request for sensitivity analysis.
 * Uses TypedBaseParams for base parameters and SimParamConfigs for variable configs.
 */
export const SensitivityAnalysisRequestSchema = z.object({
  base_params: TypedBaseParamsSchema,
  sim_param_configs: SimParamConfigsSchema,
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
  final_payout_value_npv: z.number().optional().nullable(),
  final_opportunity_cost: z.number(),
  final_opportunity_cost_npv: z.number().optional().nullable(),
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
  error: ErrorDetailSchema,
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
  year: z.number().min(-10).max(20), // Negative years = completed rounds (years ago)
  dilution_pct: z.number().min(0).max(100),
  pre_money_valuation: z.number().min(0),
  amount_raised: z.number().min(0),
  salary_change: z.number(),
  enabled: z.boolean(),
  status: RoundStatusEnum.default("upcoming"), // NEW: completed = past, upcoming = future
});
export type DilutionRoundForm = z.infer<typeof DilutionRoundFormSchema>;

export const RSUFormSchema = z.object({
  equity_type: z.literal("RSU"),
  monthly_salary: z.number().min(0),
  total_equity_grant_pct: z.number().min(0).max(100),
  vesting_period: z.number().int().min(1).max(10).default(4),
  cliff_period: z.number().int().min(0).max(5).default(1),
  simulate_dilution: z.boolean().default(false),
  company_stage: CompanyStageEnum.optional(), // NEW: helps auto-configure rounds
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

// ============================================================================
// Cap Table Schemas (Founder Mode)
// ============================================================================

export const StakeholderTypeEnum = z.enum(["founder", "employee", "investor", "advisor"]);
export type StakeholderType = z.infer<typeof StakeholderTypeEnum>;

export const ShareClassEnum = z.enum(["common", "preferred"]);
export type ShareClass = z.infer<typeof ShareClassEnum>;

export const VestingScheduleSchema = z.object({
  total_shares: z.number().min(0),
  vesting_months: z.number().int().min(0).max(120).default(48),
  cliff_months: z.number().int().min(0).max(24).default(12),
  start_date: z.string().optional(), // ISO date string
  vested_shares: z.number().min(0).default(0),
});
export type VestingSchedule = z.infer<typeof VestingScheduleSchema>;

export const StakeholderSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  type: StakeholderTypeEnum,
  shares: z.number().min(0).default(0),
  ownership_pct: z.number().min(0).max(100).default(0),
  share_class: ShareClassEnum.default("common"),
  vesting: VestingScheduleSchema.optional(),
});
export type Stakeholder = z.infer<typeof StakeholderSchema>;

export const CapTableSchema = z.object({
  stakeholders: z.array(StakeholderSchema).default([]),
  total_shares: z.number().min(0).default(10000000), // 10M shares default
  option_pool_pct: z.number().min(0).max(100).default(10), // 10% default
});
export type CapTable = z.infer<typeof CapTableSchema>;

// Form schema for adding/editing a stakeholder
export const StakeholderFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: StakeholderTypeEnum.default("founder"),
  ownership_pct: z.number().min(0).max(100),
  share_class: ShareClassEnum.default("common"),
  has_vesting: z.boolean().default(false),
  vesting_months: z.number().int().min(0).max(120).default(48),
  cliff_months: z.number().int().min(0).max(24).default(12),
});
export type StakeholderFormData = z.infer<typeof StakeholderFormSchema>;

// Exit scenario for founder mode
export const ExitScenarioSchema = z.object({
  exit_valuation: z.number().min(0),
  stakeholder_payouts: z.array(
    z.object({
      stakeholder_id: z.string(),
      name: z.string(),
      ownership_pct: z.number(),
      payout: z.number(),
    })
  ),
  total_payout: z.number(),
});
export type ExitScenario = z.infer<typeof ExitScenarioSchema>;

// ============================================================================
// Funding Instrument Schemas
// ============================================================================

export const FundingInstrumentTypeEnum = z.enum(["SAFE", "CONVERTIBLE_NOTE", "PRICED_ROUND"]);
export type FundingInstrumentType = z.infer<typeof FundingInstrumentTypeEnum>;

export const InstrumentStatusEnum = z.enum(["outstanding", "converted", "cancelled"]);
export type InstrumentStatus = z.infer<typeof InstrumentStatusEnum>;

// SAFE (Simple Agreement for Future Equity)
export const SAFESchema = z.object({
  id: z.string(),
  type: z.literal("SAFE"),
  investor_name: z.string().min(1, "Investor name is required"),
  investment_amount: z.number().min(0),
  valuation_cap: z.number().min(0).optional(),
  discount_pct: z.number().min(0).max(100).optional(), // e.g., 20 for 20%
  pro_rata_rights: z.boolean().default(false),
  mfn_clause: z.boolean().default(false), // Most Favored Nation
  date: z.string().optional(), // ISO date string
  status: InstrumentStatusEnum.default("outstanding"),
  // Conversion details (filled when converted)
  converted_shares: z.number().optional(),
  conversion_price: z.number().optional(),
});
export type SAFE = z.infer<typeof SAFESchema>;

// Interest calculation type for convertible notes
export const InterestTypeEnum = z.enum(["simple", "compound"]);
export type InterestType = z.infer<typeof InterestTypeEnum>;

// Convertible Note
export const ConvertibleNoteSchema = z.object({
  id: z.string(),
  type: z.literal("CONVERTIBLE_NOTE"),
  investor_name: z.string().min(1, "Investor name is required"),
  principal_amount: z.number().min(0),
  interest_rate: z.number().min(0).max(100), // Annual rate as percentage
  interest_type: InterestTypeEnum.default("simple"), // Simple or compound interest
  valuation_cap: z.number().min(0).optional(),
  discount_pct: z.number().min(0).max(100).optional(),
  maturity_months: z.number().int().min(1).max(60).default(24),
  date: z.string().optional(),
  status: InstrumentStatusEnum.default("outstanding"),
  // Conversion details
  accrued_interest: z.number().optional(),
  converted_shares: z.number().optional(),
  conversion_price: z.number().optional(),
});
export type ConvertibleNote = z.infer<typeof ConvertibleNoteSchema>;

// Priced Round (Series Seed, A, B, etc.)
export const PricedRoundSchema = z.object({
  id: z.string(),
  type: z.literal("PRICED_ROUND"),
  round_name: z.string().min(1, "Round name is required"), // e.g., "Seed", "Series A"
  lead_investor: z.string().optional(),
  pre_money_valuation: z.number().min(0),
  amount_raised: z.number().min(0),
  price_per_share: z.number().min(0),
  date: z.string().optional(),
  // Liquidation preference
  liquidation_multiplier: z.number().min(0).max(10).default(1), // 1x, 2x, etc.
  participating: z.boolean().default(false),
  participation_cap: z.number().optional(), // Only if participating
  // New shares issued
  new_shares_issued: z.number().min(0).default(0),
  // Post-round totals
  post_money_valuation: z.number().optional(),
});
export type PricedRound = z.infer<typeof PricedRoundSchema>;

// Union of all funding instruments
export const FundingInstrumentSchema = z.discriminatedUnion("type", [
  SAFESchema,
  ConvertibleNoteSchema,
  PricedRoundSchema,
]);
export type FundingInstrument = z.infer<typeof FundingInstrumentSchema>;

// Form schemas for adding instruments
export const SAFEFormSchema = z.object({
  investor_name: z.string().min(1, "Investor name is required"),
  investment_amount: z.number().min(0),
  valuation_cap: z.number().min(0).optional(),
  discount_pct: z.number().min(0).max(100).optional(),
  pro_rata_rights: z.boolean().default(false),
  mfn_clause: z.boolean().default(false),
});
export type SAFEFormData = z.infer<typeof SAFEFormSchema>;

export const ConvertibleNoteFormSchema = z.object({
  investor_name: z.string().min(1, "Investor name is required"),
  principal_amount: z.number().min(0),
  interest_rate: z.number().min(0).max(100).default(5),
  interest_type: InterestTypeEnum.default("simple"),
  valuation_cap: z.number().min(0).optional(),
  discount_pct: z.number().min(0).max(100).optional(),
  maturity_months: z.number().int().min(1).max(60).default(24),
});
export type ConvertibleNoteFormData = z.infer<typeof ConvertibleNoteFormSchema>;

export const PricedRoundFormSchema = z.object({
  round_name: z.string().min(1, "Round name is required"),
  lead_investor: z.string().optional(),
  pre_money_valuation: z.number().min(0),
  amount_raised: z.number().min(0),
  liquidation_multiplier: z.number().min(0).max(10).default(1),
  participating: z.boolean().default(false),
});
export type PricedRoundFormData = z.infer<typeof PricedRoundFormSchema>;

// Extended cap table with funding instruments
export const CapTableWithInstrumentsSchema = CapTableSchema.extend({
  instruments: z.array(FundingInstrumentSchema).default([]),
  rounds: z.array(PricedRoundSchema).default([]),
});

// --- Cap Table Conversion API Types ---

// Price source indicates whether cap or discount price was used for conversion
export const PriceSourceEnum = z.enum(["cap", "discount"]);
export type PriceSource = z.infer<typeof PriceSourceEnum>;

// Details of a single converted instrument
export const ConvertedInstrumentDetailSchema = z.object({
  instrument_id: z.string(),
  instrument_type: z.enum(["SAFE", "CONVERTIBLE_NOTE"]),
  investor_name: z.string(),
  investment_amount: z.number(),
  conversion_price: z.number(),
  price_source: PriceSourceEnum,
  shares_issued: z.number(),
  ownership_pct: z.number(),
  accrued_interest: z.number().nullable(), // Only for notes
});
export type ConvertedInstrumentDetail = z.infer<typeof ConvertedInstrumentDetailSchema>;

// Summary of conversion results
export const ConversionSummarySchema = z.object({
  instruments_converted: z.number(),
  total_shares_issued: z.number(),
  total_dilution_pct: z.number(),
});
export type ConversionSummary = z.infer<typeof ConversionSummarySchema>;

// Result of a single SAFE or Convertible Note conversion
export const ConversionResultSchema = z.object({
  investor_name: z.string(),
  investment_amount: z.number(),
  conversion_price: z.number(),
  shares_issued: z.number(),
  ownership_pct: z.number(),
  conversion_method: z.enum(["cap", "discount"]),
  effective_valuation: z.number(),
});
export type ConversionResult = z.infer<typeof ConversionResultSchema>;

// Request to convert instruments
export const CapTableConversionRequestSchema = z.object({
  cap_table: CapTableSchema,
  instruments: z.array(z.union([SAFESchema, ConvertibleNoteSchema])),
  priced_round: PricedRoundSchema,
});
export type CapTableConversionRequest = z.infer<typeof CapTableConversionRequestSchema>;

// Response from conversion endpoint
export const CapTableConversionResponseSchema = z.object({
  updated_cap_table: CapTableSchema,
  converted_instruments: z.array(ConvertedInstrumentDetailSchema),
  summary: ConversionSummarySchema,
});
export type CapTableConversionResponse = z.infer<typeof CapTableConversionResponseSchema>;

// ============================================================================
// Waterfall Analysis Schemas
// ============================================================================

// A single tier in the liquidation preference stack
export const PreferenceTierSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"), // e.g., "Series B", "Series A"
  seniority: z.number().int().min(1), // 1 = most senior (paid first)
  investment_amount: z.number().min(0), // Total invested at this tier
  liquidation_multiplier: z.number().min(1).default(1), // 1x, 2x, etc.
  participating: z.boolean().default(false),
  participation_cap: z.number().min(1).optional(), // e.g., 3.0 for 3x cap
  stakeholder_ids: z.array(z.string()).default([]), // Links to Stakeholder records
});
export type PreferenceTier = z.infer<typeof PreferenceTierSchema>;

// Payout for a single stakeholder in a waterfall distribution
export const StakeholderPayoutSchema = z.object({
  stakeholder_id: z.string(),
  name: z.string(),
  payout_amount: z.number().min(0),
  payout_pct: z.number().min(0).max(100), // Percentage of total exit
  investment_amount: z.number().optional(), // For investors
  roi: z.number().optional(), // Return on investment (MOIC) for investors
});
export type StakeholderPayout = z.infer<typeof StakeholderPayoutSchema>;

// A single step in the waterfall breakdown
export const WaterfallStepSchema = z.object({
  step_number: z.number().int().min(1),
  description: z.string(),
  amount: z.number().min(0),
  recipients: z.array(z.string()), // Stakeholder names
  remaining_proceeds: z.number().min(0),
});
export type WaterfallStep = z.infer<typeof WaterfallStepSchema>;

// Distribution result for a single exit valuation
export const WaterfallDistributionSchema = z.object({
  exit_valuation: z.number().min(0),
  waterfall_steps: z.array(WaterfallStepSchema),
  stakeholder_payouts: z.array(StakeholderPayoutSchema),
  common_pct: z.number().min(0).max(100),
  preferred_pct: z.number().min(0).max(100),
});
export type WaterfallDistribution = z.infer<typeof WaterfallDistributionSchema>;

// Request to calculate waterfall distribution
export const WaterfallRequestSchema = z.object({
  cap_table: CapTableSchema,
  preference_tiers: z.array(PreferenceTierSchema),
  exit_valuations: z.array(z.number().min(0)).min(1),
});
export type WaterfallRequest = z.infer<typeof WaterfallRequestSchema>;

// Full waterfall analysis response
export const WaterfallResponseSchema = z.object({
  distributions_by_valuation: z.array(WaterfallDistributionSchema),
  breakeven_points: z.record(z.string(), z.number()), // {stakeholder_name: breakeven_valuation}
});
export type WaterfallResponse = z.infer<typeof WaterfallResponseSchema>;

// Form schema for adding/editing a preference tier
export const PreferenceTierFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  seniority: z.number().int().min(1),
  investment_amount: z.number().min(0),
  liquidation_multiplier: z.number().min(1).default(1),
  participating: z.boolean().default(false),
  participation_cap: z.number().min(1).optional(),
});
export type PreferenceTierFormData = z.infer<typeof PreferenceTierFormSchema>;

// ============================================================================
// Founder Scenario Schemas (for scenario comparison)
// ============================================================================

export const FounderScenarioSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Scenario name is required"),
  description: z.string().optional(),
  capTable: CapTableSchema,
  instruments: z.array(FundingInstrumentSchema).default([]),
  preferenceTiers: z.array(PreferenceTierSchema).default([]),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string(), // ISO date string
});
export type FounderScenario = z.infer<typeof FounderScenarioSchema>;

// ============================================================================
// Dilution Preview API Schemas
// ============================================================================

export const DilutionStakeholderInputSchema = z.object({
  name: z.string().min(1),
  type: StakeholderTypeEnum,
  ownership_pct: z.number().min(0).max(100),
});
export type DilutionStakeholderInput = z.infer<typeof DilutionStakeholderInputSchema>;

export const DilutionPreviewRequestSchema = z.object({
  stakeholders: z.array(DilutionStakeholderInputSchema).default([]),
  option_pool_pct: z.number().min(0).max(100).default(0),
  pre_money_valuation: z.number().gt(0),
  amount_raised: z.number().gt(0),
  investor_name: z.string().min(1).default("New Investor"),
});
export type DilutionPreviewRequest = z.infer<typeof DilutionPreviewRequestSchema>;

export const DilutionPartyTypeEnum = z.enum([
  "founder",
  "employee",
  "investor",
  "advisor",
  "option_pool",
  "new_investor",
]);
export type DilutionPartyType = z.infer<typeof DilutionPartyTypeEnum>;

export const DilutionResultItemSchema = z.object({
  name: z.string(),
  type: DilutionPartyTypeEnum,
  before_pct: z.number(),
  after_pct: z.number(),
  dilution_pct: z.number(),
  is_new: z.boolean(),
});
export type DilutionResultItem = z.infer<typeof DilutionResultItemSchema>;

export const DilutionPreviewResponseSchema = z.object({
  dilution_results: z.array(DilutionResultItemSchema),
  post_money_valuation: z.number(),
  dilution_factor: z.number(),
});
export type DilutionPreviewResponse = z.infer<typeof DilutionPreviewResponseSchema>;

// ============================================================================
// Scenario Comparison API Schemas
// ============================================================================

export const ScenarioResultsInfoSchema = z.object({
  net_outcome: z.number(),
  final_payout_value: z.number(),
  final_opportunity_cost: z.number(),
  breakeven: z.string().nullable().optional(),
});
export type ScenarioResultsInfo = z.infer<typeof ScenarioResultsInfoSchema>;

export const ScenarioEquityInfoSchema = z.object({
  monthly_salary: z.number(),
});
export type ScenarioEquityInfo = z.infer<typeof ScenarioEquityInfoSchema>;

export const ScenarioInputSchema = z.object({
  name: z.string().min(1),
  results: ScenarioResultsInfoSchema,
  equity: ScenarioEquityInfoSchema,
});
export type ScenarioInput = z.infer<typeof ScenarioInputSchema>;

export const ScenarioComparisonRequestSchema = z.object({
  scenarios: z.array(ScenarioInputSchema).min(1),
});
export type ScenarioComparisonRequest = z.infer<typeof ScenarioComparisonRequestSchema>;

export const WinnerResultSchema = z.object({
  winner_name: z.string(),
  winner_index: z.number().int(),
  net_outcome_advantage: z.number(),
  is_tie: z.boolean(),
});
export type WinnerResult = z.infer<typeof WinnerResultSchema>;

export const MetricDiffSchema = z.object({
  metric: z.string(),
  label: z.string(),
  values: z.array(z.number()),
  scenario_names: z.array(z.string()),
  absolute_diff: z.number(),
  percentage_diff: z.number(),
  better_scenario: z.string(),
  higher_is_better: z.boolean(),
});
export type MetricDiff = z.infer<typeof MetricDiffSchema>;

export const ComparisonInsightTypeEnum = z.enum(["winner", "tradeoff", "observation"]);
export const ComparisonInsightIconEnum = z.enum(["trophy", "scale", "info"]);

export const ComparisonInsightSchema = z.object({
  type: ComparisonInsightTypeEnum,
  title: z.string(),
  description: z.string(),
  scenario_name: z.string().nullable().optional(),
  icon: ComparisonInsightIconEnum.nullable().optional(),
});
export type ComparisonInsight = z.infer<typeof ComparisonInsightSchema>;

export const ScenarioComparisonResponseSchema = z.object({
  winner: WinnerResultSchema,
  metric_diffs: z.array(MetricDiffSchema),
  insights: z.array(ComparisonInsightSchema),
});
export type ScenarioComparisonResponse = z.infer<typeof ScenarioComparisonResponseSchema>;

// ============================================================================
// Frontend-compatible types (camelCase wrappers for UI components)
// ============================================================================

/**
 * Frontend-friendly dilution data interface using camelCase.
 * Used by UI components that display dilution preview results.
 */
export interface DilutionData {
  name: string;
  type: DilutionPartyType;
  beforePct: number;
  afterPct: number;
  dilutionPct: number;
  isNew: boolean;
}

/**
 * Transform API dilution result to frontend format.
 */
export function transformDilutionResult(item: DilutionResultItem): DilutionData {
  return {
    name: item.name,
    type: item.type,
    beforePct: item.before_pct,
    afterPct: item.after_pct,
    dilutionPct: item.dilution_pct,
    isNew: item.is_new,
  };
}

/**
 * Frontend-friendly comparison insight interface using camelCase.
 * Used by UI components that display comparison results.
 */
export interface FrontendComparisonInsight {
  type: "winner" | "tradeoff" | "observation";
  title: string;
  description: string;
  scenarioName?: string;
  icon?: "trophy" | "scale" | "info";
}

/**
 * Transform API comparison insight to frontend format.
 */
export function transformComparisonInsight(item: ComparisonInsight): FrontendComparisonInsight {
  return {
    type: item.type,
    title: item.title,
    description: item.description,
    scenarioName: item.scenario_name ?? undefined,
    icon: item.icon ?? undefined,
  };
}

/**
 * Frontend-friendly winner result interface using camelCase.
 */
export interface FrontendWinnerResult {
  winnerName: string;
  winnerIndex: number;
  netOutcomeAdvantage: number;
  isTie: boolean;
}

/**
 * Transform API winner result to frontend format.
 */
export function transformWinnerResult(item: WinnerResult): FrontendWinnerResult {
  return {
    winnerName: item.winner_name,
    winnerIndex: item.winner_index,
    netOutcomeAdvantage: item.net_outcome_advantage,
    isTie: item.is_tie,
  };
}

/**
 * Frontend-friendly metric diff interface using camelCase.
 */
export interface FrontendMetricDiff {
  metric: string;
  label: string;
  values: number[];
  scenarioNames: string[];
  absoluteDiff: number;
  percentageDiff: number;
  betterScenario: string;
  higherIsBetter: boolean;
}

/**
 * Transform API metric diff to frontend format.
 */
export function transformMetricDiff(item: MetricDiff): FrontendMetricDiff {
  return {
    metric: item.metric,
    label: item.label,
    values: item.values,
    scenarioNames: item.scenario_names,
    absoluteDiff: item.absolute_diff,
    percentageDiff: item.percentage_diff,
    betterScenario: item.better_scenario,
    higherIsBetter: item.higher_is_better,
  };
}

// ============================================================================
// Valuation Calculator Schemas (#229)
// ============================================================================

// Valuation method type enum
export const ValuationMethodEnum = z.enum(["revenue_multiple", "dcf", "vc_method"]);
export type ValuationMethod = z.infer<typeof ValuationMethodEnum>;

// Revenue Multiple method request
export const RevenueMultipleRequestSchema = z.object({
  annual_revenue: z.number().min(0),
  revenue_multiple: z.number().gt(0).max(100),
  growth_rate: z.number().min(-1).max(10).optional(),
  industry_benchmark_multiple: z.number().gt(0).optional(),
});
export type RevenueMultipleRequest = z.infer<typeof RevenueMultipleRequestSchema>;

// DCF method request
export const DCFRequestSchema = z.object({
  projected_cash_flows: z.array(z.number()).min(1),
  discount_rate: z.number().gt(0).max(1),
  terminal_growth_rate: z.number().min(0).max(1).optional(),
});
export type DCFRequest = z.infer<typeof DCFRequestSchema>;

// VC Method request
export const VCMethodRequestSchema = z.object({
  projected_exit_value: z.number().gt(0),
  exit_year: z.number().int().min(1).max(15),
  target_return_multiple: z.number().gt(1).optional(),
  target_irr: z.number().gt(0).max(2).optional(),
  expected_dilution: z.number().min(0).max(1).default(0),
  investment_amount: z.number().gt(0).optional(),
  exit_probability: z.number().gt(0).max(1).default(1),
});
export type VCMethodRequest = z.infer<typeof VCMethodRequestSchema>;

// Valuation result from a single method
export const ValuationResultSchema = z.object({
  method: ValuationMethodEnum,
  valuation: z.number(),
  confidence: z.number().min(0).max(1),
  inputs: z.record(z.string(), z.unknown()),
  notes: z.string(),
});
export type ValuationResult = z.infer<typeof ValuationResultSchema>;

// Combined valuation comparison request
export const ValuationCompareRequestSchema = z.object({
  revenue_multiple: RevenueMultipleRequestSchema.optional(),
  dcf: DCFRequestSchema.optional(),
  vc_method: VCMethodRequestSchema.optional(),
});
export type ValuationCompareRequest = z.infer<typeof ValuationCompareRequestSchema>;

// Valuation comparison response
export const ValuationCompareResponseSchema = z.object({
  results: z.array(ValuationResultSchema),
  min_valuation: z.number(),
  max_valuation: z.number(),
  average_valuation: z.number(),
  weighted_average: z.number(),
  range_pct: z.number(),
  outliers: z.array(z.string()),
  insights: z.array(z.string()),
});
export type ValuationCompareResponse = z.infer<typeof ValuationCompareResponseSchema>;

// ============================================================================
// Valuation Calculator Frontend Types (camelCase)
// ============================================================================

/**
 * Frontend-friendly valuation result interface using camelCase.
 */
export interface FrontendValuationResult {
  method: ValuationMethod;
  valuation: number;
  confidence: number;
  inputs: Record<string, unknown>;
  notes: string;
}

/**
 * Transform API valuation result to frontend format.
 */
export function transformValuationResult(item: ValuationResult): FrontendValuationResult {
  return {
    method: item.method,
    valuation: item.valuation,
    confidence: item.confidence,
    inputs: item.inputs,
    notes: item.notes,
  };
}

/**
 * Frontend-friendly valuation comparison interface using camelCase.
 */
export interface FrontendValuationComparison {
  results: FrontendValuationResult[];
  minValuation: number;
  maxValuation: number;
  averageValuation: number;
  weightedAverage: number;
  rangePct: number;
  outliers: string[];
  insights: string[];
}

/**
 * Transform API valuation comparison to frontend format.
 */
export function transformValuationComparison(
  response: ValuationCompareResponse
): FrontendValuationComparison {
  return {
    results: response.results.map(transformValuationResult),
    minValuation: response.min_valuation,
    maxValuation: response.max_valuation,
    averageValuation: response.average_valuation,
    weightedAverage: response.weighted_average,
    rangePct: response.range_pct,
    outliers: response.outliers,
    insights: response.insights,
  };
}

// ============================================================================
// Valuation Calculator Form Schemas
// ============================================================================

/**
 * Form schema for Revenue Multiple method input.
 */
export const RevenueMultipleFormSchema = z.object({
  annualRevenue: z.number().min(0, "Revenue must be positive"),
  revenueMultiple: z.number().gt(0, "Multiple must be positive").max(100, "Multiple too high"),
  growthRate: z.number().min(-100).max(1000).optional(),
  industryBenchmarkMultiple: z.number().gt(0).optional(),
});
export type RevenueMultipleFormData = z.infer<typeof RevenueMultipleFormSchema>;

/**
 * Form schema for DCF method input.
 * Uses objects with value property for react-hook-form useFieldArray compatibility.
 */
export const DCFFormSchema = z.object({
  projectedCashFlows: z
    .array(z.object({ value: z.number() }))
    .min(1, "At least one cash flow required"),
  discountRate: z.number().gt(0, "Discount rate must be positive").max(100, "Rate too high"),
  terminalGrowthRate: z.number().min(0).max(100).optional(),
});
export type DCFFormData = z.infer<typeof DCFFormSchema>;

/**
 * Form schema for VC Method input.
 * Note: Fields with required defaults must not use .default() to get required types for react-hook-form
 */
export const VCMethodFormSchema = z.object({
  projectedExitValue: z.number().gt(0, "Exit value must be positive"),
  exitYear: z.number().int().min(1).max(15),
  returnType: z.enum(["multiple", "irr"]),
  targetReturnMultiple: z.number().gt(1).optional(),
  targetIRR: z.number().gt(0).max(200).optional(), // Percentage form (50 = 50%)
  expectedDilution: z.number().min(0).max(100), // Percentage form
  investmentAmount: z.number().gt(0).optional(),
  exitProbability: z.number().gt(0).max(100), // Percentage form
});
export type VCMethodFormData = z.infer<typeof VCMethodFormSchema>;

/**
 * Combined form schema for valuation calculator.
 */
export const ValuationCalculatorFormSchema = z.object({
  enableRevenueMultiple: z.boolean().default(true),
  enableDcf: z.boolean().default(false),
  enableVcMethod: z.boolean().default(false),
  revenueMultiple: RevenueMultipleFormSchema.optional(),
  dcf: DCFFormSchema.optional(),
  vcMethod: VCMethodFormSchema.optional(),
});
export type ValuationCalculatorFormData = z.infer<typeof ValuationCalculatorFormSchema>;

// ============================================================================
// First Chicago Method Schemas (Phase 1)
// ============================================================================

/**
 * A single scenario for First Chicago Method valuation.
 * Each scenario represents a possible outcome (e.g., Best/Base/Worst case).
 */
export const FirstChicagoScenarioSchema = z.object({
  name: z.string().min(1, "Scenario name is required").max(50),
  probability: z.number().min(0, "Probability must be >= 0").max(1, "Probability must be <= 1"),
  exit_value: z.number().gt(0, "Exit value must be positive"),
  years_to_exit: z.number().int().min(1, "At least 1 year").max(20, "Max 20 years"),
});
export type FirstChicagoScenario = z.infer<typeof FirstChicagoScenarioSchema>;

/**
 * Request schema for First Chicago Method API endpoint.
 */
export const FirstChicagoRequestSchema = z.object({
  scenarios: z.array(FirstChicagoScenarioSchema).min(1, "At least one scenario required").max(10),
  discount_rate: z
    .number()
    .gt(0, "Discount rate must be positive")
    .lt(1, "Discount rate must be < 100%"),
  current_investment: z.number().gt(0).optional(),
});
export type FirstChicagoRequest = z.infer<typeof FirstChicagoRequestSchema>;

/**
 * Response schema for First Chicago Method API endpoint.
 */
export const FirstChicagoResponseSchema = z.object({
  weighted_value: z.number(),
  present_value: z.number(),
  scenario_values: z.record(z.string(), z.number()),
  scenario_present_values: z.record(z.string(), z.number()),
  method: z.literal("first_chicago"),
});
export type FirstChicagoResponse = z.infer<typeof FirstChicagoResponseSchema>;

// ============================================================================
// First Chicago Method Frontend Types (camelCase)
// ============================================================================

/**
 * Frontend-friendly First Chicago scenario interface using camelCase.
 */
export interface FrontendFirstChicagoScenario {
  name: string;
  probability: number;
  exitValue: number;
  yearsToExit: number;
}

/**
 * Transform API First Chicago scenario to frontend format.
 */
export function transformFirstChicagoScenario(
  item: FirstChicagoScenario
): FrontendFirstChicagoScenario {
  return {
    name: item.name,
    probability: item.probability,
    exitValue: item.exit_value,
    yearsToExit: item.years_to_exit,
  };
}

// ============================================================================
// Pre-Revenue Valuation Schemas (Phase 2)
// ============================================================================

// Berkus Method - 5 criteria scored $0-$500K each, max $2.5M total
export const BerkusRequestSchema = z.object({
  sound_idea: z.number().min(0).max(500_000),
  prototype: z.number().min(0).max(500_000),
  quality_team: z.number().min(0).max(500_000),
  strategic_relationships: z.number().min(0).max(500_000),
  product_rollout: z.number().min(0).max(500_000),
  max_per_criterion: z.number().min(0).default(500_000),
});
export type BerkusRequest = z.infer<typeof BerkusRequestSchema>;

export const BerkusResponseSchema = z.object({
  valuation: z.number(),
  breakdown: z.record(z.string(), z.number()),
  method: z.literal("berkus"),
});
export type BerkusResponse = z.infer<typeof BerkusResponseSchema>;

// Scorecard Method - weighted factors compared to baseline
export const ScorecardFactorRequestSchema = z.object({
  name: z.string().min(1).max(50),
  weight: z.number().min(0).max(1),
  score: z.number().min(0).max(2), // 0 = below average, 1 = average, 2 = exceptional
});
export type ScorecardFactorRequest = z.infer<typeof ScorecardFactorRequestSchema>;

export const ScorecardRequestSchema = z.object({
  base_valuation: z.number().gt(0),
  factors: z.array(ScorecardFactorRequestSchema).min(1),
});
export type ScorecardRequest = z.infer<typeof ScorecardRequestSchema>;

export const ScorecardResponseSchema = z.object({
  valuation: z.number(),
  adjustment_factor: z.number(),
  factor_contributions: z.record(z.string(), z.number()),
  method: z.literal("scorecard"),
});
export type ScorecardResponse = z.infer<typeof ScorecardResponseSchema>;

// Risk Factor Summation Method - ±$500K adjustments per risk factor
export const RiskFactorRequestSchema = z.object({
  name: z.string().min(1).max(50),
  adjustment: z.number().min(-500_000).max(500_000),
});
export type RiskFactorRequest = z.infer<typeof RiskFactorRequestSchema>;

export const RiskFactorSummationRequestSchema = z.object({
  base_valuation: z.number().gt(0),
  factors: z.array(RiskFactorRequestSchema).min(1),
});
export type RiskFactorSummationRequest = z.infer<typeof RiskFactorSummationRequestSchema>;

export const RiskFactorSummationResponseSchema = z.object({
  valuation: z.number(),
  total_adjustment: z.number(),
  factor_adjustments: z.record(z.string(), z.number()),
  method: z.literal("risk_factor_summation"),
});
export type RiskFactorSummationResponse = z.infer<typeof RiskFactorSummationResponseSchema>;

// ============================================================================
// Pre-Revenue Valuation Frontend Types (camelCase)
// ============================================================================

/**
 * Frontend-friendly Berkus result interface.
 */
export interface FrontendBerkusResult {
  valuation: number;
  breakdown: Record<string, number>;
  method: "berkus";
}

/**
 * Transform API Berkus result to frontend format.
 */
export function transformBerkusResult(response: BerkusResponse): FrontendBerkusResult {
  return {
    valuation: response.valuation,
    breakdown: response.breakdown,
    method: response.method,
  };
}

/**
 * Frontend-friendly First Chicago result interface using camelCase.
 */
export interface FrontendFirstChicagoResult {
  weightedValue: number;
  presentValue: number;
  scenarioValues: Record<string, number>;
  scenarioPresentValues: Record<string, number>;
  method: "first_chicago";
}

/**
 * Transform API First Chicago response to frontend format.
 */
export function transformFirstChicagoResponse(
  response: FirstChicagoResponse
): FrontendFirstChicagoResult {
  return {
    weightedValue: response.weighted_value,
    presentValue: response.present_value,
    scenarioValues: response.scenario_values,
    scenarioPresentValues: response.scenario_present_values,
    method: response.method,
  };
}

/**
 * Frontend-friendly Scorecard result interface.
 */
export interface FrontendScorecardResult {
  valuation: number;
  adjustmentFactor: number;
  factorContributions: Record<string, number>;
  method: "scorecard";
}

/**
 * Transform API Scorecard result to frontend format.
 */
export function transformScorecardResult(response: ScorecardResponse): FrontendScorecardResult {
  return {
    valuation: response.valuation,
    adjustmentFactor: response.adjustment_factor,
    factorContributions: response.factor_contributions,
    method: response.method,
  };
}

/**
 * Frontend-friendly Risk Factor Summation result interface.
 */
export interface FrontendRiskFactorSummationResult {
  valuation: number;
  totalAdjustment: number;
  factorAdjustments: Record<string, number>;
  method: "risk_factor_summation";
}

/**
 * Transform API Risk Factor Summation result to frontend format.
 */
export function transformRiskFactorSummationResult(
  response: RiskFactorSummationResponse
): FrontendRiskFactorSummationResult {
  return {
    valuation: response.valuation,
    totalAdjustment: response.total_adjustment,
    factorAdjustments: response.factor_adjustments,
    method: response.method,
  };
}

// ============================================================================
// First Chicago Method Form Schemas
// ============================================================================

/**
 * Form schema for a single First Chicago scenario input.
 * Uses camelCase field names for React Hook Form compatibility.
 */
export const FirstChicagoScenarioFormSchema = z.object({
  name: z.string().min(1, "Scenario name is required").max(50),
  probability: z.number().min(0).max(100), // Percentage form (25 = 25%)
  exitValue: z.number().gt(0, "Exit value must be positive"),
  yearsToExit: z.number().int().min(1).max(20),
});
export type FirstChicagoScenarioFormData = z.infer<typeof FirstChicagoScenarioFormSchema>;

/**
 * Form schema for First Chicago Method calculator.
 */
export const FirstChicagoFormSchema = z.object({
  scenarios: z
    .array(FirstChicagoScenarioFormSchema)
    .min(1, "At least one scenario required")
    .max(10, "Maximum 10 scenarios"),
  discountRate: z.number().gt(0, "Discount rate must be positive").max(100),
  currentInvestment: z.number().gt(0).optional(),
});
export type FirstChicagoFormData = z.infer<typeof FirstChicagoFormSchema>;

// ============================================================================
// Pre-Revenue Valuation Form Schemas
// ============================================================================

/**
 * Berkus Method form schema - 5 criteria with dollar slider values.
 */
export const BerkusFormSchema = z.object({
  soundIdea: z.number().min(0).max(500_000),
  prototype: z.number().min(0).max(500_000),
  qualityTeam: z.number().min(0).max(500_000),
  strategicRelationships: z.number().min(0).max(500_000),
  productRollout: z.number().min(0).max(500_000),
  maxPerCriterion: z.number().min(0).default(500_000),
});
export type BerkusFormData = z.infer<typeof BerkusFormSchema>;

/**
 * Scorecard factor form schema - individual factor entry.
 */
export const ScorecardFactorFormSchema = z.object({
  name: z.string().min(1, "Factor name is required").max(50),
  weight: z.number().min(0, "Weight must be positive").max(1, "Weight must be ≤ 1"),
  score: z.number().min(0, "Score must be positive").max(2, "Score must be ≤ 2"),
});
export type ScorecardFactorFormData = z.infer<typeof ScorecardFactorFormSchema>;

/**
 * Scorecard Method form schema.
 */
export const ScorecardFormSchema = z.object({
  baseValuation: z.number().gt(0, "Base valuation must be positive"),
  factors: z.array(ScorecardFactorFormSchema).min(1, "At least one factor is required"),
});
export type ScorecardFormData = z.infer<typeof ScorecardFormSchema>;

/**
 * Risk factor form schema - individual factor entry.
 */
export const RiskFactorFormSchema = z.object({
  name: z.string().min(1, "Factor name is required").max(50),
  adjustment: z
    .number()
    .min(-500_000, "Adjustment must be ≥ -$500K")
    .max(500_000, "Adjustment must be ≤ $500K"),
});
export type RiskFactorFormData = z.infer<typeof RiskFactorFormSchema>;

/**
 * Risk Factor Summation Method form schema.
 */
export const RiskFactorSummationFormSchema = z.object({
  baseValuation: z.number().gt(0, "Base valuation must be positive"),
  factors: z.array(RiskFactorFormSchema).min(1, "At least one factor is required"),
});
export type RiskFactorSummationFormData = z.infer<typeof RiskFactorSummationFormSchema>;
