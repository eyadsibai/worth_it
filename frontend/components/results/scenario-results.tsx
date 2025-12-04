"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { StartupScenarioResponse } from "@/lib/schemas";
import { CumulativeComparisonChart } from "@/components/charts/cumulative-comparison-chart";
import { OpportunityCostChart } from "@/components/charts/opportunity-cost-chart";
import { formatCurrency } from "@/lib/format-utils";

interface ScenarioResultsProps {
  results: StartupScenarioResponse;
  isLoading?: boolean;
  monteCarloContent?: React.ReactNode;
}

export function ScenarioResults({ results, isLoading, monteCarloContent }: ScenarioResultsProps) {
  if (isLoading) {
    return (
      <Card className="terminal-card">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-muted-foreground font-mono text-sm">Processing...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const netBenefit = results.final_payout_value - results.final_opportunity_cost;
  const isPositive = netBenefit >= 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Key Metrics Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        {/* Final Payout */}
        <Card className="terminal-card">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="data-label">Final Payout</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <CardTitle className="data-value text-foreground">
              {formatCurrency(results.final_payout_value)}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{results.payout_label}</p>
          </CardContent>
        </Card>

        {/* Opportunity Cost */}
        <Card className="terminal-card">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="data-label">Opportunity Cost</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <CardTitle className="data-value text-foreground">
              {formatCurrency(results.final_opportunity_cost)}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Current job alternative</p>
          </CardContent>
        </Card>

        {/* Net Benefit */}
        <Card className={`terminal-card ${isPositive ? "border-terminal/40" : "border-destructive/40"}`}>
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="data-label">Net Benefit</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-terminal" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <CardTitle className={`data-value ${isPositive ? "metric-positive" : "metric-negative"}`}>
                {formatCurrency(netBenefit)}
              </CardTitle>
            </div>
            <div className="mt-2">
              <Badge
                variant={isPositive ? "default" : "destructive"}
                className={isPositive ? "bg-terminal/15 text-terminal hover:bg-terminal/20 border border-terminal/30 font-mono text-xs" : "font-mono text-xs"}
              >
                {isPositive ? "WORTH IT" : "NOT WORTH IT"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Dilution (if applicable) */}
        {results.total_dilution !== null && results.total_dilution !== undefined && (
          <Card className="terminal-card">
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="data-label">Total Dilution</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <CardTitle className="data-value text-foreground">
                {(results.total_dilution * 100).toFixed(2)}%
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Final: {((results.diluted_equity_pct || 0) * 100).toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        )}

        {/* Break-Even */}
        <Card className="terminal-card">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="data-label">Break-Even</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <CardTitle className="text-lg font-mono font-semibold text-foreground">
              {results.breakeven_label}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Required to match cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results Tabs */}
      <Card className="terminal-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <span className="text-accent font-mono">&gt;</span>
            Detailed Analysis
          </CardTitle>
          <CardDescription className="text-sm font-mono text-muted-foreground">
            Yearly breakdown and visualizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="mb-4 bg-secondary/50 border border-border">
              <TabsTrigger value="table" className="text-sm font-mono data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
                table
              </TabsTrigger>
              <TabsTrigger value="charts" className="text-sm font-mono data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
                charts
              </TabsTrigger>
              {monteCarloContent && (
                <TabsTrigger value="monte-carlo" className="text-sm font-mono data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
                  monte_carlo
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="table" className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="max-h-[500px] overflow-auto">
                  <table className="w-full font-mono text-sm">
                    <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-muted-foreground">Year</th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium text-muted-foreground">
                          Startup
                        </th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium text-muted-foreground">
                          Current
                        </th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium text-muted-foreground">
                          Delta
                        </th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium text-muted-foreground">
                          Cumulative
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {results.results_df.map((row, idx) => (
                        <tr
                          key={idx}
                          className="transition-colors hover:bg-secondary/30"
                        >
                          <td className="px-4 py-3 font-medium text-accent">{row.year || idx + 1}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(row.startup_monthly_salary || 0)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(row.current_job_monthly_salary || 0)}
                          </td>
                          <td className={`px-4 py-3 text-right tabular-nums ${(row.monthly_surplus || 0) >= 0 ? "text-terminal" : "text-destructive"}`}>
                            {formatCurrency(row.monthly_surplus || 0)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
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
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <span className="text-accent font-mono text-sm">#</span>
                    Salary Comparison
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    Monthly salary over time
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <CumulativeComparisonChart data={results.results_df} />
                </div>
              </div>

              <div className="section-divider" />

              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <span className="text-accent font-mono text-sm">#</span>
                    Opportunity Cost
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    Cumulative cost analysis
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <OpportunityCostChart data={results.results_df} />
                </div>
              </div>
            </TabsContent>

            {monteCarloContent && (
              <TabsContent value="monte-carlo" className="space-y-6">
                {monteCarloContent}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
