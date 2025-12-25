"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
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
import {
  useDebounce,
  useSidebarFormStatus,
  useScenarioCalculation,
  useMobileViewSafe,
  useIsTablet,
} from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { FormCompletionSummary } from "@/components/forms/form-completion-summary";
import { ExampleLoader } from "@/components/forms/example-loader";
import { TemplatePicker } from "@/components/templates/template-picker";
import { ActionableEmptyState } from "@/components/dashboard/actionable-empty-state";
import { useAppStore } from "@/lib/store";
import { isValidEquityData, getFirstInvalidEquityField } from "@/lib/validation";
import { toast } from "sonner";
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
    loadExample,
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

  // Handler to load example scenario from empty state
  const handleLoadExample = React.useCallback(() => {
    const success = loadExample("early-stage");
    if (success) {
      toast.success("Example loaded", {
        description: "Early-stage startup values applied to all forms.",
      });
    }
  }, [loadExample]);

  // Handler to focus the first missing field from empty state
  const handleFocusMissingField = React.useCallback(() => {
    const fieldName = getFirstInvalidEquityField(equityDetails);
    if (!fieldName) return;

    // Find and focus the input by name attribute
    const input = document.querySelector<HTMLInputElement>(`input[name="${fieldName}"]`);

    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      // Small delay to ensure scroll completes before focus
      setTimeout(() => input.focus(), 300);
    }
  }, [equityDetails]);

  // Use the custom hook for chained calculations
  const {
    hasValidData,
    isPending,
    isFetching,
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

  // Mobile view context for tabbed navigation
  const mobileView = useMobileViewSafe();
  const isTablet = useIsTablet();

  // Sync calculation state to mobile view context for badge display
  React.useEffect(() => {
    if (mobileView) {
      mobileView.setIsCalculating(isCalculating);
    }
  }, [isCalculating, mobileView]);

  // Mark results as outdated when form changes (debounced values change)
  React.useEffect(() => {
    if (mobileView && hasValidData && startupScenarioResult) {
      // Results exist but form values have changed - mark as outdated briefly
      mobileView.setHasOutdatedResults(true);
      const timer = setTimeout(() => {
        mobileView.setHasOutdatedResults(false);
      }, 500); // Clear after calculation completes
      return () => clearTimeout(timer);
    }
  }, [
    debouncedGlobalSettings,
    debouncedCurrentJob,
    debouncedEquityDetails,
    mobileView,
    hasValidData,
    startupScenarioResult,
  ]);

  // Determine column visibility based on mobile view state
  const activeView = mobileView?.activeView ?? "inputs";
  const showInputs = !isTablet || activeView === "inputs";
  const showResults = !isTablet || activeView === "results";

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* Left Column - Configuration Forms */}
      <div
        className={cn(
          "space-y-6 lg:sticky lg:top-20 lg:self-start",
          // Hide on mobile/tablet when results view is active
          !showInputs && "hidden"
        )}
      >
        <div className="terminal-card-sm">
          <ExampleLoader />
        </div>
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
      <div
        className={cn(
          "space-y-6",
          // Hide on mobile/tablet when inputs view is active
          !showResults && "hidden"
        )}
      >
        {/* Empty state - waiting for data */}
        {!hasValidData && (
          <Card className="terminal-card animate-scale-in delay-300">
            <CardContent className="py-16 text-center">
              {!debouncedEquityDetails || !isValidEquityData(debouncedEquityDetails) ? (
                <ActionableEmptyState
                  equityType={debouncedEquityDetails?.equity_type ?? "RSU"}
                  onLoadExample={handleLoadExample}
                  onFocusMissingField={handleFocusMissingField}
                />
              ) : (
                <div className="mx-auto max-w-md space-y-6">
                  <TemplatePicker mode="employee" />
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <span className="border-border w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card text-muted-foreground px-2">or enter manually</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground font-mono text-sm leading-relaxed">
                    Complete the configuration forms on the left to generate your financial
                    analysis.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loading state - first load only (no stale data) */}
        {hasValidData && !startupScenarioResult && isPending && (
          <Card className="terminal-card animate-scale-in">
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <Loader2 className="text-accent h-10 w-10 animate-spin" />
                </div>
                <div className="max-w-sm space-y-2">
                  <h3 className="text-foreground text-lg font-medium">Processing</h3>
                  <p className="text-muted-foreground font-mono text-sm">Running calculations...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Scenario Comparison */}
        {comparisonScenarios.length > 0 && (
          <ScenarioComparison scenarios={comparisonScenarios} onClose={clearComparisonScenarios} />
        )}

        {/* Scenario Manager */}
        <ScenarioManager onCompareScenarios={setComparisonScenarios} />

        {/* Main Results */}
        {startupScenarioResult &&
          debouncedGlobalSettings &&
          debouncedCurrentJob &&
          debouncedEquityDetails && (
            <ScenarioResults
              results={startupScenarioResult}
              isLoading={isPending}
              isFetching={isFetching}
              globalSettings={debouncedGlobalSettings}
              currentJob={debouncedCurrentJob}
              equityDetails={debouncedEquityDetails}
              monteCarloContent={
                hasValidData ? (
                  <div className="space-y-6">
                    <MonteCarloFormComponent
                      baseParams={{
                        exit_year: debouncedGlobalSettings.exit_year,
                        current_job_monthly_salary: debouncedCurrentJob.monthly_salary,
                        startup_monthly_salary: debouncedEquityDetails.monthly_salary,
                        current_job_salary_growth_rate:
                          debouncedCurrentJob.annual_salary_growth_rate / 100,
                        annual_roi: debouncedCurrentJob.assumed_annual_roi / 100,
                        investment_frequency: debouncedCurrentJob.investment_frequency,
                        failure_probability: 0.6,
                        // Issue #248: Use flat typed format for startup_params
                        startup_params:
                          debouncedEquityDetails.equity_type === "RSU"
                            ? {
                                equity_type: "RSU" as const,
                                monthly_salary: debouncedEquityDetails.monthly_salary,
                                total_equity_grant_pct:
                                  debouncedEquityDetails.total_equity_grant_pct,
                                vesting_period: debouncedEquityDetails.vesting_period,
                                cliff_period: debouncedEquityDetails.cliff_period,
                                exit_valuation: debouncedEquityDetails.exit_valuation,
                                simulate_dilution: debouncedEquityDetails.simulate_dilution,
                                dilution_rounds: debouncedEquityDetails.simulate_dilution
                                  ? debouncedEquityDetails.dilution_rounds
                                      .filter((r) => r.enabled)
                                      .map((r) => ({
                                        round_name: r.round_name,
                                        round_type: r.round_type,
                                        year: r.year,
                                        dilution_pct: r.dilution_pct
                                          ? r.dilution_pct / 100
                                          : undefined,
                                        pre_money_valuation: r.pre_money_valuation,
                                        amount_raised: r.amount_raised,
                                        salary_change: r.salary_change,
                                      }))
                                  : null,
                              }
                            : {
                                equity_type: "STOCK_OPTIONS" as const,
                                monthly_salary: debouncedEquityDetails.monthly_salary,
                                num_options: debouncedEquityDetails.num_options,
                                strike_price: debouncedEquityDetails.strike_price,
                                vesting_period: debouncedEquityDetails.vesting_period,
                                cliff_period: debouncedEquityDetails.cliff_period,
                                exit_price_per_share: debouncedEquityDetails.exit_price_per_share,
                                exercise_strategy:
                                  debouncedEquityDetails.exercise_strategy ?? "AT_EXIT",
                                exercise_year: debouncedEquityDetails.exercise_year ?? null,
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
                ) : undefined
              }
              sensitivityContent={
                hasValidData ? (
                  <SensitivityAnalysisPanel
                    globalSettings={debouncedGlobalSettings}
                    currentJob={debouncedCurrentJob}
                    equityDetails={debouncedEquityDetails}
                    currentOutcome={
                      startupScenarioResult?.final_payout_value !== null &&
                      startupScenarioResult?.final_payout_value !== undefined &&
                      startupScenarioResult?.final_opportunity_cost !== null &&
                      startupScenarioResult?.final_opportunity_cost !== undefined
                        ? startupScenarioResult.final_payout_value -
                          startupScenarioResult.final_opportunity_cost
                        : 0
                    }
                  />
                ) : undefined
              }
            />
          )}

        {/* Error state */}
        {error && (
          <ErrorCard
            title="Calculation Failed"
            message={
              error.message ||
              "Unable to complete the calculation. Please check your inputs and try again."
            }
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
