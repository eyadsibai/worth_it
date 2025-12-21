"use client";

import * as React from "react";
import {
  useCalculateStartupScenario,
  useCreateMonthlyDataGrid,
  useCalculateOpportunityCost,
} from "@/lib/api-client";
import { isValidEquityData } from "@/lib/validation";
import type { ErrorType } from "@/components/ui/error-card";
import type { RSUForm, StockOptionsForm, GlobalSettingsForm, CurrentJobForm } from "@/lib/schemas";

export interface ScenarioCalculationInput {
  globalSettings: GlobalSettingsForm | null;
  currentJob: CurrentJobForm | null;
  equityDetails: RSUForm | StockOptionsForm | null;
}

export interface ScenarioCalculationResult {
  /** Whether all required data is present and valid */
  hasValidData: boolean;
  /** Whether any calculation is in progress */
  isCalculating: boolean;
  /** The final startup scenario result */
  result: ReturnType<typeof useCalculateStartupScenario>["data"] | undefined;
  /** Error from any step of the calculation */
  error: Error | null;
  /** Categorized error type for display */
  errorType: ErrorType;
  /** Retry the calculation from the beginning */
  retry: () => void;
  /** Monthly data grid result (intermediate) */
  monthlyData: ReturnType<typeof useCreateMonthlyDataGrid>["data"] | undefined;
  /** Opportunity cost result (intermediate) */
  opportunityCost: ReturnType<typeof useCalculateOpportunityCost>["data"] | undefined;
}

/**
 * Custom hook that encapsulates the 3-step chained calculation:
 * 1. Monthly data grid
 * 2. Opportunity cost
 * 3. Startup scenario
 *
 * Expects pre-debounced input values from the caller (e.g., EmployeeDashboard);
 * this hook itself does not perform debouncing, which helps avoid waterfall API
 * calls during rapid form changes.
 */
export function useScenarioCalculation(
  input: ScenarioCalculationInput
): ScenarioCalculationResult {
  const { globalSettings, currentJob, equityDetails } = input;

  // Check if we have all required data with valid values
  const hasValidData =
    globalSettings !== null &&
    currentJob !== null &&
    equityDetails !== null &&
    isValidEquityData(equityDetails);

  // Initialize mutations
  const monthlyDataMutation = useCreateMonthlyDataGrid();
  const opportunityCostMutation = useCalculateOpportunityCost();
  const startupScenarioMutation = useCalculateStartupScenario();

  // Helper to build monthly data request (avoids duplication)
  const buildMonthlyDataRequest = React.useCallback(() => {
    if (!globalSettings || !currentJob || !equityDetails) return null;

    return {
      exit_year: globalSettings.exit_year,
      current_job_monthly_salary: currentJob.monthly_salary,
      startup_monthly_salary: equityDetails.monthly_salary,
      current_job_salary_growth_rate: currentJob.annual_salary_growth_rate / 100,
      dilution_rounds:
        equityDetails.equity_type === "RSU" && equityDetails.simulate_dilution
          ? equityDetails.dilution_rounds
              .filter((r) => r.enabled)
              .map((r) => ({
                round_name: r.round_name,
                round_type: r.round_type,
                year: r.year,
                dilution_pct: r.dilution_pct ? r.dilution_pct / 100 : undefined,
                pre_money_valuation: r.pre_money_valuation,
                amount_raised: r.amount_raised,
                salary_change: r.salary_change,
              }))
          : null,
    };
  }, [globalSettings, currentJob, equityDetails]);

  // Step 1: Calculate monthly data grid when form data changes
  React.useEffect(() => {
    if (!hasValidData) return;

    const request = buildMonthlyDataRequest();
    if (request) {
      monthlyDataMutation.mutate(request);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidData, buildMonthlyDataRequest]);

  // Step 2: Calculate opportunity cost when monthly data is ready
  React.useEffect(() => {
    if (!monthlyDataMutation.data || !hasValidData || !currentJob || !equityDetails) return;

    const opportunityCostRequest = {
      monthly_data: monthlyDataMutation.data.data,
      annual_roi: currentJob.assumed_annual_roi / 100,
      investment_frequency: currentJob.investment_frequency,
      options_params:
        equityDetails.equity_type === "STOCK_OPTIONS"
          ? {
              num_options: equityDetails.num_options,
              strike_price: equityDetails.strike_price,
              total_vesting_years: equityDetails.vesting_period,
              cliff_years: equityDetails.cliff_period,
              exercise_strategy: equityDetails.exercise_strategy,
              exercise_year: equityDetails.exercise_year,
              exit_price_per_share: equityDetails.exit_price_per_share,
            }
          : null,
      startup_params: null,
    };

    opportunityCostMutation.mutate(opportunityCostRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyDataMutation.data, hasValidData, currentJob, equityDetails]);

  // Step 3: Calculate startup scenario when opportunity cost is ready
  React.useEffect(() => {
    if (!opportunityCostMutation.data || !hasValidData || !equityDetails) return;

    // Issue #248: Use flat typed format for startup_params
    const startupScenarioRequest = {
      opportunity_cost_data: opportunityCostMutation.data.data,
      startup_params:
        equityDetails.equity_type === "RSU"
          ? {
              equity_type: "RSU" as const,
              monthly_salary: equityDetails.monthly_salary,
              total_equity_grant_pct: equityDetails.total_equity_grant_pct,
              vesting_period: equityDetails.vesting_period,
              cliff_period: equityDetails.cliff_period,
              exit_valuation: equityDetails.exit_valuation,
              simulate_dilution: equityDetails.simulate_dilution,
              dilution_rounds: equityDetails.simulate_dilution
                ? equityDetails.dilution_rounds
                    .filter((r) => r.enabled)
                    .map((r) => ({
                      round_name: r.round_name,
                      round_type: r.round_type,
                      year: r.year,
                      dilution_pct: r.dilution_pct ? r.dilution_pct / 100 : undefined,
                      pre_money_valuation: r.pre_money_valuation,
                      amount_raised: r.amount_raised,
                      salary_change: r.salary_change,
                    }))
                : null,
            }
          : {
              equity_type: "STOCK_OPTIONS" as const,
              monthly_salary: equityDetails.monthly_salary,
              num_options: equityDetails.num_options,
              strike_price: equityDetails.strike_price,
              vesting_period: equityDetails.vesting_period,
              cliff_period: equityDetails.cliff_period,
              exit_price_per_share: equityDetails.exit_price_per_share,
              exercise_strategy: equityDetails.exercise_strategy ?? "AT_EXIT",
              exercise_year: equityDetails.exercise_year ?? null,
            },
    };

    startupScenarioMutation.mutate(startupScenarioRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityCostMutation.data, hasValidData, equityDetails]);

  // Determine loading state
  const isCalculating =
    monthlyDataMutation.isPending ||
    opportunityCostMutation.isPending ||
    startupScenarioMutation.isPending;

  // Get the first error from the chain
  const error =
    monthlyDataMutation.error ||
    opportunityCostMutation.error ||
    startupScenarioMutation.error ||
    null;

  // Determine error type from error message
  const getErrorType = React.useCallback((err: Error | null): ErrorType => {
    if (!err) return "generic";
    const message = err.message.toLowerCase();
    if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
      return "network";
    }
    if (message.includes("invalid") || message.includes("validation") || message.includes("required")) {
      return "validation";
    }
    if (message.includes("calculation") || message.includes("compute") || message.includes("overflow")) {
      return "calculation";
    }
    return "generic";
  }, []);

  // Retry handler - reset all mutations and re-trigger the chain
  // Note: Mutation objects from useCreateMonthlyDataGrid etc. are stable (same reference)
  // so we access them from the closure rather than including them in the dependency array
  const retry = React.useCallback(() => {
    monthlyDataMutation.reset();
    opportunityCostMutation.reset();
    startupScenarioMutation.reset();

    // Re-trigger the initial calculation using the shared helper
    if (hasValidData) {
      const request = buildMonthlyDataRequest();
      if (request) {
        monthlyDataMutation.mutate(request);
      }
    }
    // Only include values that affect the request construction
    // Mutation objects are stable and accessed from closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasValidData, buildMonthlyDataRequest]);

  return {
    hasValidData,
    isCalculating,
    result: startupScenarioMutation.data,
    error,
    errorType: getErrorType(error),
    retry,
    monthlyData: monthlyDataMutation.data,
    opportunityCost: opportunityCostMutation.data,
  };
}
