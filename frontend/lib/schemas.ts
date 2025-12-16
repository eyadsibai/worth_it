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
  stakeholder_payouts: z.array(z.object({
    stakeholder_id: z.string(),
    name: z.string(),
    ownership_pct: z.number(),
    payout: z.number(),
  })),
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
export type ConvertedInstrumentDetail = z.infer<
  typeof ConvertedInstrumentDetailSchema
>;

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
export type CapTableConversionRequest = z.infer<
  typeof CapTableConversionRequestSchema
>;

// Response from conversion endpoint
export const CapTableConversionResponseSchema = z.object({
  updated_cap_table: CapTableSchema,
  converted_instruments: z.array(ConvertedInstrumentDetailSchema),
  summary: ConversionSummarySchema,
});
export type CapTableConversionResponse = z.infer<
  typeof CapTableConversionResponseSchema
>;

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
