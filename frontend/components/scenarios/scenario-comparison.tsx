"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, TrendingUp, TrendingDown } from "lucide-react";
import { type ScenarioData } from "@/lib/export-utils";
import { formatCurrency } from "@/lib/format-utils";

interface ScenarioComparisonProps {
  scenarios: ScenarioData[];
  onClose?: () => void;
}

export function ScenarioComparison({ scenarios, onClose }: ScenarioComparisonProps) {
  if (scenarios.length === 0) {
    return null;
  }

  return (
    <Card className="terminal-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <span className="text-accent font-mono">&gt;</span>
              Scenario Comparison
            </CardTitle>
            <CardDescription className="text-sm font-mono text-muted-foreground mt-1">
              Comparing {scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""}
            </CardDescription>
          </div>
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
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            {/* Comparison Table */}
            <table className="w-full font-mono text-sm border-collapse">
              <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-muted-foreground border-b border-border">
                    Metric
                  </th>
                  {scenarios.map((scenario) => (
                    <th
                      key={scenario.timestamp}
                      className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-muted-foreground border-b border-border min-w-[200px]"
                    >
                      {scenario.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {/* Saved Date */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Saved</td>
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3">
                      {new Date(scenario.timestamp).toLocaleDateString()}
                    </td>
                  ))}
                </tr>

                {/* Equity Type */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Equity Type</td>
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3">
                      <Badge variant="outline" className="font-mono text-xs">
                        {scenario.equity.type === "RSU" ? "RSU" : "Options"}
                      </Badge>
                    </td>
                  ))}
                </tr>

                {/* Exit Year */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Exit Year</td>
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3">
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
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
                      {formatCurrency(scenario.currentJob.monthlySalary)}
                    </td>
                  ))}
                </tr>

                {/* Growth Rate */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Growth Rate</td>
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
                      {scenario.currentJob.annualGrowthRate.toFixed(1)}%
                    </td>
                  ))}
                </tr>

                {/* ROI */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Assumed ROI</td>
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
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
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
                      {formatCurrency(scenario.equity.monthlySalary)}
                    </td>
                  ))}
                </tr>

                {/* Vesting Period */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Vesting Period</td>
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
                      {scenario.equity.vestingPeriod} years
                    </td>
                  ))}
                </tr>

                {/* Cliff Period */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Cliff Period</td>
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
                      {scenario.equity.cliffPeriod} years
                    </td>
                  ))}
                </tr>

                {/* RSU Specific Fields */}
                {scenarios.some((s) => s.equity.type === "RSU") && (
                  <>
                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-muted-foreground">Equity Grant %</td>
                      {scenarios.map((scenario) => (
                        <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "RSU" && scenario.equity.equityPct
                            ? `${scenario.equity.equityPct.toFixed(3)}%`
                            : "N/A"}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-muted-foreground">Exit Valuation</td>
                      {scenarios.map((scenario) => (
                        <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
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
                      {scenarios.map((scenario) => (
                        <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "STOCK_OPTIONS" && scenario.equity.numOptions
                            ? scenario.equity.numOptions.toLocaleString()
                            : "N/A"}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-muted-foreground">Strike Price</td>
                      {scenarios.map((scenario) => (
                        <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
                          {scenario.equity.type === "STOCK_OPTIONS" && scenario.equity.strikePrice
                            ? formatCurrency(scenario.equity.strikePrice)
                            : "N/A"}
                        </td>
                      ))}
                    </tr>

                    <tr className="hover:bg-secondary/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-muted-foreground">Exit Price/Share</td>
                      {scenarios.map((scenario) => (
                        <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
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
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3 tabular-nums font-semibold">
                      {formatCurrency(scenario.results.finalPayoutValue)}
                    </td>
                  ))}
                </tr>

                {/* Opportunity Cost */}
                <tr className="hover:bg-secondary/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Opportunity Cost</td>
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3 tabular-nums font-semibold">
                      {formatCurrency(scenario.results.finalOpportunityCost)}
                    </td>
                  ))}
                </tr>

                {/* Net Outcome */}
                <tr className="hover:bg-secondary/30 transition-colors bg-accent/5">
                  <td className="px-4 py-3 font-medium text-muted-foreground">Net Outcome</td>
                  {scenarios.map((scenario) => {
                    const isPositive = scenario.results.netOutcome >= 0;
                    return (
                      <td key={scenario.timestamp} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4 text-terminal" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                          <span className={`font-semibold tabular-nums ${isPositive ? "text-terminal" : "text-destructive"}`}>
                            {formatCurrency(scenario.results.netOutcome)}
                          </span>
                        </div>
                        <div className="mt-1">
                          <Badge
                            variant={isPositive ? "default" : "destructive"}
                            className={isPositive ? "bg-terminal/15 text-terminal hover:bg-terminal/20 border border-terminal/30 font-mono text-xs" : "font-mono text-xs"}
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
                  {scenarios.map((scenario) => (
                    <td key={scenario.timestamp} className="px-4 py-3 tabular-nums">
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
