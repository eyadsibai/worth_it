"use client";

import * as React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrencyCompact } from "@/lib/format-utils";

interface OpportunityCostChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<Record<string, any>>;
}

export const OpportunityCostChart = React.memo(function OpportunityCostChart({
  data
}: OpportunityCostChartProps) {
  // Memoize the data transformation to avoid recalculating on every render
  const chartData = React.useMemo(() =>
    data.map((row) => ({
      year: `Year ${row.year || 0}`,
      opportunityCost: row.cumulative_opportunity_cost || 0,
      monthlySurplus: (row.monthly_surplus || 0) * 12, // Convert to annual
    })),
    [data]
  );

  return (
    <div role="img" aria-label="Line chart showing cumulative opportunity cost and annual surplus over time" className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={chartData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="year"
          className="text-xs"
          tick={{ fill: "currentColor" }}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: "currentColor" }}
          tickFormatter={formatCurrencyCompact}
        />
        <Tooltip
          formatter={(value: number) => formatCurrencyCompact(value)}
          contentStyle={{
            backgroundColor: "hsl(220 15% 15%)",
            border: "none",
            borderRadius: "12px",
            color: "white",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          }}
          labelStyle={{ color: "rgba(255, 255, 255, 0.7)" }}
          itemStyle={{ color: "white" }}
        />
        <Legend />
        <ReferenceLine y={0} stroke="var(--muted-foreground)" />
        <Line
          type="monotone"
          dataKey="opportunityCost"
          stroke="var(--chart-5)"
          strokeWidth={2}
          name="Cumulative Opportunity Cost"
          dot={{ r: 4, fill: "var(--chart-5)" }}
          activeDot={{ r: 6, fill: "var(--chart-5)" }}
        />
        <Line
          type="monotone"
          dataKey="monthlySurplus"
          stroke="var(--chart-1)"
          strokeWidth={2}
          name="Annual Surplus"
          dot={{ r: 4, fill: "var(--chart-1)" }}
          activeDot={{ r: 6, fill: "var(--chart-1)" }}
        />
      </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

OpportunityCostChart.displayName = "OpportunityCostChart";
