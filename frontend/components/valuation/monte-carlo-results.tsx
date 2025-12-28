"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency, formatLargeNumber } from "@/lib/format-utils";
import { useChartColors, CHART_TOOLTIP_STYLES } from "@/lib/hooks/use-chart-colors";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface MonteCarloResultData {
  mean: number;
  std: number;
  min: number;
  max: number;
  percentile_10: number;
  percentile_25: number;
  percentile_50: number;
  percentile_75: number;
  percentile_90: number;
  histogram_bins: number[];
  histogram_counts: number[];
}

interface MonteCarloResultsProps {
  result: MonteCarloResultData;
  /** Optional simulation progress (0-1), shown while simulation is running */
  progress?: number;
  /** Whether the simulation is currently running */
  isRunning?: boolean;
}

interface PercentileRowProps {
  percentile: string;
  value: number;
  interpretation: string;
  isHighlighted?: boolean;
}

function PercentileRow({ percentile, value, interpretation, isHighlighted }: PercentileRowProps) {
  return (
    <tr className={`border-b ${isHighlighted ? "bg-muted/50" : ""}`}>
      <td className={`py-2 ${isHighlighted ? "font-medium" : ""}`}>{percentile}</td>
      <td className={`py-2 text-right font-mono ${isHighlighted ? "font-medium" : ""}`}>
        {formatCurrency(value)}
      </td>
      <td className="text-muted-foreground py-2 text-right">{interpretation}</td>
    </tr>
  );
}

export function MonteCarloResults({ result, progress, isRunning }: MonteCarloResultsProps) {
  const chartColors = useChartColors();

  // Prepare histogram data for Recharts with bounds checking
  const bins = result.histogram_bins ?? [];
  const counts = result.histogram_counts ?? [];
  // We can only form a bin when we have both a start and an end boundary
  const pairCount = Math.min(counts.length, Math.max(0, bins.length - 1));
  const histogramData = Array.from({ length: pairCount }, (_, i) => ({
    binCenter: (bins[i] + bins[i + 1]) / 2,
    binStart: bins[i],
    binEnd: bins[i + 1],
    count: counts[i],
  }));

  // Find max count for Y-axis scaling (handle empty/mismatched data safely)
  const maxCount = counts.length ? Math.max(...counts) : 0;

  return (
    <div className="space-y-6">
      {/* Progress indicator while running */}
      {isRunning && progress !== undefined && (
        <Card>
          <CardContent className="py-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Running simulation...</span>
                <span className="font-mono">{Math.round(progress * 100)}%</span>
              </div>
              <Progress value={progress * 100} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Statistics Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-normal">
              Expected Value (Mean)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(result.mean)}</p>
            <p className="text-muted-foreground text-xs">± {formatCurrency(result.std)} std dev</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-normal">
              Conservative (10th %ile)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              {formatCurrency(result.percentile_10)}
            </p>
            <p className="text-muted-foreground text-xs">90% chance of exceeding this</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-normal">
              Optimistic (90th %ile)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(result.percentile_90)}
            </p>
            <p className="text-muted-foreground text-xs">10% chance of exceeding this</p>
          </CardContent>
        </Card>
      </div>

      {/* Histogram Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Valuation Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="binCenter"
                  tickFormatter={(val) => formatLargeNumber(val)}
                  tick={{ fill: chartColors.foreground, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: chartColors.foreground, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, maxCount * 1.1]}
                />
                <Tooltip
                  {...CHART_TOOLTIP_STYLES}
                  formatter={(value: number) => [value.toLocaleString(), "Simulations"]}
                  labelFormatter={(label: number) => `Valuation: ${formatCurrency(label)}`}
                />
                <Bar dataKey="count" fill={chartColors.chart1} radius={[2, 2, 0, 0]} />

                {/* Percentile reference lines */}
                <ReferenceLine
                  x={result.percentile_10}
                  stroke={chartColors.destructive}
                  strokeDasharray="4 4"
                  label={{
                    value: "P10",
                    position: "top",
                    fill: chartColors.destructive,
                    fontSize: 11,
                  }}
                />
                <ReferenceLine
                  x={result.percentile_50}
                  stroke={chartColors.chart2}
                  strokeWidth={2}
                  label={{
                    value: "P50",
                    position: "top",
                    fill: chartColors.chart2,
                    fontSize: 11,
                    fontWeight: "bold",
                  }}
                />
                <ReferenceLine
                  x={result.percentile_90}
                  stroke={chartColors.chart3}
                  strokeDasharray="4 4"
                  label={{
                    value: "P90",
                    position: "top",
                    fill: chartColors.chart3,
                    fontSize: 11,
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-muted-foreground mt-2 text-center text-xs">
            P10, P50, P90 indicate 10th, 50th, and 90th percentiles
          </p>
        </CardContent>
      </Card>

      {/* Percentile Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Percentile Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Percentile</th>
                  <th className="py-2 text-right font-medium">Valuation</th>
                  <th className="py-2 text-right font-medium">Interpretation</th>
                </tr>
              </thead>
              <tbody>
                <PercentileRow
                  percentile="10th"
                  value={result.percentile_10}
                  interpretation="Pessimistic"
                />
                <PercentileRow
                  percentile="25th"
                  value={result.percentile_25}
                  interpretation="Conservative"
                />
                <PercentileRow
                  percentile="50th (Median)"
                  value={result.percentile_50}
                  interpretation="Most Likely"
                  isHighlighted
                />
                <PercentileRow
                  percentile="75th"
                  value={result.percentile_75}
                  interpretation="Optimistic"
                />
                <PercentileRow
                  percentile="90th"
                  value={result.percentile_90}
                  interpretation="Best Case"
                />
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Range Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Value Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs">Minimum</p>
              <p className="font-mono text-lg">{formatCurrency(result.min)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Maximum</p>
              <p className="font-mono text-lg">{formatCurrency(result.max)}</p>
            </div>
          </div>
          <div className="mt-4 border-t pt-4">
            <p className="text-muted-foreground text-xs">80% Confidence Interval (P10-P90)</p>
            <p className="font-mono text-lg">
              {formatCurrency(result.percentile_10)} — {formatCurrency(result.percentile_90)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
