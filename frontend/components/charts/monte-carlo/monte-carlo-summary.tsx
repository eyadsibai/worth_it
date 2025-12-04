"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonteCarloStats } from "./types";
import { formatCurrency } from "./utils";

interface MonteCarloSummaryProps {
  stats: MonteCarloStats;
  simulationCount: number;
}

export function MonteCarloSummary({ stats, simulationCount }: MonteCarloSummaryProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Risk Assessment</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Expected Value</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(stats.mean)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Average outcome across all simulations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Success Probability</CardDescription>
              <CardTitle className="text-2xl text-primary">
                {stats.positiveRate.toFixed(1)}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Chance of positive net outcome
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Risk (Std Dev)</CardDescription>
              <CardTitle className="text-2xl">{formatCurrency(stats.std)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Variability of outcomes
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Key Insights</h3>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Best Case (90th percentile):</strong> {formatCurrency(stats.p90)}
          </p>
          <p>
            <strong>Median Scenario:</strong> {formatCurrency(stats.median)}
          </p>
          <p>
            <strong>Worst Case (10th percentile):</strong> {formatCurrency(stats.p10)}
          </p>
          <p>
            <strong>Range:</strong> {formatCurrency(stats.min)} to {formatCurrency(stats.max)}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">Interpretation</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            The Monte Carlo simulation ran {simulationCount.toLocaleString()} scenarios to account for
            uncertainty in exit valuations and salary growth rates.
          </p>
          {stats.positiveRate >= 70 ? (
            <p className="text-primary font-medium">
              With {stats.positiveRate.toFixed(1)}% probability of success, this opportunity
              shows strong potential for positive returns.
            </p>
          ) : stats.positiveRate >= 50 ? (
            <p className="text-yellow-600 dark:text-yellow-500 font-medium">
              With {stats.positiveRate.toFixed(1)}% success probability, this is a moderate-risk
              opportunity. Consider your risk tolerance.
            </p>
          ) : (
            <p className="text-destructive font-medium">
              With only {stats.positiveRate.toFixed(1)}% success probability, this opportunity
              carries significant risk. Proceed with caution.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
