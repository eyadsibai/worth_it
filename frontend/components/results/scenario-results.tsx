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
      <Card>
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Calculating scenario...</p>
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
        <Card className="editorial-card">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs uppercase tracking-wide font-medium">Final Payout</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-baseline gap-2">
              <CardTitle className="text-2xl font-display data-highlight">
                {formatCurrency(results.final_payout_value)}
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{results.payout_label}</p>
          </CardContent>
        </Card>

        {/* Opportunity Cost */}
        <Card className="editorial-card">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs uppercase tracking-wide font-medium">Opportunity Cost</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-baseline gap-2">
              <CardTitle className="text-2xl font-display data-highlight">
                {formatCurrency(results.final_opportunity_cost)}
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">From current job alternative</p>
          </CardContent>
        </Card>

        {/* Net Benefit */}
        <Card className={`editorial-card ${isPositive ? "border-accent/40" : "border-destructive/40"}`}>
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs uppercase tracking-wide font-medium">Net Benefit</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-accent" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <CardTitle className={`text-2xl font-display data-highlight ${isPositive ? "text-accent" : "text-destructive"}`}>
                {formatCurrency(netBenefit)}
              </CardTitle>
            </div>
            <div className="mt-2">
              <Badge
                variant={isPositive ? "default" : "destructive"}
                className={isPositive ? "bg-accent/15 text-accent hover:bg-accent/20 border-accent/30" : ""}
              >
                {isPositive ? "Worth It" : "Not Worth It"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Dilution (if applicable) */}
        {results.total_dilution !== null && results.total_dilution !== undefined && (
          <Card className="editorial-card">
            <CardHeader className="pb-2 pt-4">
              <CardDescription className="text-xs uppercase tracking-wide font-medium">Total Dilution</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-baseline gap-2">
                <CardTitle className="text-2xl font-display data-highlight">
                  {(results.total_dilution * 100).toFixed(2)}%
                </CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Final equity: {((results.diluted_equity_pct || 0) * 100).toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        )}

        {/* Break-Even */}
        <Card className="editorial-card">
          <CardHeader className="pb-2 pt-4">
            <CardDescription className="text-xs uppercase tracking-wide font-medium">Break-Even</CardDescription>
          </CardHeader>
          <CardContent className="pb-4">
            <CardTitle className="text-xl font-display">
              {results.breakeven_label}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Required to match cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results Tabs */}
      <Card className="editorial-card">
        <CardHeader className="pb-4">
          <CardTitle className="font-display text-xl">Detailed Analysis</CardTitle>
          <CardDescription className="text-sm">
            Explore yearly breakdown and visualizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="mb-4 bg-muted/50">
              <TabsTrigger value="table" className="text-sm">Yearly Breakdown</TabsTrigger>
              <TabsTrigger value="charts" className="text-sm">Charts</TabsTrigger>
              {monteCarloContent && <TabsTrigger value="monte-carlo" className="text-sm">Monte Carlo</TabsTrigger>}
            </TabsList>

            <TabsContent value="table" className="space-y-4">
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <div className="max-h-[500px] overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wide font-medium text-muted-foreground">Year</th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-medium text-muted-foreground">
                          Startup
                        </th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-medium text-muted-foreground">
                          Current Job
                        </th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-medium text-muted-foreground">
                          Difference
                        </th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wide font-medium text-muted-foreground">
                          Cumulative Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {results.results_df.map((row, idx) => (
                        <tr
                          key={idx}
                          className="transition-colors hover:bg-muted/30"
                        >
                          <td className="px-4 py-3 text-sm font-medium">{row.year || idx + 1}</td>
                          <td className="px-4 py-3 text-right text-sm data-highlight">
                            {formatCurrency(row.startup_monthly_salary || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm data-highlight">
                            {formatCurrency(row.current_job_monthly_salary || 0)}
                          </td>
                          <td className={`px-4 py-3 text-right text-sm data-highlight ${(row.monthly_surplus || 0) >= 0 ? "text-accent" : "text-destructive"}`}>
                            {formatCurrency(row.monthly_surplus || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm data-highlight text-muted-foreground">
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
                  <h3 className="text-base font-display">Salary Comparison</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Monthly salary comparison over time
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card p-5">
                  <CumulativeComparisonChart data={results.results_df} />
                </div>
              </div>

              <div className="section-divider" />

              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-display">Opportunity Cost Analysis</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Cumulative opportunity cost and annual surplus/deficit
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-card p-5">
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
