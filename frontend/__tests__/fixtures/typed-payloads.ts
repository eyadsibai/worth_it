/**
 * Test fixtures for Issue #248 typed request payloads.
 * These match the typed Pydantic models in backend/src/worth_it/models.py
 */

import type {
  TypedBaseParams,
  RSUParams,
  StockOptionsParams,
  SimParamConfigs,
  MonteCarloRequest,
  SensitivityAnalysisRequest,
} from "@/lib/schemas";

// =============================================================================
// RSU Params Fixtures
// =============================================================================

export const rsuParamsBasic: RSUParams = {
  equity_type: "RSU",
  monthly_salary: 8000.0,
  total_equity_grant_pct: 5.0, // 5% as percentage
  vesting_period: 4,
  cliff_period: 1,
  exit_valuation: 10_000_000.0,
  simulate_dilution: false,
  dilution_rounds: null,
};

export const rsuParamsHighValue: RSUParams = {
  equity_type: "RSU",
  monthly_salary: 12000.0,
  total_equity_grant_pct: 2.0,
  vesting_period: 4,
  cliff_period: 1,
  exit_valuation: 50_000_000.0,
  simulate_dilution: false,
  dilution_rounds: null,
};

// =============================================================================
// Stock Options Params Fixtures
// =============================================================================

export const optionsParamsBasic: StockOptionsParams = {
  equity_type: "STOCK_OPTIONS",
  monthly_salary: 8000.0,
  num_options: 10000,
  strike_price: 1.0,
  vesting_period: 4,
  cliff_period: 1,
  exit_price_per_share: 10.0,
  exercise_strategy: "AT_EXIT",
  exercise_year: null,
};

export const optionsParamsHighValue: StockOptionsParams = {
  equity_type: "STOCK_OPTIONS",
  monthly_salary: 12000.0,
  num_options: 50000,
  strike_price: 2.0,
  vesting_period: 4,
  cliff_period: 1,
  exit_price_per_share: 20.0,
  exercise_strategy: "AT_EXIT",
  exercise_year: null,
};

// =============================================================================
// Base Params Fixtures
// =============================================================================

export const baseParamsRSU: TypedBaseParams = {
  exit_year: 5,
  current_job_monthly_salary: 15000.0,
  startup_monthly_salary: 12000.0,
  current_job_salary_growth_rate: 0.03,
  annual_roi: 0.06,
  investment_frequency: "Monthly",
  failure_probability: 0.3,
  startup_params: rsuParamsHighValue,
};

export const baseParamsOptions: TypedBaseParams = {
  exit_year: 5,
  current_job_monthly_salary: 15000.0,
  startup_monthly_salary: 12000.0,
  current_job_salary_growth_rate: 0.03,
  annual_roi: 0.06,
  investment_frequency: "Monthly",
  failure_probability: 0.3,
  startup_params: optionsParamsHighValue,
};

// =============================================================================
// Sim Param Configs Fixtures
// =============================================================================

export const simParamConfigsValuation: SimParamConfigs = {
  exit_valuation: { min: 20_000_000.0, max: 100_000_000.0 },
};

export const simParamConfigsROI: SimParamConfigs = {
  annual_roi: { min: 0.03, max: 0.1 },
};

export const simParamConfigsMultiple: SimParamConfigs = {
  exit_valuation: { min: 20_000_000.0, max: 100_000_000.0 },
  annual_roi: { min: 0.03, max: 0.1 },
  failure_probability: { min: 0.1, max: 0.5 },
};

// =============================================================================
// Full Request Fixtures
// =============================================================================

export const monteCarloRequestRSU: MonteCarloRequest = {
  num_simulations: 100,
  base_params: baseParamsRSU,
  sim_param_configs: simParamConfigsValuation,
};

export const monteCarloRequestOptions: MonteCarloRequest = {
  num_simulations: 100,
  base_params: baseParamsOptions,
  sim_param_configs: simParamConfigsValuation,
};

export const sensitivityRequestRSU: SensitivityAnalysisRequest = {
  base_params: baseParamsRSU,
  sim_param_configs: simParamConfigsMultiple,
};

export const sensitivityRequestOptions: SensitivityAnalysisRequest = {
  base_params: baseParamsOptions,
  sim_param_configs: simParamConfigsMultiple,
};

// =============================================================================
// Minimal fixtures for unit tests (WebSocket behavior tests)
// =============================================================================

export const minimalMonteCarloRequest: MonteCarloRequest = {
  num_simulations: 100,
  base_params: baseParamsRSU,
  sim_param_configs: {},
};
