"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHealthCheck, useCalculateStartupScenario, useCreateMonthlyDataGrid, useCalculateOpportunityCost } from "@/lib/api-client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { GlobalSettingsFormComponent } from "@/components/forms/global-settings-form";
import { CurrentJobFormComponent } from "@/components/forms/current-job-form";
import { StartupOfferFormComponent } from "@/components/forms/startup-offer-form";
import { ScenarioResults } from "@/components/results/scenario-results";
import { MonteCarloFormComponent } from "@/components/forms/monte-carlo-form";
import { MonteCarloVisualizations } from "@/components/charts/monte-carlo-visualizations";
import { ScenarioManager } from "@/components/scenarios/scenario-manager";
import { ScenarioComparison } from "@/components/scenarios/scenario-comparison";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { GlobalSettingsForm, CurrentJobForm, RSUForm, StockOptionsForm } from "@/lib/schemas";
import type { ScenarioData } from "@/lib/export-utils";

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

  // Scenario comparison state
  const [comparisonScenarios, setComparisonScenarios] = React.useState<ScenarioData[]>([]);

  // Debounce form values to prevent waterfall API calls on rapid form changes
  // 300ms delay balances responsiveness with avoiding excessive API calls
  const debouncedGlobalSettings = useDebounce(globalSettings, 300);
  const debouncedCurrentJob = useDebounce(currentJob, 300);
  const debouncedEquityDetails = useDebounce(equityDetails, 300);

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

  const handleMonteCarloComplete = React.useCallback((results: { net_outcomes: number[]; simulated_valuations: number[] }) => {
    setMonteCarloResults(results);
  }, []);

  const handleCompareScenarios = React.useCallback((scenarios: ScenarioData[]) => {
    setComparisonScenarios(scenarios);
  }, []);

  const handleCloseComparison = React.useCallback(() => {
    setComparisonScenarios([]);
  }, []);

  // Check if we have all required data (using debounced values for API calls)
  const hasDebouncedData = debouncedGlobalSettings && debouncedCurrentJob && debouncedEquityDetails;

  // Initialize mutations
  const monthlyDataMutation = useCreateMonthlyDataGrid();
  const opportunityCostMutation = useCalculateOpportunityCost();
  const startupScenarioMutation = useCalculateStartupScenario();

  // Trigger calculations when debounced form data changes
  // Using debounced values prevents waterfall API calls during rapid form input
  React.useEffect(() => {
    if (!hasDebouncedData) return;

    // Step 1: Calculate monthly data grid
    const monthlyDataRequest = {
      exit_year: debouncedGlobalSettings.exit_year,
      current_job_monthly_salary: debouncedCurrentJob.monthly_salary,
      startup_monthly_salary: debouncedEquityDetails.monthly_salary,
      current_job_salary_growth_rate: debouncedCurrentJob.annual_salary_growth_rate / 100,
      dilution_rounds:
        debouncedEquityDetails.equity_type === "RSU" && debouncedEquityDetails.simulate_dilution
          ? debouncedEquityDetails.dilution_rounds
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
    // monthlyDataMutation.mutate is stable (TanStack Query guarantee) - not needed in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedGlobalSettings, debouncedCurrentJob, debouncedEquityDetails, hasDebouncedData]);

  // Step 2: Calculate opportunity cost when monthly data is ready
  // This effect chains from the first - triggered by monthlyDataMutation.data changing
  React.useEffect(() => {
    if (!monthlyDataMutation.data || !hasDebouncedData) return;

    const opportunityCostRequest = {
      monthly_data: monthlyDataMutation.data.data,
      annual_roi: debouncedCurrentJob.assumed_annual_roi / 100,
      investment_frequency: debouncedCurrentJob.investment_frequency,
      options_params:
        debouncedEquityDetails.equity_type === "STOCK_OPTIONS"
          ? {
              num_options: debouncedEquityDetails.num_options,
              strike_price: debouncedEquityDetails.strike_price,
              total_vesting_years: debouncedEquityDetails.vesting_period,
              cliff_years: debouncedEquityDetails.cliff_period,
              exercise_strategy: debouncedEquityDetails.exercise_strategy,
              exercise_year: debouncedEquityDetails.exercise_year,
              exit_price_per_share: debouncedEquityDetails.exit_price_per_share,
            }
          : null,
      startup_params: null,
    };

    opportunityCostMutation.mutate(opportunityCostRequest);
    // opportunityCostMutation.mutate is stable (TanStack Query guarantee) - not needed in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyDataMutation.data, hasDebouncedData, debouncedCurrentJob, debouncedEquityDetails]);

  // Step 3: Calculate startup scenario when opportunity cost is ready
  // This effect chains from the second - triggered by opportunityCostMutation.data changing
  React.useEffect(() => {
    if (!opportunityCostMutation.data || !hasDebouncedData) return;

    const startupScenarioRequest = {
      opportunity_cost_data: opportunityCostMutation.data.data,
      startup_params:
        debouncedEquityDetails.equity_type === "RSU"
          ? {
              equity_type: "Equity (RSUs)",
              total_vesting_years: debouncedEquityDetails.vesting_period,
              cliff_years: debouncedEquityDetails.cliff_period,
              rsu_params: {
                equity_pct: debouncedEquityDetails.total_equity_grant_pct / 100,
                target_exit_valuation: debouncedEquityDetails.exit_valuation,
                simulate_dilution: debouncedEquityDetails.simulate_dilution,
                dilution_rounds: debouncedEquityDetails.simulate_dilution
                  ? debouncedEquityDetails.dilution_rounds
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
              num_options: debouncedEquityDetails.num_options,
              strike_price: debouncedEquityDetails.strike_price,
              total_vesting_years: debouncedEquityDetails.vesting_period,
              cliff_years: debouncedEquityDetails.cliff_period,
              exercise_strategy: debouncedEquityDetails.exercise_strategy,
              exercise_year: debouncedEquityDetails.exercise_year,
              exit_price_per_share: debouncedEquityDetails.exit_price_per_share,
            },
    };

    startupScenarioMutation.mutate(startupScenarioRequest);
    // startupScenarioMutation.mutate is stable (TanStack Query guarantee) - not needed in deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunityCostMutation.data, hasDebouncedData, debouncedEquityDetails]);

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
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground animate-fade-in">
            <span className="text-accent font-mono">&gt;</span>{" "}
            Job Offer{" "}
            <span className="gradient-text">Financial Analyzer</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed animate-fade-in delay-75">
            Analyze startup job offers with comprehensive financial modeling including equity,
            dilution, and Monte Carlo simulations
          </p>
          <div className="section-divider animate-fade-in delay-150" />
        </div>

        {/* API Status */}
        <Card className="terminal-card animate-slide-up delay-225">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-3 font-mono uppercase tracking-wider text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-terminal animate-pulse" style={{ boxShadow: '0 0 8px oklch(75% 0.18 145 / 0.8)' }}></div>
              <span>System Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center space-x-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span className="text-sm text-muted-foreground font-mono">Connecting...</span>
              </div>
            )}

            {isError && (
              <div className="flex items-center space-x-3 py-2 text-destructive">
                <XCircle className="h-4 w-4" />
                <span className="text-sm font-mono">ERROR: {error?.message || "Connection failed"}</span>
              </div>
            )}

            {data && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 text-terminal" />
                  <span className="text-sm font-medium text-terminal">Online</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-mono">
                  <span className="uppercase">{data.status}</span>
                  <span className="text-xs bg-secondary px-2 py-1 rounded border border-border">v{data.version}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Dashboard */}
        {!hasDebouncedData && (
          <Card className="terminal-card animate-scale-in delay-300">
            <CardContent className="py-16 text-center">
              <div className="space-y-6 max-w-md mx-auto">
                <div className="font-mono text-6xl text-accent/20 select-none">_</div>
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-foreground">Awaiting Input</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                    Complete the forms in the sidebar to generate your financial analysis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasDebouncedData && !startupScenarioMutation.data && isCalculating && (
          <Card className="terminal-card animate-scale-in">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-accent" />
                </div>
                <div className="space-y-2 max-w-sm">
                  <h3 className="text-lg font-medium text-foreground">Processing</h3>
                  <p className="text-sm text-muted-foreground font-mono">Running calculations...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scenario Comparison */}
        {comparisonScenarios.length > 0 && (
          <ScenarioComparison
            scenarios={comparisonScenarios}
            onClose={handleCloseComparison}
          />
        )}

        {/* Scenario Manager */}
        <ScenarioManager onCompareScenarios={handleCompareScenarios} />

        {startupScenarioMutation.data && (
          <ScenarioResults
            results={startupScenarioMutation.data}
            isLoading={isCalculating}
            globalSettings={globalSettings}
            currentJob={currentJob}
            equityDetails={equityDetails}
            monteCarloContent={hasDebouncedData ? (
              <div className="space-y-6">
                <MonteCarloFormComponent
                  baseParams={{
                    exit_year: debouncedGlobalSettings.exit_year,
                    current_job_monthly_salary: debouncedCurrentJob.monthly_salary,
                    startup_monthly_salary: debouncedEquityDetails.monthly_salary,
                    current_job_salary_growth_rate: debouncedCurrentJob.annual_salary_growth_rate / 100,
                    equity_params: debouncedEquityDetails.equity_type === "RSU" ? {
                      equity_type: "Equity (RSUs)",
                      total_equity_grant_pct: debouncedEquityDetails.total_equity_grant_pct / 100,
                      total_vesting_years: debouncedEquityDetails.vesting_period,
                      cliff_years: debouncedEquityDetails.cliff_period,
                      simulate_dilution: debouncedEquityDetails.simulate_dilution,
                      dilution_rounds: debouncedEquityDetails.simulate_dilution
                        ? debouncedEquityDetails.dilution_rounds.filter((r) => r.enabled).map((r) => ({
                            round_name: r.round_name,
                            round_type: r.round_type,
                            year: r.year,
                            dilution_pct: r.dilution_pct ? r.dilution_pct / 100 : undefined,
                            pre_money_valuation: r.pre_money_valuation,
                            amount_raised: r.amount_raised,
                            salary_change: r.salary_change,
                          }))
                        : [],
                      exit_valuation: debouncedEquityDetails.exit_valuation,
                    } : {
                      equity_type: "Stock Options",
                      num_options: debouncedEquityDetails.num_options,
                      strike_price: debouncedEquityDetails.strike_price,
                      total_vesting_years: debouncedEquityDetails.vesting_period,
                      cliff_years: debouncedEquityDetails.cliff_period,
                      exercise_strategy: debouncedEquityDetails.exercise_strategy,
                      exercise_year: debouncedEquityDetails.exercise_year,
                      exit_price_per_share: debouncedEquityDetails.exit_price_per_share,
                    },
                  }}
                  onComplete={handleMonteCarloComplete}
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
          <Card className="terminal-card border-destructive/30 animate-scale-in">
            <CardContent className="py-12 text-center">
              <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                <XCircle className="h-8 w-8 text-destructive" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-destructive font-mono">ERROR</h3>
                  <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                    {startupScenarioMutation.error?.message || "Calculation failed"}
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
