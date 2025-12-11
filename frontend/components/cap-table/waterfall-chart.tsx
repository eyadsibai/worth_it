"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { WaterfallDistribution } from "@/lib/schemas";

// Color palette for stakeholders
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(200, 70%, 50%)",
  "hsl(280, 70%, 50%)",
  "hsl(340, 70%, 50%)",
];

interface WaterfallChartProps {
  distributions: WaterfallDistribution[];
  selectedValuation?: number;
  onSelectValuation?: (valuation: number) => void;
}

// Format currency for display
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

interface ChartDataPoint {
  exit_valuation: number;
  exit_label: string;
  [stakeholderName: string]: number | string;
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; fill: string }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum, entry) => sum + entry.value, 0);
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3 min-w-[200px]">
        <p className="font-medium border-b pb-2 mb-2">Exit: {label}</p>
        {payload.map((entry) => (
          <div key={entry.name} className="flex justify-between text-sm py-0.5">
            <span className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.fill }}
              />
              {entry.name}
            </span>
            <span className="font-mono">{formatCurrency(entry.value)}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 flex justify-between font-medium">
          <span>Total</span>
          <span className="font-mono">{formatCurrency(total)}</span>
        </div>
      </div>
    );
  }
  return null;
}

export function WaterfallChart({
  distributions,
  selectedValuation,
  onSelectValuation,
}: WaterfallChartProps) {
  // Transform data for stacked bar chart
  const { chartData, stakeholderNames } = React.useMemo(() => {
    if (!distributions.length) {
      return { chartData: [], stakeholderNames: [] as string[] };
    }

    // Get unique stakeholder names from first distribution
    const names = distributions[0].stakeholder_payouts.map((p) => p.name);

    const data: ChartDataPoint[] = distributions.map((dist) => {
      const point: ChartDataPoint = {
        exit_valuation: dist.exit_valuation,
        exit_label: formatCurrency(dist.exit_valuation),
      };

      // Add each stakeholder's payout
      dist.stakeholder_payouts.forEach((payout) => {
        point[payout.name] = payout.payout_amount;
      });

      return point;
    });

    return { chartData: data, stakeholderNames: names };
  }, [distributions]);

  // Handle click on chart to select valuation
  const handleChartClick = React.useCallback(
    (data: unknown) => {
      const chartData = data as { activePayload?: Array<{ payload: ChartDataPoint }> } | null;
      if (onSelectValuation && chartData?.activePayload?.[0]?.payload) {
        const payload = chartData.activePayload[0].payload;
        onSelectValuation(payload.exit_valuation);
      }
    },
    [onSelectValuation]
  );

  if (distributions.length === 0) {
    return (
      <Card className="terminal-card">
        <CardHeader>
          <CardTitle>Exit Proceeds Distribution</CardTitle>
          <CardDescription>
            Configure preference tiers to see how proceeds are distributed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No distribution data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="terminal-card">
      <CardHeader>
        <CardTitle>Exit Proceeds Distribution</CardTitle>
        <CardDescription>
          How exit proceeds are distributed across stakeholders at different valuations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            onClick={handleChartClick}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="exit_label"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tickFormatter={formatCurrency}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-sm">{value}</span>}
            />
            {stakeholderNames.map((name, index) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="a"
                fill={COLORS[index % COLORS.length]}
                cursor={onSelectValuation ? "pointer" : "default"}
              />
            ))}
            {selectedValuation && (
              <ReferenceLine
                x={formatCurrency(selectedValuation)}
                stroke="hsl(var(--terminal))"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
