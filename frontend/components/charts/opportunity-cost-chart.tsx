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
import { useChartColors, useChartTooltipStyles } from "@/lib/hooks/use-chart-colors";

interface OpportunityCostChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<Record<string, any>>;
}

export const OpportunityCostChart = React.memo(function OpportunityCostChart({
  data
}: OpportunityCostChartProps) {
  const colors = useChartColors();
  const tooltipStyles = useChartTooltipStyles();

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
        <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
        <XAxis
          dataKey="year"
          className="text-xs"
          tick={{ fill: colors.foreground }}
          stroke={colors.muted}
        />
        <YAxis
          className="text-xs"
          tick={{ fill: colors.foreground }}
          stroke={colors.muted}
          tickFormatter={formatCurrencyCompact}
        />
        <Tooltip
          formatter={(value: number) => formatCurrencyCompact(value)}
          {...tooltipStyles}
        />
        <Legend />
        <ReferenceLine y={0} stroke={colors.muted} />
        <Line
          type="monotone"
          dataKey="opportunityCost"
          stroke={colors.chart5}
          strokeWidth={2}
          name="Cumulative Opportunity Cost"
          dot={{ r: 4, fill: colors.chart5 }}
          activeDot={{ r: 6, fill: colors.chart5 }}
        />
        <Line
          type="monotone"
          dataKey="monthlySurplus"
          stroke={colors.chart1}
          strokeWidth={2}
          name="Annual Surplus"
          dot={{ r: 4, fill: colors.chart1 }}
          activeDot={{ r: 6, fill: colors.chart1 }}
        />
      </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

OpportunityCostChart.displayName = "OpportunityCostChart";
