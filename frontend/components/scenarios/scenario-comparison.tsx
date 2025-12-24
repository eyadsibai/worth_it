"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, TrendingUp, TrendingDown, Trophy, Scale, Info, Download, Loader2 } from "lucide-react";
import { motion } from "@/lib/motion";
import {
  type ScenarioData,
  exportScenarioComparisonPDF,
  type ComparisonDataForExport,
} from "@/lib/export-utils";
import { formatCurrency } from "@/lib/format-utils";
import { useCompareScenarios } from "@/lib/api-client";
import {
  transformWinnerResult,
  transformMetricDiff,
  transformComparisonInsight,
  type FrontendWinnerResult,
  type FrontendMetricDiff,
  type FrontendComparisonInsight,
} from "@/lib/schemas";

interface ScenarioComparisonProps {
  scenarios: ScenarioData[];
  onClose?: () => void;
}

/**
 * Get icon for insight type
 */
function InsightIcon({ type }: { type: FrontendComparisonInsight["icon"] }) {
  switch (type) {
    case "trophy":
      return <Trophy className="h-4 w-4 text-amber-500" />;
    case "scale":
      return <Scale className="h-4 w-4 text-blue-500" />;
    default:
      return <Info className="text-muted-foreground h-4 w-4" />;
  }
}

export function ScenarioComparison({ scenarios, onClose }: ScenarioComparisonProps) {
  const compareMutation = useCompareScenarios();

  // Call API when scenarios change and there are at least 2 scenarios
  React.useEffect(() => {
    if (scenarios.length < 2) return;

    // Transform scenarios to API format
    const apiScenarios = scenarios.map((s) => ({
      name: s.name,
      results: {
        net_outcome: s.results.netOutcome,
        final_payout_value: s.results.finalPayoutValue,
        final_opportunity_cost: s.results.finalOpportunityCost,
        breakeven: s.results.breakeven ?? null,
      },
      equity: {
        monthly_salary: s.equity.monthlySalary,
      },
    }));

    compareMutation.mutate({ scenarios: apiScenarios });
  }, [scenarios, compareMutation]);

  // Transform API response to frontend format
  const winner: FrontendWinnerResult | null = React.useMemo(() => {
    if (!compareMutation.data) return null;
    return transformWinnerResult(compareMutation.data.winner);
  }, [compareMutation.data]);

  const diffs: FrontendMetricDiff[] = React.useMemo(() => {
    if (!compareMutation.data) return [];
    return compareMutation.data.metric_diffs.map(transformMetricDiff);
  }, [compareMutation.data]);

  const insights: FrontendComparisonInsight[] = React.useMemo(() => {
    if (!compareMutation.data) return [];
    return compareMutation.data.insights.map(transformComparisonInsight);
  }, [compareMutation.data]);

  if (scenarios.length === 0) {
    return null;
  }

  // Show loading state for comparison data
  const isLoadingComparison = scenarios.length >= 2 && compareMutation.isPending;

  // Find best net outcome for highlighting
  const netOutcomes = scenarios.map((s) => s.results.netOutcome);
  const bestNetOutcome = Math.max(...netOutcomes);
  const netOutcomeDiff = diffs.find((d) => d.metric === "netOutcome");

  return (
    <Card className="terminal-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Scenario Comparison</CardTitle>
            <CardDescription className="text-muted-foreground mt-1 text-sm">
              Comparing {scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {scenarios.length >= 2 && !isLoadingComparison && (
              <Button
                onClick={() => {
                  const comparisonData: ComparisonDataForExport = {
                    winner,
                    diffs,
                    insights,
                  };
                  exportScenarioComparisonPDF(scenarios, comparisonData);
                }}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export PDF
              </Button>
            )}
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="icon-sm">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Loading State */}
        {isLoadingComparison && (
          <div className="text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Calculating comparison...</span>
          </div>
        )}

        {/* Winner Badge Section */}
        {!isLoadingComparison && winner && !winner.isTie && winner.netOutcomeAdvantage > 0 && (
          <motion.div
            className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4"
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <motion.div
              initial={{ rotate: -15, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 15, delay: 0.1 }}
            >
              <Trophy className="h-6 w-6 text-amber-500" data-testid="trophy-icon" />
            </motion.div>
            <div>
              <div className="text-foreground flex items-center gap-2 font-semibold">
                {winner.winnerName}
                <Badge className="border-amber-500/30 bg-amber-500/20 text-amber-600 hover:bg-amber-500/30">
                  Best Choice
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                Net outcome is {formatCurrency(winner.netOutcomeAdvantage)} more than other options
                {netOutcomeDiff && netOutcomeDiff.percentageDiff > 0 && (
                  <span className="text-terminal ml-1 font-medium">
                    (+{netOutcomeDiff.percentageDiff.toFixed(0)}%)
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}

        {/* Insights Section */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-muted-foreground text-sm font-semibold tracking-wider uppercase">
              Key Insights
            </h4>
            <motion.div
              className="grid gap-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.1 },
                },
              }}
            >
              {insights.map((insight, idx) => (
                <motion.div
                  key={idx}
                  className="bg-secondary/50 flex items-start gap-3 rounded-lg p-3"
                  variants={{
                    hidden: { opacity: 0, x: -15 },
                    visible: { opacity: 1, x: 0 },
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <InsightIcon type={insight.icon} />
                  <div>
                    <p className="text-foreground text-sm font-medium">{insight.title}</p>
                    <p className="text-muted-foreground text-xs">{insight.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        )}

        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Comparison Table */}
            <table className="w-full border-collapse text-sm tabular-nums">
              <thead className="bg-secondary/80 sticky top-0 backdrop-blur-sm">
                <tr>
                  <th className="text-muted-foreground border-border border-b px-4 py-3 text-left text-xs font-medium tracking-wider uppercase">
                    Metric
                  </th>
                  {scenarios.map((scenario, idx) => (
                    <th
                      key={`header-${idx}`}
                      className="text-muted-foreground border-border min-w-[200px] border-b px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                    >
                      <div className="flex items-center gap-2">
                        {scenario.name}
                        {winner && scenario.name === winner.winnerName && !winner.isTie && (
                          <Trophy className="h-3 w-3 text-amber-500" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-border/50 divide-y">
                {/* Saved Date */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Saved</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`saved-${idx}`} className="px-4 py-3">
                      {new Date(scenario.timestamp).toLocaleDateString()}
                    </td>
                  ))}
                </tr>

                {/* Equity Type */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Equity Type</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`equity-type-${idx}`} className="px-4 py-3">
                      <Badge variant="outline" className="text-xs">
                        {scenario.equity.type === "RSU" ? "RSU" : "Options"}
                      </Badge>
                    </td>
                  ))}
                </tr>

                {/* Exit Year */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Exit Year</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`exit-year-${idx}`} className="px-4 py-3">
                      Year {scenario.globalSettings.exitYear}
                    </td>
                  ))}
                </tr>

                {/* Section Divider */}
                <tr>
                  <td colSpan={scenarios.length + 1} className="px-4 py-2">
                    <div className="text-accent text-xs font-semibold tracking-wider uppercase">
                      Current Job
                    </div>
                  </td>
                </tr>

                {/* Current Job Salary */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Monthly Salary</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`current-salary-${idx}`} className="px-4 py-3 tabular-nums">
                      {formatCurrency(scenario.currentJob.monthlySalary)}
                    </td>
                  ))}
                </tr>

                {/* Growth Rate */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Growth Rate</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`growth-rate-${idx}`} className="px-4 py-3 tabular-nums">
                      {scenario.currentJob.annualGrowthRate.toFixed(1)}%
                    </td>
                  ))}
                </tr>

                {/* ROI */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Assumed ROI</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`roi-${idx}`} className="px-4 py-3 tabular-nums">
                      {scenario.currentJob.assumedROI.toFixed(1)}%
                    </td>
                  ))}
                </tr>

                {/* Section Divider */}
                <tr>
                  <td colSpan={scenarios.length + 1} className="px-4 py-2">
                    <div className="text-accent text-xs font-semibold tracking-wider uppercase">
                      Startup Offer
                    </div>
                  </td>
                </tr>

                {/* Startup Salary */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Monthly Salary</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`startup-salary-${idx}`} className="px-4 py-3 tabular-nums">
                      {formatCurrency(scenario.equity.monthlySalary)}
                    </td>
                  ))}
                </tr>

                {/* Vesting Period */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Vesting Period</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`vesting-${idx}`} className="px-4 py-3 tabular-nums">
                      {scenario.equity.vestingPeriod} years
                    </td>
                  ))}
                </tr>

                {/* Cliff Period */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Cliff Period</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`cliff-${idx}`} className="px-4 py-3 tabular-nums">
                      {scenario.equity.cliffPeriod} years
                    </td>
                  ))}
                </tr>

                {/* RSU Specific Fields */}
                {scenarios.some((s) => s.equity.type === "RSU") && (
                  <>
                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="text-muted-foreground px-4 py-3 font-medium">
                        Equity Grant %
                      </td>
                      {scenarios.map((scenario, idx) => (
                        <td key={`equity-pct-${idx}`} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "RSU" && scenario.equity.equityPct
                            ? `${scenario.equity.equityPct.toFixed(3)}%`
                            : "N/A"}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="text-muted-foreground px-4 py-3 font-medium">
                        Exit Valuation
                      </td>
                      {scenarios.map((scenario, idx) => (
                        <td key={`exit-val-${idx}`} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "RSU" && scenario.equity.exitValuation
                            ? formatCurrency(scenario.equity.exitValuation)
                            : "N/A"}
                        </td>
                      ))}
                    </tr>
                  </>
                )}

                {/* Options Specific Fields */}
                {scenarios.some((s) => s.equity.type === "STOCK_OPTIONS") && (
                  <>
                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="text-muted-foreground px-4 py-3 font-medium">
                        Number of Options
                      </td>
                      {scenarios.map((scenario, idx) => (
                        <td key={`num-options-${idx}`} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "STOCK_OPTIONS" && scenario.equity.numOptions
                            ? scenario.equity.numOptions.toLocaleString()
                            : "N/A"}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="text-muted-foreground px-4 py-3 font-medium">Strike Price</td>
                      {scenarios.map((scenario, idx) => (
                        <td key={`strike-${idx}`} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "STOCK_OPTIONS" && scenario.equity.strikePrice
                            ? formatCurrency(scenario.equity.strikePrice)
                            : "N/A"}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="text-muted-foreground px-4 py-3 font-medium">
                        Exit Price/Share
                      </td>
                      {scenarios.map((scenario, idx) => (
                        <td key={`exit-price-${idx}`} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "STOCK_OPTIONS" &&
                          scenario.equity.exitPricePerShare
                            ? formatCurrency(scenario.equity.exitPricePerShare)
                            : "N/A"}
                        </td>
                      ))}
                    </tr>
                  </>
                )}

                {/* Section Divider */}
                <tr>
                  <td colSpan={scenarios.length + 1} className="px-4 py-2">
                    <div className="text-accent text-xs font-semibold tracking-wider uppercase">
                      Results
                    </div>
                  </td>
                </tr>

                {/* Final Payout */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Final Payout</td>
                  {scenarios.map((scenario, idx) => {
                    const payoutDiff = diffs.find((d) => d.metric === "finalPayoutValue");
                    const isBest = payoutDiff?.betterScenario === scenario.name;
                    return (
                      <td key={`payout-${idx}`} className="px-4 py-3 font-semibold tabular-nums">
                        <span className={isBest ? "text-terminal" : ""}>
                          {formatCurrency(scenario.results.finalPayoutValue)}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Opportunity Cost */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Opportunity Cost</td>
                  {scenarios.map((scenario, idx) => {
                    const costDiff = diffs.find((d) => d.metric === "finalOpportunityCost");
                    const isBest = costDiff?.betterScenario === scenario.name;
                    return (
                      <td key={`cost-${idx}`} className="px-4 py-3 font-semibold tabular-nums">
                        <span className={isBest ? "text-terminal" : ""}>
                          {formatCurrency(scenario.results.finalOpportunityCost)}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Net Outcome - with visual diff */}
                <tr className="hover:bg-secondary/30 bg-accent/5 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Net Outcome</td>
                  {scenarios.map((scenario, idx) => {
                    const isPositive = scenario.results.netOutcome >= 0;
                    const isBest = scenario.results.netOutcome === bestNetOutcome;
                    const showDiff =
                      scenarios.length >= 2 &&
                      isBest &&
                      netOutcomeDiff &&
                      netOutcomeDiff.percentageDiff > 0;

                    return (
                      <td key={`net-${idx}`} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <TrendingUp
                              className="text-terminal h-4 w-4"
                              data-testid={isBest ? "trend-up" : undefined}
                            />
                          ) : (
                            <TrendingDown className="text-destructive h-4 w-4" />
                          )}
                          <span
                            className={`font-semibold tabular-nums ${isBest || isPositive ? "text-terminal" : "text-destructive"}`}
                            data-testid={isBest ? "best-net-outcome" : undefined}
                          >
                            {formatCurrency(scenario.results.netOutcome)}
                          </span>
                          {showDiff && (
                            <span className="text-terminal text-xs font-medium">
                              +{netOutcomeDiff.percentageDiff.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
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
                      </td>
                    );
                  })}
                </tr>

                {/* Breakeven */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="text-muted-foreground px-4 py-3 font-medium">Break-Even</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`breakeven-${idx}`} className="px-4 py-3 tabular-nums">
                      {scenario.results.breakeven}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
