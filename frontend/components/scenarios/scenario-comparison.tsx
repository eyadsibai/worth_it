"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, TrendingUp, TrendingDown, Trophy, Scale, Info, Download } from "lucide-react";
import { type ScenarioData, exportScenarioComparisonPDF } from "@/lib/export-utils";
import { formatCurrency } from "@/lib/format-utils";
import {
  identifyWinner,
  calculateMetricDiffs,
  generateComparisonInsights,
  type ComparisonInsight,
} from "@/lib/comparison-utils";

interface ScenarioComparisonProps {
  scenarios: ScenarioData[];
  onClose?: () => void;
}

/**
 * Get icon for insight type
 */
function InsightIcon({ type }: { type: ComparisonInsight["icon"] }) {
  switch (type) {
    case "trophy":
      return <Trophy className="h-4 w-4 text-amber-500" />;
    case "scale":
      return <Scale className="h-4 w-4 text-blue-500" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

export function ScenarioComparison({ scenarios, onClose }: ScenarioComparisonProps) {
  if (scenarios.length === 0) {
    return null;
  }

  // Calculate comparison metrics
  const winner = scenarios.length >= 2 ? identifyWinner(scenarios) : null;
  const diffs = scenarios.length >= 2 ? calculateMetricDiffs(scenarios) : [];
  const insights = scenarios.length >= 2 ? generateComparisonInsights(scenarios) : [];

  // Find best net outcome for highlighting
  const netOutcomes = scenarios.map((s) => s.results.netOutcome);
  const bestNetOutcome = Math.max(...netOutcomes);
  const netOutcomeDiff = diffs.find((d) => d.metric === "netOutcome");

  return (
    <Card className="terminal-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">
              Scenario Comparison
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              Comparing {scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {scenarios.length >= 2 && (
              <Button
                onClick={() => exportScenarioComparisonPDF(scenarios)}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export PDF
              </Button>
            )}
            {onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon-sm"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Winner Badge Section */}
        {winner && !winner.isTie && winner.netOutcomeAdvantage > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Trophy className="h-6 w-6 text-amber-500" data-testid="trophy-icon" />
            <div>
              <div className="font-semibold text-foreground flex items-center gap-2">
                {winner.winnerName}
                <Badge className="bg-amber-500/20 text-amber-600 hover:bg-amber-500/30 border-amber-500/30">
                  Best Choice
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Net outcome is {formatCurrency(winner.netOutcomeAdvantage)} more than other options
                {netOutcomeDiff && netOutcomeDiff.percentageDiff > 0 && (
                  <span className="ml-1 text-terminal font-medium">
                    (+{netOutcomeDiff.percentageDiff.toFixed(0)}%)
                  </span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Insights Section */}
        {insights.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Key Insights
            </h4>
            <div className="grid gap-2">
              {insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <InsightIcon type={insight.icon} />
                  <div>
                    <p className="font-medium text-sm text-foreground">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Comparison Table */}
            <table className="w-full text-sm border-collapse tabular-nums">
              <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-muted-foreground border-b border-border">
                    Metric
                  </th>
                  {scenarios.map((scenario, idx) => (
                    <th
                      key={`header-${idx}`}
                      className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-muted-foreground border-b border-border min-w-[200px]"
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
              <tbody className="divide-y divide-border/50">
                {/* Saved Date */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Saved</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`saved-${idx}`} className="px-4 py-3">
                      {new Date(scenario.timestamp).toLocaleDateString()}
                    </td>
                  ))}
                </tr>

                {/* Equity Type */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Equity Type</td>
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
                  <td className="px-4 py-3 font-medium text-muted-foreground">Exit Year</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`exit-year-${idx}`} className="px-4 py-3">
                      Year {scenario.globalSettings.exitYear}
                    </td>
                  ))}
                </tr>

                {/* Section Divider */}
                <tr>
                  <td colSpan={scenarios.length + 1} className="px-4 py-2">
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider">
                      Current Job
                    </div>
                  </td>
                </tr>

                {/* Current Job Salary */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Monthly Salary</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`current-salary-${idx}`} className="px-4 py-3 tabular-nums">
                      {formatCurrency(scenario.currentJob.monthlySalary)}
                    </td>
                  ))}
                </tr>

                {/* Growth Rate */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Growth Rate</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`growth-rate-${idx}`} className="px-4 py-3 tabular-nums">
                      {scenario.currentJob.annualGrowthRate.toFixed(1)}%
                    </td>
                  ))}
                </tr>

                {/* ROI */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Assumed ROI</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`roi-${idx}`} className="px-4 py-3 tabular-nums">
                      {scenario.currentJob.assumedROI.toFixed(1)}%
                    </td>
                  ))}
                </tr>

                {/* Section Divider */}
                <tr>
                  <td colSpan={scenarios.length + 1} className="px-4 py-2">
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider">
                      Startup Offer
                    </div>
                  </td>
                </tr>

                {/* Startup Salary */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Monthly Salary</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`startup-salary-${idx}`} className="px-4 py-3 tabular-nums">
                      {formatCurrency(scenario.equity.monthlySalary)}
                    </td>
                  ))}
                </tr>

                {/* Vesting Period */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Vesting Period</td>
                  {scenarios.map((scenario, idx) => (
                    <td key={`vesting-${idx}`} className="px-4 py-3 tabular-nums">
                      {scenario.equity.vestingPeriod} years
                    </td>
                  ))}
                </tr>

                {/* Cliff Period */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Cliff Period</td>
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
                      <td className="px-4 py-3 font-medium text-muted-foreground">Equity Grant %</td>
                      {scenarios.map((scenario, idx) => (
                        <td key={`equity-pct-${idx}`} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "RSU" && scenario.equity.equityPct
                            ? `${scenario.equity.equityPct.toFixed(3)}%`
                            : "N/A"}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-muted-foreground">Exit Valuation</td>
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
                      <td className="px-4 py-3 font-medium text-muted-foreground">Number of Options</td>
                      {scenarios.map((scenario, idx) => (
                        <td key={`num-options-${idx}`} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "STOCK_OPTIONS" && scenario.equity.numOptions
                            ? scenario.equity.numOptions.toLocaleString()
                            : "N/A"}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-muted-foreground">Strike Price</td>
                      {scenarios.map((scenario, idx) => (
                        <td key={`strike-${idx}`} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "STOCK_OPTIONS" && scenario.equity.strikePrice
                            ? formatCurrency(scenario.equity.strikePrice)
                            : "N/A"}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-muted-foreground">Exit Price/Share</td>
                      {scenarios.map((scenario, idx) => (
                        <td key={`exit-price-${idx}`} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "STOCK_OPTIONS" && scenario.equity.exitPricePerShare
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
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider">
                      Results
                    </div>
                  </td>
                </tr>

                {/* Final Payout */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Final Payout</td>
                  {scenarios.map((scenario, idx) => {
                    const payoutDiff = diffs.find((d) => d.metric === "finalPayoutValue");
                    const isBest = payoutDiff?.betterScenario === scenario.name;
                    return (
                      <td key={`payout-${idx}`} className="px-4 py-3 tabular-nums font-semibold">
                        <span className={isBest ? "text-terminal" : ""}>
                          {formatCurrency(scenario.results.finalPayoutValue)}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Opportunity Cost */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Opportunity Cost</td>
                  {scenarios.map((scenario, idx) => {
                    const costDiff = diffs.find((d) => d.metric === "finalOpportunityCost");
                    const isBest = costDiff?.betterScenario === scenario.name;
                    return (
                      <td key={`cost-${idx}`} className="px-4 py-3 tabular-nums font-semibold">
                        <span className={isBest ? "text-terminal" : ""}>
                          {formatCurrency(scenario.results.finalOpportunityCost)}
                        </span>
                      </td>
                    );
                  })}
                </tr>

                {/* Net Outcome - with visual diff */}
                <tr className="hover:bg-secondary/30 transition-colors bg-accent/5">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Net Outcome</td>
                  {scenarios.map((scenario, idx) => {
                    const isPositive = scenario.results.netOutcome >= 0;
                    const isBest = scenario.results.netOutcome === bestNetOutcome;
                    const showDiff = scenarios.length >= 2 && isBest && netOutcomeDiff && netOutcomeDiff.percentageDiff > 0;

                    return (
                      <td key={`net-${idx}`} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <TrendingUp
                              className="h-4 w-4 text-terminal"
                              data-testid={isBest ? "trend-up" : undefined}
                            />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                          <span
                            className={`font-semibold tabular-nums ${isBest || isPositive ? "text-terminal" : "text-destructive"}`}
                            data-testid={isBest ? "best-net-outcome" : undefined}
                          >
                            {formatCurrency(scenario.results.netOutcome)}
                          </span>
                          {showDiff && (
                            <span className="text-xs text-terminal font-medium">
                              +{netOutcomeDiff.percentageDiff.toFixed(0)}%
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          <Badge
                            variant={isPositive ? "default" : "destructive"}
                            className={isPositive ? "bg-terminal/15 text-terminal hover:bg-terminal/20 border border-terminal/30 text-xs" : "text-xs"}
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
                  <td className="px-4 py-3 font-medium text-muted-foreground">Break-Even</td>
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
