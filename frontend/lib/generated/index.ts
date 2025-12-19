/**
 * Generated API Schemas - Re-export with type inference
 *
 * This file provides convenient access to generated Zod schemas
 * and their inferred TypeScript types.
 *
 * Usage:
 *   import { schemas, type MonthlyDataGridRequest } from '@/lib/generated';
 *
 * AUTO-GENERATED - Regenerate with: ./scripts/generate-types.sh
 */

import { z } from "zod";

// Re-export all schemas
export { schemas } from "./api-schemas";

// Re-export the API client utilities
export { createApiClient, generatedApi } from "./api-schemas";

// Import schemas for type inference
import { schemas } from "./api-schemas";

// ============================================================================
// Inferred TypeScript Types from Generated Zod Schemas
// ============================================================================

// Health Check
export type HealthCheckResponse = z.infer<typeof schemas.HealthCheckResponse>;

// Monthly Data Grid
export type MonthlyDataGridRequest = z.infer<typeof schemas.MonthlyDataGridRequest>;
export type MonthlyDataGridResponse = z.infer<typeof schemas.MonthlyDataGridResponse>;
export type DilutionRound = z.infer<typeof schemas.DilutionRound>;

// Opportunity Cost
export type OpportunityCostRequest = z.infer<typeof schemas.OpportunityCostRequest>;
export type OpportunityCostResponse = z.infer<typeof schemas.OpportunityCostResponse>;

// Startup Scenario
export type StartupScenarioRequest = z.infer<typeof schemas.StartupScenarioRequest>;
export type StartupScenarioResponse = z.infer<typeof schemas.StartupScenarioResponse>;

// IRR
export type IRRRequest = z.infer<typeof schemas.IRRRequest>;
export type IRRResponse = z.infer<typeof schemas.IRRResponse>;

// NPV
export type NPVRequest = z.infer<typeof schemas.NPVRequest>;
export type NPVResponse = z.infer<typeof schemas.NPVResponse>;

// Monte Carlo
export type MonteCarloRequest = z.infer<typeof schemas.MonteCarloRequest>;
export type MonteCarloResponse = z.infer<typeof schemas.MonteCarloResponse>;

// Sensitivity Analysis
export type SensitivityAnalysisRequest = z.infer<typeof schemas.SensitivityAnalysisRequest>;
export type SensitivityAnalysisResponse = z.infer<typeof schemas.SensitivityAnalysisResponse>;

// Dilution
export type DilutionFromValuationRequest = z.infer<typeof schemas.DilutionFromValuationRequest>;
export type DilutionFromValuationResponse = z.infer<typeof schemas.DilutionFromValuationResponse>;
export type DilutionPreviewRequest = z.infer<typeof schemas.DilutionPreviewRequest>;
export type DilutionPreviewResponse = z.infer<typeof schemas.DilutionPreviewResponse>;
export type DilutionStakeholderInput = z.infer<typeof schemas.DilutionStakeholderInput>;
export type DilutionResultItem = z.infer<typeof schemas.DilutionResultItem>;

// Cap Table
export type CapTableInput = z.infer<typeof schemas.CapTable_Input>;
export type CapTableOutput = z.infer<typeof schemas.CapTable_Output>;
export type Stakeholder = z.infer<typeof schemas.Stakeholder>;
export type VestingSchedule = z.infer<typeof schemas.VestingSchedule>;
export type SAFE = z.infer<typeof schemas.SAFE>;
export type ConvertibleNote = z.infer<typeof schemas.ConvertibleNote>;
export type PricedRound = z.infer<typeof schemas.PricedRound>;
export type CapTableConversionRequest = z.infer<typeof schemas.CapTableConversionRequest>;
export type CapTableConversionResponse = z.infer<typeof schemas.CapTableConversionResponse>;
export type ConvertedInstrumentDetail = z.infer<typeof schemas.ConvertedInstrumentDetail>;
export type ConversionSummary = z.infer<typeof schemas.ConversionSummary>;

// Waterfall
export type WaterfallRequest = z.infer<typeof schemas.WaterfallRequest>;
export type WaterfallResponse = z.infer<typeof schemas.WaterfallResponse>;
export type PreferenceTier = z.infer<typeof schemas.PreferenceTier>;
export type WaterfallStep = z.infer<typeof schemas.WaterfallStep>;
export type WaterfallDistribution = z.infer<typeof schemas.WaterfallDistribution>;
export type StakeholderPayout = z.infer<typeof schemas.StakeholderPayout>;

// Scenario Comparison
export type ScenarioInput = z.infer<typeof schemas.ScenarioInput>;
export type ScenarioComparisonRequest = z.infer<typeof schemas.ScenarioComparisonRequest>;
export type ScenarioComparisonResponse = z.infer<typeof schemas.ScenarioComparisonResponse>;
export type ScenarioResultsInfo = z.infer<typeof schemas.ScenarioResultsInfo>;
export type ScenarioEquityInfo = z.infer<typeof schemas.ScenarioEquityInfo>;
export type WinnerResult = z.infer<typeof schemas.WinnerResult>;
export type MetricDiff = z.infer<typeof schemas.MetricDiff>;
export type ComparisonInsight = z.infer<typeof schemas.ComparisonInsight>;

// Validation Errors
export type ValidationError = z.infer<typeof schemas.ValidationError>;
export type HTTPValidationError = z.infer<typeof schemas.HTTPValidationError>;
