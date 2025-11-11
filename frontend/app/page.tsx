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

  // useState setters are stable, but using functional updates for best practices
  const handleGlobalSettingsChange = React.useCallback((data: GlobalSettingsForm) => {
    setGlobalSettings(() => data);
  }, []);

  const handleCurrentJobChange = React.useCallback((data: CurrentJobForm) => {
    setCurrentJob(() => data);
  }, []);

  const handleRSUChange = React.useCallback((data: RSUForm) => {
    setEquityDetails(() => data);
  }, []);

  const handleStockOptionsChange = React.useCallback((data: StockOptionsForm) => {
    setEquityDetails(() => data);
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
    // monthlyDataMutation.mutate is stable (TanStack Query) and doesn't need to be in deps
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
    // opportunityCostMutation.mutate is stable (TanStack Query) and doesn't need to be in deps
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
              total_vesting_years: equityDetails.vesting_period,
              cliff_years: equityDetails.cliff_period,
              rsu_params: {
                equity_pct: equityDetails.total_equity_grant_pct / 100,
                target_exit_valuation: equityDetails.exit_valuation,
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
              },
            }
          : {
              equity_type: "Stock Options",
              num_options: equityDetails.num_options,
              strike_price: equityDetails.strike_price,
              total_vesting_years: equityDetails.vesting_period,
              cliff_years: equityDetails.cliff_period,
              exercise_strategy: equityDetails.exercise_strategy,
              exercise_year: equityDetails.exercise_year,
              exit_price_per_share: equityDetails.exit_price_per_share,
            },
    };

    startupScenarioMutation.mutate(startupScenarioRequest);
    // startupScenarioMutation.mutate is stable (TanStack Query) and doesn't need to be in deps
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
        </div>
      }
    >
      <div className="container py-8 space-y-8">
        {/* Hero Section */}
        <div className="space-y-4 animate-fade-in">
          <h1 className="text-5xl font-bold tracking-tight gradient-text">
            Job Offer Financial Analyzer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Analyze startup job offers with comprehensive financial modeling including equity,
            dilution, and Monte Carlo simulations
          </p>
        </div>

        {/* API Status */}
        <Card className="glass-card animate-slide-up border-l-4 border-l-accent/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent animate-pulse"></div>
              API Connection Status
            </CardTitle>
            <CardDescription>Backend health check</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center space-x-3 py-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Checking connection...</span>
              </div>
            )}

            {isError && (
              <div className="flex items-center space-x-3 py-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">Error: {error?.message || "Failed to connect to API"}</span>
              </div>
            )}

            {data && (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 py-1">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                  <span className="font-semibold text-accent-foreground">Connected to API</span>
                </div>
                <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium text-muted-foreground">Status:</p>
                    <p className="font-semibold capitalize">{data.status}</p>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-muted-foreground">Version:</p>
                    <p className="font-semibold">{data.version}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Dashboard */}
        {!hasRequiredData && (
          <Card className="glass-card animate-scale-in">
            <CardContent className="py-16 text-center">
              <div className="space-y-4">
                <div className="h-12 w-12 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                  <div className="h-6 w-6 bg-gradient-to-br from-primary to-accent rounded-full opacity-70"></div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Ready for Analysis</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Fill out all forms in the sidebar to see your comprehensive financial analysis and visualizations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasRequiredData && !startupScenarioMutation.data && isCalculating && (
          <Card className="glass-card animate-scale-in">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <div className="absolute inset-0 h-12 w-12 rounded-full bg-primary/10 animate-ping"></div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Analyzing Your Scenario</h3>
                  <p className="text-muted-foreground">Running financial calculations and projections...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {startupScenarioMutation.data && (
          <ScenarioResults 
            results={startupScenarioMutation.data} 
            isLoading={isCalculating}
            monteCarloContent={hasRequiredData ? (
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
                      total_vesting_years: equityDetails.vesting_period,
                      cliff_years: equityDetails.cliff_period,
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
                      total_vesting_years: equityDetails.vesting_period,
                      cliff_years: equityDetails.cliff_period,
                      exercise_strategy: equityDetails.exercise_strategy,
                      exercise_year: equityDetails.exercise_year,
                      exit_price_per_share: equityDetails.exit_price_per_share,
                    },
                  }}
                  onComplete={React.useCallback((results: { net_outcomes: number[]; simulated_valuations: number[] }) => {
                    setMonteCarloResults(results);
                  }, [])}
                />

                {monteCarloResults && (
                  <MonteCarloVisualizations
                    netOutcomes={monteCarloResults.net_outcomes}
                    simulatedValuations={monteCarloResults.simulated_valuations}
                  />
                )}
              </div>
            ) : undefined}
          />
        )}


        {startupScenarioMutation.isError && (
          <Card className="glass-card border-destructive/20 animate-scale-in">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center">
                  <XCircle className="h-6 w-6 text-destructive" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg text-destructive">Calculation Error</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {startupScenarioMutation.error?.message || "An error occurred during scenario calculation"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
