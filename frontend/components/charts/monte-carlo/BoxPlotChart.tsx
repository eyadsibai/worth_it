"use client";

import { memo, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "./utils";
import type { MonteCarloStats } from "./hooks/use-monte-carlo-stats";

interface BoxPlotChartProps {
  stats: MonteCarloStats;
}

export const BoxPlotChart = memo(function BoxPlotChart({ stats }: BoxPlotChartProps) {
  const boxPlotData = useMemo(() => {
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
    <div>
      <h3 className="mb-2 text-lg font-semibold">Outcome Percentiles</h3>
      <p className="text-muted-foreground mb-4 text-sm">
        Visual summary of distribution showing quartiles and extremes
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={boxPlotData} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            type="number"
            className="text-xs"
            tick={{ fill: "currentColor" }}
            tickFormatter={formatCurrency}
          />
          <YAxis
            type="category"
            dataKey="name"
            className="text-xs"
            tick={{ fill: "currentColor" }}
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
          <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
