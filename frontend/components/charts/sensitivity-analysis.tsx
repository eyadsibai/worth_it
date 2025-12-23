"use client";

import * as React from "react";
import { AlertTriangle, TrendingUp, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TornadoChart } from "./tornado-chart";
import { formatCurrencyCompact } from "@/lib/format-utils";
import type { SensitivityDataPoint, BreakevenThreshold } from "@/lib/sensitivity-utils";

interface SensitivityAnalysisProps {
  data: SensitivityDataPoint[];
  breakeven: BreakevenThreshold[];
  currentOutcome: number;
  title?: string;
}

/**
 * Sensitivity Analysis component displaying:
 * - Tornado chart showing variable impacts
 * - Breakeven threshold warnings
 * - Key insights about most impactful variables
 */
export function SensitivityAnalysis({
  data,
  breakeven,
  currentOutcome,
  title = "Sensitivity Analysis",
}: SensitivityAnalysisProps) {
  // Empty state
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Analyze how different variables affect your outcome</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-48 items-center justify-center">
            No sensitivity data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get most impactful variable (data is already sorted by impact)
  const mostImpactful = data[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>How each variable affects your net outcome</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Baseline context */}
        <div className="bg-muted/50 flex items-center justify-between rounded-lg p-4">
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Baseline Outcome
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatCurrencyCompact(currentOutcome)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              Variables Analyzed
            </p>
            <p className="text-2xl font-semibold tabular-nums">{data.length}</p>
          </div>
        </div>

        {/* Key insight */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Most Impactful Variable</AlertTitle>
          <AlertDescription>
            <span className="font-medium">{mostImpactful.variable}</span> has the largest impact on
            your outcome, with a potential swing of{" "}
            <span className="font-medium tabular-nums">
              {formatCurrencyCompact(mostImpactful.impact)}
            </span>{" "}
            between pessimistic and optimistic scenarios.
          </AlertDescription>
        </Alert>

        {/* Breakeven warnings */}
        {breakeven.length > 0 && (
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="text-warning h-4 w-4" />
              Breakeven Thresholds
            </h4>
            {breakeven.map((threshold, idx) => (
              <Alert key={idx} variant="destructive" className="bg-destructive/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{threshold.variable}</AlertTitle>
                <AlertDescription>
                  {threshold.description}
                  <br />
                  <span className="font-medium tabular-nums">
                    Threshold:{" "}
                    {threshold.unit === "$"
                      ? formatCurrencyCompact(threshold.threshold)
                      : `${threshold.threshold.toFixed(threshold.unit === "%" ? 1 : 0)}${threshold.unit}`}
                  </span>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Tornado chart */}
        <div>
          <h4 className="mb-4 text-sm font-semibold">Impact Analysis</h4>
          <TornadoChart data={data} height={Math.max(200, data.length * 50)} showImpactLabels />
        </div>

        {/* Impact summary table */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold" id="sensitivity-table-heading">
            Variable Impact Summary
          </h4>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm" aria-labelledby="sensitivity-table-heading">
              <caption className="sr-only">
                Sensitivity analysis showing how each variable impacts the net outcome
              </caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="p-3 text-left font-medium">
                    Variable
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Low Scenario
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    High Scenario
                  </th>
                  <th scope="col" className="p-3 text-right font-medium">
                    Range
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr key={idx} className="border-border border-t">
                    <td className="p-3">{item.variable}</td>
                    <td className="text-destructive p-3 text-right tabular-nums">
                      {formatCurrencyCompact(item.low)}
                    </td>
                    <td className="p-3 text-right text-green-600 tabular-nums">
                      {formatCurrencyCompact(item.high)}
                    </td>
                    <td className="p-3 text-right font-medium tabular-nums">
                      {formatCurrencyCompact(item.impact)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
