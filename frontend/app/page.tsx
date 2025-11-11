"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealthCheck, useCalculateStartupScenario, useCreateMonthlyDataGrid, useCalculateOpportunityCost } from "@/lib/api-client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { GlobalSettingsFormComponent } from "@/components/forms/global-settings-form";
import { CurrentJobFormComponent } from "@/components/forms/current-job-form";
import { StartupOfferFormComponent } from "@/components/forms/startup-offer-form";
import { ScenarioResults } from "@/components/results/scenario-results";
import { MonteCarloFormComponent } from "@/components/forms/monte-carlo-form";
import { MonteCarloVisualizations } from "@/components/charts/monte-carlo-visualizations";
import type { GlobalSettingsForm, CurrentJobForm, RSUForm, StockOptionsForm } from "@/lib/schemas";

export default function Home() {
  const { data, isLoading, isError, error } = useHealthCheck();

  // Form state
  const [globalSettings, setGlobalSettings] = React.useState<GlobalSettingsForm | null>(null);
  const [currentJob, setCurrentJob] = React.useState<CurrentJobForm | null>(null);
  const [equityDetails, setEquityDetails] = React.useState<RSUForm | StockOptionsForm | null>(null);

  // Monte Carlo state
  const [monteCarloResults, setMonteCarloResults] = React.useState<{
    net_outcomes: number[];
    simulated_valuations: number[];
  } | null>(null);

  const handleGlobalSettingsChange = React.useCallback((data: GlobalSettingsForm) => {
    setGlobalSettings(data);
  }, []);

  const handleCurrentJobChange = React.useCallback((data: CurrentJobForm) => {
    setCurrentJob(data);
  }, []);

  const handleRSUChange = React.useCallback((data: RSUForm) => {
    setEquityDetails(data);
  }, []);

  const handleStockOptionsChange = React.useCallback((data: StockOptionsForm) => {
    setEquityDetails(data);
  }, []);

  // Check if we have all required data
  const hasRequiredData = globalSettings && currentJob && equityDetails;

  // Initialize mutations
  const monthlyDataMutation = useCreateMonthlyDataGrid();
  const opportunityCostMutation = useCalculateOpportunityCost();
  const startupScenarioMutation = useCalculateStartupScenario();

  // Trigger calculations when form data changes
  React.useEffect(() => {
    if (!hasRequiredData) return;

    // Step 1: Calculate monthly data grid
    const monthlyDataRequest = {
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

    monthlyDataMutation.mutate(monthlyDataRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSettings, currentJob, equityDetails, hasRequiredData]);

  // Step 2: Calculate opportunity cost when monthly data is ready
  React.useEffect(() => {
    if (!monthlyDataMutation.data || !hasRequiredData) return;

    const opportunityCostRequest = {
      monthly_data: monthlyDataMutation.data.data,
      annual_roi: currentJob.assumed_annual_roi / 100,
      investment_frequency: currentJob.investment_frequency,
      options_params:
        equityDetails.equity_type === "STOCK_OPTIONS"
          ? {
              num_options: equityDetails.num_options,
              strike_price: equityDetails.strike_price,
              vesting_period: equityDetails.vesting_period,
              cliff_period: equityDetails.cliff_period,
              exercise_strategy: equityDetails.exercise_strategy,
              exercise_year: equityDetails.exercise_year,
              exit_price_per_share: equityDetails.exit_price_per_share,
            }
          : null,
      startup_params: null,
    };

    opportunityCostMutation.mutate(opportunityCostRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyDataMutation.data]);

  // Step 3: Calculate startup scenario when opportunity cost is ready
  React.useEffect(() => {
    if (!opportunityCostMutation.data || !hasRequiredData) return;

    const startupScenarioRequest = {
      opportunity_cost_data: opportunityCostMutation.data.data,
      startup_params:
        equityDetails.equity_type === "RSU"
          ? {
              equity_type: "Equity (RSUs)",
              total_equity_grant_pct: equityDetails.total_equity_grant_pct / 100,
              vesting_period: equityDetails.vesting_period,
              cliff_period: equityDetails.cliff_period,
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
                : [],
              exit_valuation: equityDetails.exit_valuation,
            }
          : {
              equity_type: "Stock Options",
              num_options: equityDetails.num_options,
              strike_price: equityDetails.strike_price,
              vesting_period: equityDetails.vesting_period,
              cliff_period: equityDetails.cliff_period,
              exercise_strategy: equityDetails.exercise_strategy,
              exercise_year: equityDetails.exercise_year,
              exit_price_per_share: equityDetails.exit_price_per_share,
            },
    };

    startupScenarioMutation.mutate(startupScenarioRequest);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityCostMutation.data]);

  const isCalculating =
    monthlyDataMutation.isPending ||
    opportunityCostMutation.isPending ||
    startupScenarioMutation.isPending;

  return (
    <AppShell
      sidebar={
        <div className="space-y-4">
          <GlobalSettingsFormComponent onChange={handleGlobalSettingsChange} />
          <CurrentJobFormComponent onChange={handleCurrentJobChange} />
          <StartupOfferFormComponent
            onRSUChange={handleRSUChange}
            onStockOptionsChange={handleStockOptionsChange}
          />

          <Card>
            <CardHeader>
              <CardTitle>Coming Soon</CardTitle>
              <CardDescription>Additional features</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                <li>Detailed dilution rounds configuration</li>
                <li>Monte Carlo simulation settings</li>
                <li>Results dashboard with charts</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      }
    >
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">
            Job Offer Financial Analyzer
          </h1>
          <p className="text-muted-foreground mt-2">
            Analyze startup job offers with comprehensive financial modeling including equity,
            dilution, and Monte Carlo simulations
          </p>
        </div>

        {/* API Status */}
        <Card>
          <CardHeader>
            <CardTitle>API Connection Status</CardTitle>
            <CardDescription>Backend health check</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Checking connection...</span>
              </div>
            )}

            {isError && (
              <div className="flex items-center space-x-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span>Error: {error?.message || "Failed to connect to API"}</span>
              </div>
            )}

            {data && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Connected to API</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>Status: {data.status}</p>
                  <p>Version: {data.version}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Dashboard */}
        {!hasRequiredData && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Fill out all forms in the sidebar to see your analysis results
              </p>
            </CardContent>
          </Card>
        )}

        {hasRequiredData && !startupScenarioMutation.data && isCalculating && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Calculating your scenario...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {startupScenarioMutation.data && (
          <ScenarioResults results={startupScenarioMutation.data} isLoading={isCalculating} />
        )}

        {/* Monte Carlo Simulation */}
        {startupScenarioMutation.data && hasRequiredData && (
          <div className="space-y-6">
            <MonteCarloFormComponent
              baseParams={{
                exit_year: globalSettings.exit_year,
                current_job_monthly_salary: currentJob.monthly_salary,
                startup_monthly_salary: equityDetails.monthly_salary,
                current_job_salary_growth_rate: currentJob.annual_salary_growth_rate / 100,
                equity_params: equityDetails.equity_type === "RSU" ? {
                  equity_type: "Equity (RSUs)",
                  total_equity_grant_pct: equityDetails.total_equity_grant_pct / 100,
                  vesting_period: equityDetails.vesting_period,
                  cliff_period: equityDetails.cliff_period,
                  simulate_dilution: equityDetails.simulate_dilution,
                  dilution_rounds: equityDetails.simulate_dilution
                    ? equityDetails.dilution_rounds.filter((r) => r.enabled).map((r) => ({
                        round_name: r.round_name,
                        round_type: r.round_type,
                        year: r.year,
                        dilution_pct: r.dilution_pct ? r.dilution_pct / 100 : undefined,
                        pre_money_valuation: r.pre_money_valuation,
                        amount_raised: r.amount_raised,
                        salary_change: r.salary_change,
                      }))
                    : [],
                  exit_valuation: equityDetails.exit_valuation,
                } : {
                  equity_type: "Stock Options",
                  num_options: equityDetails.num_options,
                  strike_price: equityDetails.strike_price,
                  vesting_period: equityDetails.vesting_period,
                  cliff_period: equityDetails.cliff_period,
                  exercise_strategy: equityDetails.exercise_strategy,
                  exercise_year: equityDetails.exercise_year,
                  exit_price_per_share: equityDetails.exit_price_per_share,
                },
              }}
              onComplete={setMonteCarloResults}
            />

            {monteCarloResults && (
              <MonteCarloVisualizations
                netOutcomes={monteCarloResults.net_outcomes}
                simulatedValuations={monteCarloResults.simulated_valuations}
              />
            )}
          </div>
        )}

        {startupScenarioMutation.isError && (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="flex flex-col items-center gap-4 text-destructive">
                <XCircle className="h-8 w-8" />
                <p>Error calculating scenario: {startupScenarioMutation.error?.message}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
