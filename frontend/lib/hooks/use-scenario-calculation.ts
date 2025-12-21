"use client";

import * as React from "react";
import {
  useMonthlyDataGridQuery,
  useOpportunityCostQuery,
  useStartupScenarioQuery,
  APIError,
} from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { isValidEquityData } from "@/lib/validation";
import type { ErrorType } from "@/components/ui/error-card";
import type {
  RSUForm,
  StockOptionsForm,
  GlobalSettingsForm,
  CurrentJobForm,
  MonthlyDataGridRequest,
  OpportunityCostRequest,
  StartupScenarioRequest,
} from "@/lib/schemas";

export interface ScenarioCalculationInput {
  globalSettings: GlobalSettingsForm | null;
  currentJob: CurrentJobForm | null;
  equityDetails: RSUForm | StockOptionsForm | null;
}

export interface ScenarioCalculationResult {
  /** Whether all required data is present and valid */
  hasValidData: boolean;
  /** Whether this is the first load (no data yet) - show skeleton */
  isPending: boolean;
  /** Whether we're refetching (have stale data) - show overlay */
  isFetching: boolean;
  /** Legacy: combined loading state (isPending || isFetching) */
  isCalculating: boolean;
  /** The final startup scenario result */
  result: ReturnType<typeof useStartupScenarioQuery>["data"] | undefined;
  /** Error from any step of the calculation */
  error: Error | null;
  /** Categorized error type for display */
  errorType: ErrorType;
  /** Retry the calculation from the beginning */
  retry: () => void;
  /** Monthly data grid result (intermediate) */
  monthlyData: ReturnType<typeof useMonthlyDataGridQuery>["data"] | undefined;
  /** Opportunity cost result (intermediate) */
  opportunityCost: ReturnType<typeof useOpportunityCostQuery>["data"] | undefined;
}

/**
 * Custom hook that encapsulates the 3-step chained calculation using TanStack Query.
 * Uses the stale-while-revalidate pattern to keep previous results visible during updates.
 *
 * Key states:
 * - isPending: First load, no data yet (show skeleton)
 * - isFetching: Refetching with stale data visible (show overlay)
 * - isCalculating: Either isPending or isFetching (legacy compatibility)
 *
 * Flow:
 * 1. Monthly data grid query
 * 2. Opportunity cost query (enabled when step 1 completes)
 * 3. Startup scenario query (enabled when step 2 completes)
 *
 * Each query uses `keepPreviousData` to maintain stale results during refetch.
 */
export function useScenarioCalculation(
  input: ScenarioCalculationInput
): ScenarioCalculationResult {
  const { globalSettings, currentJob, equityDetails } = input;
  const queryClient = useQueryClient();

  // Check if we have all required data with valid values
  const hasValidData =
    globalSettings !== null &&
    currentJob !== null &&
    equityDetails !== null &&
    isValidEquityData(equityDetails);

  // Build Step 1 request: Monthly data grid
  const monthlyDataRequest = React.useMemo<MonthlyDataGridRequest | null>(() => {
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

  // Step 1: Query monthly data grid
  const monthlyDataQuery = useMonthlyDataGridQuery(
    monthlyDataRequest,
    hasValidData
  );

  // Build Step 2 request: Opportunity cost (depends on Step 1 data)
  const opportunityCostRequest = React.useMemo<OpportunityCostRequest | null>(() => {
    if (!monthlyDataQuery.data || !currentJob || !equityDetails) return null;

    return {
      monthly_data: monthlyDataQuery.data.data,
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
  }, [monthlyDataQuery.data, currentJob, equityDetails]);

  // Step 2: Query opportunity cost (enabled when step 1 completes)
  const opportunityCostQuery = useOpportunityCostQuery(
    opportunityCostRequest,
    hasValidData && !!monthlyDataQuery.data
  );

  // Build Step 3 request: Startup scenario (depends on Step 2 data)
  const startupScenarioRequest = React.useMemo<StartupScenarioRequest | null>(() => {
    if (!opportunityCostQuery.data || !equityDetails) return null;

    // Issue #248: Use flat typed format for startup_params
    return {
      opportunity_cost_data: opportunityCostQuery.data.data,
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
  }, [opportunityCostQuery.data, equityDetails]);

  // Step 3: Query startup scenario (enabled when step 2 completes)
  const startupScenarioQuery = useStartupScenarioQuery(
    startupScenarioRequest,
    hasValidData && !!opportunityCostQuery.data
  );

  // Determine loading states
  // isPending: First load, no data yet (any query in chain is pending without data)
  const isPending =
    (monthlyDataQuery.isPending && !monthlyDataQuery.data) ||
    (opportunityCostQuery.isPending && !opportunityCostQuery.data) ||
    (startupScenarioQuery.isPending && !startupScenarioQuery.data);

  // isFetching: Refetching with stale data visible (any query is fetching but has data)
  const isFetching =
    (monthlyDataQuery.isFetching && !!monthlyDataQuery.data) ||
    (opportunityCostQuery.isFetching && !!opportunityCostQuery.data) ||
    (startupScenarioQuery.isFetching && !!startupScenarioQuery.data);

  // Legacy compatibility: combined loading state
  const isCalculating = isPending || isFetching;

  // Get the first error from the chain
  const error =
    monthlyDataQuery.error ||
    opportunityCostQuery.error ||
    startupScenarioQuery.error ||
    null;

  // Determine error type from error code (using APIError) or fallback to message parsing
  const getErrorType = React.useCallback((err: Error | null): ErrorType => {
    if (!err) return "generic";

    // Use code-based detection for APIError instances
    if (err instanceof APIError) {
      switch (err.code) {
        case "VALIDATION_ERROR":
          return "validation";
        case "CALCULATION_ERROR":
          return "calculation";
        case "RATE_LIMIT_ERROR":
          return "generic";
        case "NOT_FOUND_ERROR":
          return "generic";
        case "INTERNAL_ERROR":
          return "generic";
        default: {
          const message = err.message.toLowerCase();
          if (message.includes("network") || message.includes("connection") || message.includes("no response")) {
            return "network";
          }
          return "generic";
        }
      }
    }

    // Legacy fallback for non-APIError errors
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

  // Retry handler - invalidate all queries to force refetch
  const retry = React.useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["monthlyDataGrid"] });
    queryClient.invalidateQueries({ queryKey: ["opportunityCost"] });
    queryClient.invalidateQueries({ queryKey: ["startupScenario"] });
  }, [queryClient]);

  return {
    hasValidData,
    isPending,
    isFetching,
    isCalculating,
    result: startupScenarioQuery.data,
    error,
    errorType: getErrorType(error),
    retry,
    monthlyData: monthlyDataQuery.data,
    opportunityCost: opportunityCostQuery.data,
  };
}
