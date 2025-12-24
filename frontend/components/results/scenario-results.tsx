"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Save, Copy, ChevronDown, Info, Calculator } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type {
  StartupScenarioResponse,
  GlobalSettingsForm,
  CurrentJobForm,
  RSUForm,
  StockOptionsForm,
} from "@/lib/schemas";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { RESULT_EXPLANATIONS, generateResultsSummary } from "@/lib/constants/result-explanations";
import { Skeleton } from "@/components/ui/skeleton";
import { CumulativeComparisonChart } from "@/components/charts/cumulative-comparison-chart";
import { OpportunityCostChart } from "@/components/charts/opportunity-cost-chart";
import { formatCurrency } from "@/lib/format-utils";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { AnimatedCurrencyDisplay } from "@/lib/motion";
import {
  saveScenario,
  getSavedScenarios,
  type ScenarioData,
  type MonteCarloExportStats,
} from "@/lib/export-utils";
import { ExportMenu } from "@/components/results/export-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QuickAdjustPanel } from "@/components/results/quick-adjust-panel";
import { LiveRegion } from "@/components/ui/live-region";
import { DecisionWizard, DecisionRecommendationDisplay } from "@/components/decision";
import { Sparkles } from "lucide-react";
import type {
  DecisionRecommendation,
  DecisionInputs,
  FinancialAnalysis,
} from "@/lib/decision-framework";
import { MetricCarousel } from "@/components/ui/metric-carousel";
import { EmployeeTimeline } from "@/components/cap-table/timeline";

interface ScenarioResultsProps {
  results: StartupScenarioResponse;
  /** First load - show skeleton (no data yet) */
  isLoading?: boolean;
  /** Refetching - show overlay on existing results (stale-while-revalidate) */
  isFetching?: boolean;
  monteCarloContent?: React.ReactNode;
  sensitivityContent?: React.ReactNode;
  globalSettings?: GlobalSettingsForm | null;
  currentJob?: CurrentJobForm | null;
  equityDetails?: RSUForm | StockOptionsForm | null;
  monteCarloStats?: MonteCarloExportStats;
}

export function ScenarioResults({
  results,
  isLoading,
  isFetching,
  monteCarloContent,
  sensitivityContent,
  globalSettings,
  currentJob,
  equityDetails,
  monteCarloStats,
}: ScenarioResultsProps) {
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [scenarioName, setScenarioName] = React.useState("");
  const [scenarioNotes, setScenarioNotes] = React.useState("");
  const [adjustedResults, setAdjustedResults] = React.useState<StartupScenarioResponse | null>(
    null
  );

  // Decision Framework state
  const [showDecisionWizard, setShowDecisionWizard] = React.useState(false);
  const [decisionRecommendation, setDecisionRecommendation] =
    React.useState<DecisionRecommendation | null>(null);
  const [decisionInputs, setDecisionInputs] = React.useState<DecisionInputs | null>(null);

  // NPV toggle state - shows values in today's dollars vs future value
  const [showNPV, setShowNPV] = React.useState(false);

  // Use adjusted results when available, otherwise use original results
  const displayResults = adjustedResults || results;

  // Check if NPV values are available
  const hasNPVValues =
    displayResults.final_payout_value_npv != null &&
    displayResults.final_opportunity_cost_npv != null;

  // Get the values to display based on toggle state
  const displayPayoutValue =
    showNPV && hasNPVValues
      ? displayResults.final_payout_value_npv!
      : displayResults.final_payout_value;
  const displayOpportunityCost =
    showNPV && hasNPVValues
      ? displayResults.final_opportunity_cost_npv!
      : displayResults.final_opportunity_cost;

  // Calculate net benefit (must be before any early returns to satisfy hooks rules)
  const netBenefit = displayPayoutValue - displayOpportunityCost;
  const isPositive = netBenefit >= 0;

  // Generate announcement text for screen readers (must be called unconditionally)
  const announcement = React.useMemo(() => {
    if (isLoading) return "Calculating results...";
    const formattedBenefit = formatCurrency(Math.abs(netBenefit));
    if (isPositive) {
      return `Calculation complete. Net benefit: ${formattedBenefit}. This offer is worth it.`;
    }
    return `Calculation complete. Net cost: ${formattedBenefit}. This offer is not worth it.`;
  }, [isLoading, netBenefit, isPositive]);

  // Create financial analysis object for decision framework
  const financialAnalysis: FinancialAnalysis = React.useMemo(
    () => ({
      netBenefit,
      // Use Monte Carlo profit probability if available, otherwise estimate from net benefit
      positiveOutcomeProbability: monteCarloStats?.profitProbability ?? (isPositive ? 0.6 : 0.4),
      expectedValue: monteCarloStats?.mean ?? netBenefit,
      isWorthIt: isPositive,
    }),
    [netBenefit, isPositive, monteCarloStats]
  );

  // Decision wizard handlers
  const handleDecisionComplete = React.useCallback(
    (recommendation: DecisionRecommendation, inputs: DecisionInputs) => {
      setDecisionRecommendation(recommendation);
      setDecisionInputs(inputs);
      setShowDecisionWizard(false);
    },
    []
  );

  const handleRedoDecision = React.useCallback(() => {
    setDecisionRecommendation(null);
    setDecisionInputs(null);
    setShowDecisionWizard(true);
  }, []);

  if (isLoading) {
    return (
      <>
        {/* Screen reader announcement for loading */}
        <LiveRegion>{announcement}</LiveRegion>
        <div className="animate-fade-in space-y-6">
          {/* Skeleton Metric Cards */}
          <MetricCarousel>
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="terminal-card overflow-hidden">
                <CardHeader className="px-4 pt-4 pb-2">
                  <Skeleton className="h-3 w-20" />
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-4">
                  <Skeleton className="h-6 w-28" />
                  <Skeleton className="h-3 w-16" />
                </CardContent>
              </Card>
            ))}
          </MetricCarousel>

          {/* Skeleton Summary Card */}
          <Card className="terminal-card border-l-muted border-l-4">
            <CardContent className="px-5 py-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-5 w-5 flex-shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="mt-3 h-3 w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Skeleton Detailed Analysis */}
          <Card className="terminal-card">
            <CardHeader className="pb-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="mt-2 h-3 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-4 h-8 w-48" />
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const handleSaveScenario = () => {
    if (!scenarioName.trim() || !globalSettings || !currentJob || !equityDetails) {
      return;
    }

    const scenarioData: ScenarioData = {
      name: scenarioName.trim(),
      timestamp: new Date().toISOString(),
      notes: scenarioNotes.trim() || undefined,
      globalSettings: {
        exitYear: globalSettings.exit_year,
      },
      currentJob: {
        monthlySalary: currentJob.monthly_salary,
        annualGrowthRate: currentJob.annual_salary_growth_rate,
        assumedROI: currentJob.assumed_annual_roi,
        investmentFrequency: currentJob.investment_frequency,
      },
      equity:
        equityDetails.equity_type === "RSU"
          ? {
              type: "RSU",
              monthlySalary: equityDetails.monthly_salary,
              vestingPeriod: equityDetails.vesting_period,
              cliffPeriod: equityDetails.cliff_period,
              equityPct: equityDetails.total_equity_grant_pct,
              exitValuation: equityDetails.exit_valuation,
              simulateDilution: equityDetails.simulate_dilution,
            }
          : {
              type: "STOCK_OPTIONS",
              monthlySalary: equityDetails.monthly_salary,
              vestingPeriod: equityDetails.vesting_period,
              cliffPeriod: equityDetails.cliff_period,
              numOptions: equityDetails.num_options,
              strikePrice: equityDetails.strike_price,
              exitPricePerShare: equityDetails.exit_price_per_share,
            },
      results: {
        finalPayoutValue: results.final_payout_value,
        finalOpportunityCost: results.final_opportunity_cost,
        netOutcome: netBenefit,
        breakeven: results.breakeven_label,
      },
    };

    try {
      saveScenario(scenarioData);
      toast.success("Scenario saved", {
        description: `"${scenarioName.trim()}" has been saved for comparison.`,
      });
      setShowSaveDialog(false);
      setScenarioName("");
      setScenarioNotes("");
    } catch (error) {
      console.error("Failed to save scenario:", error);
      toast.error("Failed to save scenario", {
        description: "Please try again.",
      });
    }
  };

  // Quick save with auto-generated name
  const handleQuickSave = () => {
    if (!globalSettings || !currentJob || !equityDetails) {
      return;
    }

    // Generate auto-name based on equity type and timestamp
    const equityLabel = equityDetails.equity_type === "RSU" ? "RSU" : "Options";
    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    let baseName = `${equityLabel} Scenario - ${dateStr}`;

    // Check for existing scenarios with similar names and increment
    const existingScenarios = getSavedScenarios();
    const similarNames = existingScenarios.filter((s) => s.name.startsWith(baseName));
    if (similarNames.length > 0) {
      baseName = `${baseName} (${similarNames.length + 1})`;
    }

    const scenarioData: ScenarioData = {
      name: baseName,
      timestamp: new Date().toISOString(),
      globalSettings: {
        exitYear: globalSettings.exit_year,
      },
      currentJob: {
        monthlySalary: currentJob.monthly_salary,
        annualGrowthRate: currentJob.annual_salary_growth_rate,
        assumedROI: currentJob.assumed_annual_roi,
        investmentFrequency: currentJob.investment_frequency,
      },
      equity:
        equityDetails.equity_type === "RSU"
          ? {
              type: "RSU",
              monthlySalary: equityDetails.monthly_salary,
              vestingPeriod: equityDetails.vesting_period,
              cliffPeriod: equityDetails.cliff_period,
              equityPct: equityDetails.total_equity_grant_pct,
              exitValuation: equityDetails.exit_valuation,
              simulateDilution: equityDetails.simulate_dilution,
            }
          : {
              type: "STOCK_OPTIONS",
              monthlySalary: equityDetails.monthly_salary,
              vestingPeriod: equityDetails.vesting_period,
              cliffPeriod: equityDetails.cliff_period,
              numOptions: equityDetails.num_options,
              strikePrice: equityDetails.strike_price,
              exitPricePerShare: equityDetails.exit_price_per_share,
            },
      results: {
        finalPayoutValue: results.final_payout_value,
        finalOpportunityCost: results.final_opportunity_cost,
        netOutcome: netBenefit,
        breakeven: results.breakeven_label,
      },
    };

    try {
      saveScenario(scenarioData);
      toast.success("Scenario saved", {
        description: `"${baseName}" has been saved for comparison.`,
      });
    } catch (error) {
      console.error("Failed to save scenario:", error);
      toast.error("Failed to save scenario", {
        description: "Please try again.",
      });
    }
  };

  return (
    <>
      {/* Screen reader announcement for calculation results */}
      <LiveRegion>{announcement}</LiveRegion>

      <div className="animate-fade-in relative space-y-6" data-tour="results-section">
        {/* Fetching overlay - shows during refetch while keeping stale data visible */}
        {isFetching && (
          <div
            className="bg-background/60 absolute inset-0 z-10 flex items-center justify-center rounded-lg backdrop-blur-[1px]"
            role="status"
            aria-label="Updating calculations..."
          >
            <div className="bg-card/80 border-border flex flex-col items-center gap-3 rounded-lg border px-6 py-4 shadow-lg backdrop-blur-sm">
              <div className="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
              <span className="text-muted-foreground text-sm font-medium">Updating...</span>
            </div>
          </div>
        )}
        {/* Save and Export Buttons */}
        <div className="flex justify-end gap-2">
          {/* Export Menu */}
          {globalSettings && currentJob && equityDetails && (
            <ExportMenu
              scenario={{
                name: `${equityDetails.equity_type === "RSU" ? "RSU" : "Stock Options"} - $${formatCurrency(equityDetails.monthly_salary)}/mo`,
                timestamp: new Date().toISOString(),
                globalSettings: {
                  exitYear: globalSettings.exit_year,
                },
                currentJob: {
                  monthlySalary: currentJob.monthly_salary,
                  annualGrowthRate: currentJob.annual_salary_growth_rate,
                  assumedROI: currentJob.assumed_annual_roi,
                  investmentFrequency: currentJob.investment_frequency,
                },
                equity:
                  equityDetails.equity_type === "RSU"
                    ? {
                        type: "RSU",
                        monthlySalary: equityDetails.monthly_salary,
                        vestingPeriod: equityDetails.vesting_period,
                        cliffPeriod: equityDetails.cliff_period,
                        equityPct: equityDetails.total_equity_grant_pct,
                        exitValuation: equityDetails.exit_valuation,
                        simulateDilution: equityDetails.simulate_dilution,
                      }
                    : {
                        type: "STOCK_OPTIONS",
                        monthlySalary: equityDetails.monthly_salary,
                        vestingPeriod: equityDetails.vesting_period,
                        cliffPeriod: equityDetails.cliff_period,
                        numOptions: equityDetails.num_options,
                        strikePrice: equityDetails.strike_price,
                        exitPricePerShare: equityDetails.exit_price_per_share,
                      },
                results: {
                  finalPayoutValue: results.final_payout_value,
                  finalOpportunityCost: results.final_opportunity_cost,
                  netOutcome: netBenefit,
                  breakeven: results.breakeven_label,
                },
              }}
              monteCarloStats={monteCarloStats}
            />
          )}

          {/* Save Scenario Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={!globalSettings || !currentJob || !equityDetails}
              >
                <Save className="h-4 w-4" />
                Save Scenario
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                <Save className="mr-2 h-4 w-4" />
                Save with name...
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleQuickSave}>
                <Copy className="mr-2 h-4 w-4" />
                Quick save
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Quick Adjustments Panel */}
        {equityDetails && (
          <QuickAdjustPanel
            equityDetails={equityDetails}
            baseResults={results}
            onAdjustedResultsChange={setAdjustedResults}
          />
        )}

        {/* Value Mode Toggle */}
        {hasNPVValues && (
          <div className="mb-2 flex items-center justify-end gap-2">
            <Label
              htmlFor="npv-toggle"
              className="text-muted-foreground flex items-center gap-1 text-xs"
            >
              <Calculator className="h-3 w-3" />
              <span className="hidden sm:inline">View in today&apos;s dollars (NPV)</span>
              <span className="sm:hidden">NPV View</span>
              <InfoTooltip
                content="Toggle between Future Value (what you'll have at exit) and Net Present Value (what those future dollars are worth today, accounting for the time value of money)."
                iconSize={12}
              />
            </Label>
            <Switch
              id="npv-toggle"
              checked={showNPV}
              onCheckedChange={setShowNPV}
              aria-label="Toggle NPV view"
            />
          </div>
        )}

        {/* Key Metrics Cards */}
        {/* Carousel on mobile, 5-col grid on desktop */}
        <MetricCarousel>
          {/* Final Payout */}
          <Card className="terminal-card h-full overflow-hidden">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardDescription className="data-label flex w-fit items-center gap-1 text-xs">
                <span className="hidden sm:inline">Final Payout {showNPV && "(NPV)"}</span>
                <span className="sm:hidden">Payout {showNPV && "(NPV)"}</span>
                <InfoTooltip content={RESULT_EXPLANATIONS.finalPayout} iconSize={12} />
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <CardTitle className="text-foreground text-lg font-semibold tracking-tight lg:text-xl">
                <AnimatedCurrencyDisplay value={displayPayoutValue} responsive />
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-xs">{results.payout_label}</p>
            </CardContent>
          </Card>

          {/* Opportunity Cost */}
          <Card className="terminal-card h-full overflow-hidden">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardDescription className="data-label flex w-fit items-center gap-1 text-xs">
                <span className="hidden sm:inline">Opp. Cost {showNPV && "(NPV)"}</span>
                <span className="sm:hidden">Opp. Cost {showNPV && "(NPV)"}</span>
                <InfoTooltip content={RESULT_EXPLANATIONS.opportunityCost} iconSize={12} />
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <CardTitle className="text-foreground text-lg font-semibold tracking-tight lg:text-xl">
                <AnimatedCurrencyDisplay value={displayOpportunityCost} responsive />
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-xs">
                <span className="hidden sm:inline">Current job alternative</span>
                <span className="sm:hidden">Alt. path</span>
              </p>
            </CardContent>
          </Card>

          {/* Net Benefit */}
          <Card className="terminal-card h-full overflow-hidden">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardDescription className="data-label flex w-fit items-center gap-1 text-xs">
                Net Benefit {showNPV && "(NPV)"}
                <InfoTooltip content={RESULT_EXPLANATIONS.netBenefit} iconSize={12} />
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="flex items-center gap-1.5">
                {isPositive ? (
                  <TrendingUp className="text-terminal h-4 w-4 flex-shrink-0" />
                ) : (
                  <TrendingDown className="text-destructive h-4 w-4 flex-shrink-0" />
                )}
                <CardTitle
                  className={`text-lg font-semibold tracking-tight lg:text-xl ${isPositive ? "text-terminal" : "text-destructive"}`}
                >
                  <AnimatedCurrencyDisplay value={netBenefit} responsive />
                </CardTitle>
              </div>
              <div className="mt-2">
                <Badge
                  variant={isPositive ? "default" : "destructive"}
                  className={
                    isPositive
                      ? "bg-terminal/15 text-terminal hover:bg-terminal/20 border-terminal/30 border text-xs"
                      : "text-xs"
                  }
                >
                  {isPositive ? "WORTH IT" : "NOT WORTH IT"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Dilution (if applicable) */}
          {displayResults.total_dilution !== null &&
            displayResults.total_dilution !== undefined && (
              <Card className="terminal-card h-full overflow-hidden">
                <CardHeader className="px-4 pt-4 pb-2">
                  <CardDescription className="data-label flex w-fit items-center gap-1 text-xs">
                    <span className="hidden sm:inline">Total Dilution</span>
                    <span className="sm:hidden">Dilution</span>
                    <InfoTooltip content={RESULT_EXPLANATIONS.totalDilution} iconSize={12} />
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <CardTitle className="text-foreground text-lg font-semibold tracking-tight tabular-nums lg:text-xl">
                    {(displayResults.total_dilution * 100).toFixed(2).replace(/\.?0+$/, "")}%
                  </CardTitle>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Final:{" "}
                    {((displayResults.diluted_equity_pct || 0) * 100)
                      .toFixed(2)
                      .replace(/\.?0+$/, "")}
                    %
                  </p>
                </CardContent>
              </Card>
            )}

          {/* Break-Even */}
          <Card className="terminal-card h-full overflow-hidden">
            <CardHeader className="px-4 pt-4 pb-2">
              <CardDescription className="data-label flex w-fit items-center gap-1 text-xs">
                Break-Even
                <InfoTooltip content={RESULT_EXPLANATIONS.breakEven} iconSize={12} />
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <CardTitle className="text-foreground text-lg font-semibold tracking-tight lg:text-xl">
                {displayResults.results_df.length > 0 &&
                displayResults.results_df[displayResults.results_df.length - 1].breakeven_value !==
                  undefined ? (
                  <CurrencyDisplay
                    value={
                      displayResults.results_df[displayResults.results_df.length - 1]
                        .breakeven_value
                    }
                    responsive
                  />
                ) : (
                  "N/A"
                )}
              </CardTitle>
              <p className="text-muted-foreground mt-1 text-xs">{displayResults.breakeven_label}</p>
            </CardContent>
          </Card>
        </MetricCarousel>

        {/* Plain-English Summary */}
        {globalSettings && (
          <Card
            className={`terminal-card border-l-4 ${isPositive ? "border-l-terminal" : "border-l-destructive"}`}
          >
            <CardContent className="px-5 py-4">
              <div className="flex items-start gap-3">
                <Info
                  className={`mt-0.5 h-5 w-5 flex-shrink-0 ${isPositive ? "text-terminal" : "text-destructive"}`}
                />
                <div className="space-y-2">
                  <p className="text-foreground text-sm leading-relaxed">
                    {generateResultsSummary({
                      netBenefit,
                      finalPayout: displayResults.final_payout_value,
                      opportunityCost: displayResults.final_opportunity_cost,
                      exitYear: globalSettings.exit_year,
                      breakEvenValuation:
                        displayResults.results_df.length > 0
                          ? displayResults.results_df[displayResults.results_df.length - 1]
                              .breakeven_value
                          : undefined,
                      totalDilution: displayResults.total_dilution ?? undefined,
                    })
                      .split("**")
                      .map((part, i) =>
                        i % 2 === 1 ? (
                          <strong key={i} className="font-semibold">
                            {part}
                          </strong>
                        ) : (
                          part
                        )
                      )}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {isPositive
                      ? RESULT_EXPLANATIONS.worthItPositive
                      : RESULT_EXPLANATIONS.worthItNegative}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decision Framework Section */}
        {!decisionRecommendation && (
          <Card className="terminal-card border-primary/30 bg-primary/5 border-2 border-dashed">
            <CardContent className="py-6">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="flex items-center gap-3 text-center sm:text-left">
                  <div className="bg-primary/10 rounded-lg p-2">
                    <Sparkles className="text-primary h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-foreground font-medium">Want help making this decision?</h3>
                    <p className="text-muted-foreground text-sm">
                      Get a personalized recommendation based on your risk profile and career goals
                    </p>
                  </div>
                </div>
                <Button onClick={() => setShowDecisionWizard(true)} className="shrink-0">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Start Decision Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decision Recommendation Display */}
        {decisionRecommendation && decisionInputs && (
          <DecisionRecommendationDisplay
            recommendation={decisionRecommendation}
            inputs={decisionInputs}
            onRedo={handleRedoDecision}
          />
        )}

        {/* Vesting Timeline */}
        {equityDetails && globalSettings && (
          <EmployeeTimeline equityDetails={equityDetails} globalSettings={globalSettings} />
        )}

        {/* Decision Wizard Dialog */}
        <Dialog open={showDecisionWizard} onOpenChange={setShowDecisionWizard}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DecisionWizard
              financialAnalysis={financialAnalysis}
              onComplete={handleDecisionComplete}
              onSkip={() => setShowDecisionWizard(false)}
            />
          </DialogContent>
        </Dialog>

        {/* Detailed Results Tabs */}
        <Card className="terminal-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Detailed Analysis</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">
              Yearly breakdown and visualizations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="table" className="w-full">
              <TabsList className="bg-secondary/50 border-border mb-4 border">
                <TabsTrigger
                  value="table"
                  className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent text-sm"
                >
                  Table
                </TabsTrigger>
                <TabsTrigger
                  value="charts"
                  className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent text-sm"
                >
                  Charts
                </TabsTrigger>
                {monteCarloContent && (
                  <TabsTrigger
                    value="monte-carlo"
                    className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent text-sm"
                  >
                    Monte Carlo
                  </TabsTrigger>
                )}
                {sensitivityContent && (
                  <TabsTrigger
                    value="sensitivity"
                    className="data-[state=active]:bg-accent/20 data-[state=active]:text-accent text-sm"
                  >
                    Sensitivity
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="table" className="space-y-4">
                <div className="border-border overflow-hidden rounded-lg border">
                  <div className="max-h-[500px] overflow-auto">
                    <table className="w-full text-sm tabular-nums">
                      <thead className="bg-secondary/80 sticky top-0 backdrop-blur-sm">
                        <tr>
                          <th className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                            Year
                          </th>
                          <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">
                            Startup
                          </th>
                          <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">
                            Current
                          </th>
                          <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">
                            Delta
                          </th>
                          <th className="text-muted-foreground px-4 py-3 text-right text-xs font-medium tracking-wider uppercase">
                            Cumulative
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-border/50 divide-y">
                        {results.results_df.map((row, idx) => (
                          <tr key={idx} className="hover:bg-secondary/30 transition-colors">
                            <td className="text-accent px-4 py-3 font-medium">
                              {row.year || idx + 1}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatCurrency(row.startup_monthly_salary || 0)}
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums">
                              {formatCurrency(row.current_job_monthly_salary || 0)}
                            </td>
                            <td
                              className={`px-4 py-3 text-right tabular-nums ${(row.monthly_surplus || 0) >= 0 ? "text-terminal" : "text-destructive"}`}
                            >
                              {formatCurrency(row.monthly_surplus || 0)}
                            </td>
                            <td className="text-muted-foreground px-4 py-3 text-right tabular-nums">
                              {formatCurrency(row.cumulative_opportunity_cost || 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="charts" className="space-y-8">
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold">Salary Comparison</h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">Monthly salary over time</p>
                  </div>
                  <div className="border-border bg-card rounded-lg border p-5">
                    <CumulativeComparisonChart data={results.results_df} />
                  </div>
                </div>

                <div className="section-divider" />

                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold">Opportunity Cost</h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">Cumulative cost analysis</p>
                  </div>
                  <div className="border-border bg-card rounded-lg border p-5">
                    <OpportunityCostChart data={results.results_df} />
                  </div>
                </div>
              </TabsContent>

              {monteCarloContent && (
                <TabsContent value="monte-carlo" className="space-y-6">
                  {monteCarloContent}
                </TabsContent>
              )}

              {sensitivityContent && (
                <TabsContent value="sensitivity" className="space-y-6">
                  {sensitivityContent}
                </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Save Scenario Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Scenario</DialogTitle>
            <DialogDescription>
              Give this scenario a name to save it for later comparison.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scenario-name" className="text-sm">
                Scenario Name
              </Label>
              <Input
                id="scenario-name"
                placeholder="e.g., Company A - Series B"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && scenarioName.trim()) {
                    handleSaveScenario();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scenario-notes" className="text-sm">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="scenario-notes"
                placeholder="Add any notes or comments about this scenario..."
                value={scenarioNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setScenarioNotes(e.target.value)
                }
                className="min-h-[80px] resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSaveDialog(false);
                setScenarioName("");
                setScenarioNotes("");
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button onClick={handleSaveScenario} disabled={!scenarioName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
