"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface MonteCarloVisualizationsProps {
  netOutcomes: number[];
  simulatedValuations: number[];
}

// Format currency with compact notation (e.g., SAR 10K)
// Moved outside component to avoid recreation on each render
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);
};

export const MonteCarloVisualizations = React.memo(function MonteCarloVisualizations({
  netOutcomes,
  simulatedValuations,
}: MonteCarloVisualizationsProps) {
  // Calculate statistics
  const stats = React.useMemo(() => {
    const sorted = [...netOutcomes].sort((a, b) => a - b);
    const mean = netOutcomes.reduce((a, b) => a + b, 0) / netOutcomes.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const std = Math.sqrt(
      netOutcomes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / netOutcomes.length
    );
    const positiveCount = netOutcomes.filter((x) => x > 0).length;
    const positiveRate = (positiveCount / netOutcomes.length) * 100;

    return { mean, median, std, min, max, p10, p25, p75, p90, positiveRate };
  }, [netOutcomes]);

  // Prepare histogram data
  const histogramData = React.useMemo(() => {
    const bins = 30;
    const min = Math.min(...netOutcomes);
    const max = Math.max(...netOutcomes);
    const binWidth = (max - min) / bins;

    const histogram = Array.from({ length: bins }, (_, i) => ({
      bin: min + i * binWidth,
      count: 0,
      label: formatCurrency(min + i * binWidth),
    }));

    netOutcomes.forEach((value) => {
      const binIndex = Math.min(
        Math.floor((value - min) / binWidth),
        bins - 1
      );
      histogram[binIndex].count++;
    });

    return histogram;
  }, [netOutcomes]);

  // Prepare ECDF data
  const ecdfData = React.useMemo(() => {
    const sorted = [...netOutcomes].sort((a, b) => a - b);
    return sorted.map((value, index) => ({
      value,
      probability: ((index + 1) / sorted.length) * 100,
      label: formatCurrency(value),
    }));
  }, [netOutcomes]);

  // Prepare scatter data
  const scatterData = React.useMemo(() => {
    return netOutcomes.map((outcome, i) => ({
      valuation: simulatedValuations[i],
      outcome,
    }));
  }, [netOutcomes, simulatedValuations]);

  // Box plot data
  const boxPlotData = React.useMemo(() => {
    return [
      { name: "Min", value: stats.min },
      { name: "P10", value: stats.p10 },
      { name: "P25", value: stats.p25 },
      { name: "Median", value: stats.median },
      { name: "P75", value: stats.p75 },
      { name: "P90", value: stats.p90 },
      { name: "Max", value: stats.max },
    ];
  }, [stats]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monte Carlo Results</CardTitle>
        <CardDescription>
          Analysis of {netOutcomes.length.toLocaleString()} simulation scenarios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="histogram">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="histogram">Histogram</TabsTrigger>
            <TabsTrigger value="ecdf">ECDF</TabsTrigger>
            <TabsTrigger value="box">Box Plot</TabsTrigger>
            <TabsTrigger value="scatter">Scatter</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
            <TabsTrigger value="pdf">PDF</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
          </TabsList>

          {/* Histogram */}
          <TabsContent value="histogram" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Distribution of Net Outcomes</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Frequency distribution showing how often different outcomes occur
              </p>
              <div role="img" aria-label="Histogram showing distribution of net outcomes from Monte Carlo simulation">
                <ResponsiveContainer width="100%" height={400}>
                <BarChart data={histogramData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    label={{ value: "Frequency", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                    {histogramData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.bin >= 0 ? "hsl(var(--primary))" : "hsl(var(--destructive))"}
                      />
                    ))}
                  </Bar>
                  <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* ECDF */}
          <TabsContent value="ecdf" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Cumulative Distribution</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Probability that outcome is less than or equal to a given value
              </p>
              <div role="img" aria-label="Cumulative distribution line chart showing probability of outcomes">
                <ResponsiveContainer width="100%" height={400}>
                <LineChart data={ecdfData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    label={{ value: "Cumulative Probability (%)", angle: -90, position: "insideLeft" }}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="stepAfter"
                    dataKey="probability"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <ReferenceLine
                    y={50}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="3 3"
                    label={{ value: "Median (50%)", position: "right" }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Box Plot */}
          <TabsContent value="box" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Outcome Percentiles</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Visual summary of distribution showing quartiles and extremes
              </p>
              <div role="img" aria-label="Horizontal bar chart showing outcome percentiles from minimum to maximum">
                <ResponsiveContainer width="100%" height={400}>
                <BarChart data={boxPlotData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    tickFormatter={formatCurrency}
                  />
                  <YAxis type="category" dataKey="name" className="text-xs" tick={{ fill: "currentColor" }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Scatter Plot */}
          <TabsContent value="scatter" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Valuation vs Outcome</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Relationship between simulated valuations and net outcomes
              </p>
              <div role="img" aria-label="Scatter plot showing relationship between exit valuations and net outcomes">
                <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    dataKey="valuation"
                    name="Valuation"
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    tickFormatter={formatCurrency}
                    label={{ value: "Exit Valuation", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="outcome"
                    name="Outcome"
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    tickFormatter={formatCurrency}
                    label={{ value: "Net Outcome", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: "3 3" }}
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Scatter data={scatterData} fill="hsl(var(--primary))" fillOpacity={0.6} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                </ScatterChart>
              </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Statistics Table */}
          <TabsContent value="stats" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-4">Statistical Summary</h3>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Metric</th>
                      <th className="px-4 py-3 text-right text-sm font-medium">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-3 text-sm">Mean</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCurrency(stats.mean)}
                      </td>
                    </tr>
                    <tr className="border-t bg-muted/50">
                      <td className="px-4 py-3 text-sm">Median (50th percentile)</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCurrency(stats.median)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3 text-sm">Standard Deviation</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCurrency(stats.std)}
                      </td>
                    </tr>
                    <tr className="border-t bg-muted/50">
                      <td className="px-4 py-3 text-sm">Minimum</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCurrency(stats.min)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3 text-sm">10th Percentile</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCurrency(stats.p10)}
                      </td>
                    </tr>
                    <tr className="border-t bg-muted/50">
                      <td className="px-4 py-3 text-sm">25th Percentile (Q1)</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCurrency(stats.p25)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3 text-sm">75th Percentile (Q3)</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCurrency(stats.p75)}
                      </td>
                    </tr>
                    <tr className="border-t bg-muted/50">
                      <td className="px-4 py-3 text-sm">90th Percentile</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCurrency(stats.p90)}
                      </td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-4 py-3 text-sm">Maximum</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {formatCurrency(stats.max)}
                      </td>
                    </tr>
                    <tr className="border-t bg-muted/50">
                      <td className="px-4 py-3 text-sm font-semibold">Probability of Positive Outcome</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-primary">
                        {stats.positiveRate.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* PDF (Smoothed Histogram) */}
          <TabsContent value="pdf" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Probability Density Function</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Smooth approximation of the probability distribution
              </p>
              <div role="img" aria-label="Probability density function line chart showing smooth approximation of outcome distribution">
                <ResponsiveContainer width="100%" height={400}>
                <LineChart data={histogramData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="label"
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "currentColor" }}
                    label={{ value: "Density", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={false}
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                  />
                  <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Summary */}
          <TabsContent value="summary" className="space-y-4">
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
                    • <strong>Best Case (90th percentile):</strong> {formatCurrency(stats.p90)}
                  </p>
                  <p>
                    • <strong>Median Scenario:</strong> {formatCurrency(stats.median)}
                  </p>
                  <p>
                    • <strong>Worst Case (10th percentile):</strong> {formatCurrency(stats.p10)}
                  </p>
                  <p>
                    • <strong>Range:</strong> {formatCurrency(stats.min)} to {formatCurrency(stats.max)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Interpretation</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    The Monte Carlo simulation ran {netOutcomes.length.toLocaleString()} scenarios to account for
                    uncertainty in exit valuations and salary growth rates.
                  </p>
                  {stats.positiveRate >= 70 ? (
                    <p className="text-primary font-medium">
                      ✓ With {stats.positiveRate.toFixed(1)}% probability of success, this opportunity
                      shows strong potential for positive returns.
                    </p>
                  ) : stats.positiveRate >= 50 ? (
                    <p className="text-yellow-600 dark:text-yellow-500 font-medium">
                      ⚠ With {stats.positiveRate.toFixed(1)}% success probability, this is a moderate-risk
                      opportunity. Consider your risk tolerance.
                    </p>
                  ) : (
                    <p className="text-destructive font-medium">
                      ✗ With only {stats.positiveRate.toFixed(1)}% success probability, this opportunity
                      carries significant risk. Proceed with caution.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

MonteCarloVisualizations.displayName = "MonteCarloVisualizations";
