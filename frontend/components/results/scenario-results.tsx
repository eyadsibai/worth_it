"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Percent } from "lucide-react";
import type { StartupScenarioResponse } from "@/lib/schemas";
import { CumulativeComparisonChart } from "@/components/charts/cumulative-comparison-chart";
import { OpportunityCostChart } from "@/components/charts/opportunity-cost-chart";

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
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {/* Final Payout */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Final Payout</CardDescription>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-2xl">
                {formatCurrency(results.final_payout_value)}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">{results.payout_label}</p>
          </CardContent>
        </Card>

        {/* Opportunity Cost */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Opportunity Cost</CardDescription>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-2xl">
                {formatCurrency(results.final_opportunity_cost)}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From current job alternative
            </p>
          </CardContent>
        </Card>

        {/* Net Benefit */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Net Benefit</CardDescription>
            <div className="flex items-center gap-2">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <CardTitle
                className={`text-2xl ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(netBenefit)}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant={isPositive ? "default" : "destructive"}>
              {isPositive ? "Worth It" : "Not Worth It"}
            </Badge>
          </CardContent>
        </Card>

        {/* Dilution (if applicable) */}
        {results.total_dilution !== null && results.total_dilution !== undefined && (
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Dilution</CardDescription>
              <div className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-2xl">
                  {(results.total_dilution * 100).toFixed(2)}%
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Final equity: {((results.diluted_equity_pct || 0) * 100).toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        )}

        {/* Break-Even */}
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Break-Even Point</CardDescription>
            <CardTitle className="text-2xl">
              {results.breakeven_label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Required to match opportunity cost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analysis</CardTitle>
          <CardDescription>
            Explore yearly breakdown and visualizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table">
            <TabsList>
              <TabsTrigger value="table">Yearly Breakdown</TabsTrigger>
              <TabsTrigger value="charts">Charts</TabsTrigger>
              {monteCarloContent && <TabsTrigger value="monte-carlo">Monte Carlo</TabsTrigger>}
            </TabsList>

            <TabsContent value="table" className="space-y-4">
              <div className="rounded-md border">
                <div className="max-h-[600px] overflow-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">Year</th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          Startup Salary
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          Current Job Salary
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          Difference
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          Cumulative Opportunity Cost
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.results_df.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-t transition-colors hover:bg-muted/50"
                        >
                          <td className="px-4 py-3 text-sm">{row.year || idx + 1}</td>
                          <td className="px-4 py-3 text-right text-sm">
                            {formatCurrency(row.startup_monthly_salary || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {formatCurrency(row.current_job_monthly_salary || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {formatCurrency(row.monthly_surplus || 0)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm">
                            {formatCurrency(row.cumulative_opportunity_cost || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="charts" className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Salary Comparison</h3>
                <p className="text-sm text-muted-foreground">
                  Monthly salary comparison between startup and current job over time
                </p>
                <div className="rounded-lg border bg-card p-4">
                  <CumulativeComparisonChart data={results.results_df} />
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Opportunity Cost Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Cumulative opportunity cost and annual surplus/deficit over time
                </p>
                <div className="rounded-lg border bg-card p-4">
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

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}
