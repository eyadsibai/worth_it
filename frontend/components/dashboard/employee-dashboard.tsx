"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { ErrorCard } from "@/components/ui/error-card";
import { GlobalSettingsFormComponent } from "@/components/forms/global-settings-form";
import { CurrentJobFormComponent } from "@/components/forms/current-job-form";
import { StartupOfferFormComponent } from "@/components/forms/startup-offer-form";
import { ScenarioResults } from "@/components/results/scenario-results";
import { MonteCarloFormComponent } from "@/components/forms/monte-carlo-form";
import { MonteCarloVisualizations } from "@/components/charts/monte-carlo-visualizations";
import { SensitivityAnalysisPanel } from "@/components/results/sensitivity-analysis-panel";
import { ScenarioManager } from "@/components/scenarios/scenario-manager";
import { ScenarioComparison } from "@/components/scenarios/scenario-comparison";
import { useDebounce, useSidebarFormStatus, useScenarioCalculation } from "@/lib/hooks";
import { FormCompletionSummary } from "@/components/forms/form-completion-summary";
import { ExampleLoader } from "@/components/forms/example-loader";
import { TemplatePicker } from "@/components/templates/template-picker";
import { useAppStore } from "@/lib/store";
import { isValidEquityData } from "@/lib/validation";
import type { RSUForm, StockOptionsForm } from "@/lib/schemas";

/**
 * EmployeeDashboard component for employee mode.
 *
 * Contains:
 * - Left sidebar with configuration forms (Global Settings, Current Job, Startup Offer)
 * - Right panel with results dashboard, Monte Carlo, and sensitivity analysis
 * - Scenario management and comparison
 */
export function EmployeeDashboard() {
  const {
    globalSettings,
    currentJob,
    equityDetails,
    setGlobalSettings,
    setCurrentJob,
    setEquityDetails,
    monteCarloResults,
    setMonteCarloResults,
    comparisonScenarios,
    setComparisonScenarios,
    clearComparisonScenarios,
  } = useAppStore();

  // Debounce form values to prevent waterfall API calls on rapid form changes
  const debouncedGlobalSettings = useDebounce(globalSettings, 300);
  const debouncedCurrentJob = useDebounce(currentJob, 300);
  const debouncedEquityDetails = useDebounce(equityDetails, 300);

  // Form completion status for sidebar summary
  const formStatus = useSidebarFormStatus(globalSettings, currentJob, equityDetails);

  // Type-safe setter for equity form
  const handleEquityChange = React.useCallback(
    (data: RSUForm | StockOptionsForm) => setEquityDetails(data),
    [setEquityDetails]
  );

  // Use the custom hook for chained calculations
  const {
    hasValidData,
    isCalculating,
    result: startupScenarioResult,
    error,
    errorType,
    retry,
  } = useScenarioCalculation({
    globalSettings: debouncedGlobalSettings,
    currentJob: debouncedCurrentJob,
    equityDetails: debouncedEquityDetails,
  });

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-8">
      {/* Left Column - Configuration Forms */}
      <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        <ExampleLoader />
        <FormCompletionSummary status={formStatus} />
        <GlobalSettingsFormComponent value={globalSettings} onChange={setGlobalSettings} />
        <CurrentJobFormComponent value={currentJob} onChange={setCurrentJob} />
        <StartupOfferFormComponent
          value={equityDetails}
          onRSUChange={handleEquityChange}
          onStockOptionsChange={handleEquityChange}
        />
      </div>

      {/* Right Column - Results */}
      <div className="space-y-6">
        {/* Empty state - waiting for data */}
        {!hasValidData && (
          <Card className="terminal-card animate-scale-in delay-300">
            <CardContent className="py-16 text-center">
              <div className="space-y-6 max-w-md mx-auto">
                {!debouncedEquityDetails || !isValidEquityData(debouncedEquityDetails) ? (
                  <>
                    <AlertCircle className="h-12 w-12 text-accent/40 mx-auto" />
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium text-foreground">Complete Equity Details</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                        Please fill in all equity fields in the Startup Offer form. Enter values greater than zero for:
                        {debouncedEquityDetails?.equity_type === "STOCK_OPTIONS" ? (
                          <span className="block mt-2">
                            Number of Options, Strike Price, Exit Price Per Share, and Monthly Salary
                          </span>
                        ) : (
                          <span className="block mt-2">
                            Total Equity Grant %, Exit Valuation, and Monthly Salary
                          </span>
                        )}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <TemplatePicker mode="employee" />
                    <div className="relative my-6">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-border" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-card px-2 text-muted-foreground">or enter manually</span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                      Complete the configuration forms on the left to generate your financial analysis.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {hasValidData && !startupScenarioResult && isCalculating && (
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
            onClose={clearComparisonScenarios}
          />
        )}

        {/* Scenario Manager */}
        <ScenarioManager onCompareScenarios={setComparisonScenarios} />

        {/* Main Results */}
        {startupScenarioResult && debouncedGlobalSettings && debouncedCurrentJob && debouncedEquityDetails && (
          <ScenarioResults
            results={startupScenarioResult}
            isLoading={isCalculating}
            globalSettings={globalSettings}
            currentJob={currentJob}
            equityDetails={equityDetails}
            monteCarloContent={hasValidData ? (
              <div className="space-y-6">
                <MonteCarloFormComponent
                  baseParams={{
                    exit_year: debouncedGlobalSettings.exit_year,
                    current_job_monthly_salary: debouncedCurrentJob.monthly_salary,
                    startup_monthly_salary: debouncedEquityDetails.monthly_salary,
                    current_job_salary_growth_rate: debouncedCurrentJob.annual_salary_growth_rate / 100,
                    annual_roi: debouncedCurrentJob.assumed_annual_roi / 100,
                    investment_frequency: debouncedCurrentJob.investment_frequency,
                    failure_probability: 0.6,
                    startup_params: debouncedEquityDetails.equity_type === "RSU" ? {
                      equity_type: "RSU",
                      total_vesting_years: debouncedEquityDetails.vesting_period,
                      cliff_years: debouncedEquityDetails.cliff_period,
                      rsu_params: {
                        equity_pct: debouncedEquityDetails.total_equity_grant_pct / 100,
                        target_exit_valuation: debouncedEquityDetails.exit_valuation,
                        simulate_dilution: debouncedEquityDetails.simulate_dilution,
                        dilution_rounds: debouncedEquityDetails.simulate_dilution
                          ? debouncedEquityDetails.dilution_rounds.filter((r) => r.enabled).map((r) => ({
                              round_name: r.round_name,
                              round_type: r.round_type,
                              year: r.year,
                              dilution: r.dilution_pct ? r.dilution_pct / 100 : undefined,
                              pre_money_valuation: r.pre_money_valuation,
                              amount_raised: r.amount_raised,
                              salary_change: r.salary_change,
                            }))
                          : [],
                      },
                    } : {
                      equity_type: "STOCK_OPTIONS",
                      total_vesting_years: debouncedEquityDetails.vesting_period,
                      cliff_years: debouncedEquityDetails.cliff_period,
                      options_params: {
                        num_options: debouncedEquityDetails.num_options,
                        strike_price: debouncedEquityDetails.strike_price,
                        target_exit_price_per_share: debouncedEquityDetails.exit_price_per_share,
                        exercise_strategy: debouncedEquityDetails.exercise_strategy,
                        exercise_year: debouncedEquityDetails.exercise_year,
                      },
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
            ) : undefined}
            sensitivityContent={hasValidData ? (
              <SensitivityAnalysisPanel
                globalSettings={debouncedGlobalSettings}
                currentJob={debouncedCurrentJob}
                equityDetails={debouncedEquityDetails}
                currentOutcome={
                  startupScenarioResult?.final_payout_value != null &&
                  startupScenarioResult?.final_opportunity_cost != null
                    ? startupScenarioResult.final_payout_value -
                      startupScenarioResult.final_opportunity_cost
                    : 0
                }
              />
            ) : undefined}
          />
        )}

        {/* Error state */}
        {error && (
          <ErrorCard
            title="Calculation Failed"
            message={error.message || "Unable to complete the calculation. Please check your inputs and try again."}
            errorType={errorType}
            errorDetails={error.stack}
            onRetry={retry}
            retryLabel="Retry Calculation"
            isRetrying={isCalculating}
            showDetailsToggle={!!error.stack}
          />
        )}
      </div>
    </div>
  );
}
