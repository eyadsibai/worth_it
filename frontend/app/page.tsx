"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { useCalculateStartupScenario, useCreateMonthlyDataGrid, useCalculateOpportunityCost } from "@/lib/api-client";
import { Loader2, XCircle, AlertCircle } from "lucide-react";
import { GlobalSettingsFormComponent } from "@/components/forms/global-settings-form";
import { CurrentJobFormComponent } from "@/components/forms/current-job-form";
import { StartupOfferFormComponent } from "@/components/forms/startup-offer-form";
import { ScenarioResults } from "@/components/results/scenario-results";
import { MonteCarloFormComponent } from "@/components/forms/monte-carlo-form";
import { MonteCarloVisualizations } from "@/components/charts/monte-carlo-visualizations";
import { ScenarioManager } from "@/components/scenarios/scenario-manager";
import { ScenarioComparison } from "@/components/scenarios/scenario-comparison";
import { useDebounce, useDraftAutoSave, getDraft, clearDraft, useBeforeUnload, type DraftData } from "@/lib/hooks";
import { ModeToggle } from "@/components/mode-toggle";
import { CapTableManager } from "@/components/cap-table";
import { useAppStore } from "@/lib/store";
import { isValidEquityData } from "@/lib/validation";
import { DraftRecoveryDialog } from "@/components/draft-recovery-dialog";
import type { RSUForm, StockOptionsForm } from "@/lib/schemas";

export default function Home() {
  // Global state from Zustand store
  const {
    appMode,
    setAppMode,
    globalSettings,
    currentJob,
    equityDetails,
    setGlobalSettings,
    setCurrentJob,
    setEquityDetails,
    capTable,
    instruments,
    preferenceTiers,
    setCapTable,
    setInstruments,
    setPreferenceTiers,
    monteCarloResults,
    setMonteCarloResults,
    comparisonScenarios,
    setComparisonScenarios,
    clearComparisonScenarios,
  } = useAppStore();

  // Debounce form values to prevent waterfall API calls on rapid form changes
  // 300ms delay balances responsiveness with avoiding excessive API calls
  const debouncedGlobalSettings = useDebounce(globalSettings, 300);
  const debouncedCurrentJob = useDebounce(currentJob, 300);
  const debouncedEquityDetails = useDebounce(equityDetails, 300);

  // Type-safe setters for form components
  const handleEquityChange = React.useCallback(
    (data: RSUForm | StockOptionsForm) => setEquityDetails(data),
    [setEquityDetails]
  );

  // Draft auto-save and recovery
  const [showDraftDialog, setShowDraftDialog] = React.useState(false);
  const [savedDraft, setSavedDraft] = React.useState<DraftData | null>(null);

  // Auto-save form data every 5 seconds (only in employee mode)
  useDraftAutoSave(
    {
      globalSettings,
      currentJob,
      equityDetails,
    },
    { disabled: appMode !== "employee" }
  );

  // Warn before leaving with unsaved changes
  const hasUnsavedChanges = appMode === "employee" && (
    globalSettings !== null || currentJob !== null || equityDetails !== null
  );
  useBeforeUnload(hasUnsavedChanges);

  // Check for saved draft on mount
  React.useEffect(() => {
    if (appMode !== "employee") return;

    const draft = getDraft();
    if (draft) {
      setSavedDraft(draft);
      setShowDraftDialog(true);
    }
  }, [appMode]);

  // Handle draft restore
  const handleRestoreDraft = React.useCallback(() => {
    if (!savedDraft) return;

    const { data } = savedDraft;
    if (data.globalSettings) {
      setGlobalSettings(data.globalSettings as Parameters<typeof setGlobalSettings>[0]);
    }
    if (data.currentJob) {
      setCurrentJob(data.currentJob as Parameters<typeof setCurrentJob>[0]);
    }
    if (data.equityDetails) {
      setEquityDetails(data.equityDetails as RSUForm | StockOptionsForm);
    }

    clearDraft();
    setShowDraftDialog(false);
    setSavedDraft(null);
  }, [savedDraft, setGlobalSettings, setCurrentJob, setEquityDetails]);

  // Handle draft discard
  const handleDiscardDraft = React.useCallback(() => {
    clearDraft();
    setShowDraftDialog(false);
    setSavedDraft(null);
  }, []);

  // Check if we have all required data (using debounced values for API calls)
  // Also validate that equity data has meaningful values (not all zeros)
  const hasDebouncedData =
    debouncedGlobalSettings &&
    debouncedCurrentJob &&
    debouncedEquityDetails &&
    isValidEquityData(debouncedEquityDetails);

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
        appMode === "employee" ? (
          <div className="space-y-4">
            <GlobalSettingsFormComponent onChange={setGlobalSettings} />
            <CurrentJobFormComponent onChange={setCurrentJob} />
            <StartupOfferFormComponent
              onRSUChange={handleEquityChange}
              onStockOptionsChange={handleEquityChange}
            />
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            <p className="text-sm">
              Use the main panel to model your cap table and simulate funding rounds
            </p>
          </div>
        )
      }
    >
      <div className="container py-8 space-y-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground animate-fade-in">
            {appMode === "employee" ? (
              <>Offer <span className="gradient-text">Analysis</span></>
            ) : (
              <>Cap Table <span className="gradient-text">Modeling</span></>
            )}
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed animate-fade-in delay-75">
            {appMode === "employee" ? (
              "Compare startup offers to your current job with equity modeling, dilution scenarios, and Monte Carlo simulations"
            ) : (
              "Simulate funding rounds, model ownership dilution, and understand your exit scenarios"
            )}
          </p>
          <div className="animate-fade-in delay-100">
            <ModeToggle mode={appMode} onModeChange={setAppMode} />
          </div>
          <div className="section-divider animate-fade-in delay-150" />
        </div>

        {/* Founder Mode Content */}
        {appMode === "founder" && (
          <CapTableManager
            capTable={capTable}
            onCapTableChange={setCapTable}
            instruments={instruments}
            onInstrumentsChange={setInstruments}
            preferenceTiers={preferenceTiers}
            onPreferenceTiersChange={setPreferenceTiers}
          />
        )}

        {/* Employee Mode Content */}
        {appMode === "employee" && (
          <>
        {/* Results Dashboard */}
        {!hasDebouncedData && (
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
                    <div className="font-mono text-6xl text-accent/20 select-none">_</div>
                    <div className="space-y-3">
                      <h3 className="text-lg font-medium text-foreground">Awaiting Input</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed font-mono">
                        Complete the forms in the sidebar to generate your financial analysis.
                      </p>
                    </div>
                  </>
                )}
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
            onClose={clearComparisonScenarios}
          />
        )}

        {/* Scenario Manager */}
        <ScenarioManager onCompareScenarios={setComparisonScenarios} />

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
                    annual_roi: debouncedCurrentJob.assumed_annual_roi / 100,
                    investment_frequency: debouncedCurrentJob.investment_frequency,
                    failure_probability: 0.6, // 60% failure rate (realistic: 50-70% of startups fail within 5 years)
                    startup_params: debouncedEquityDetails.equity_type === "RSU" ? {
                      equity_type: "Equity (RSUs)",
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
                      equity_type: "Stock Options",
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
          </>
        )}
      </div>

      {/* Draft Recovery Dialog */}
      {savedDraft && (
        <DraftRecoveryDialog
          open={showDraftDialog}
          draft={savedDraft}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}
    </AppShell>
  );
}
