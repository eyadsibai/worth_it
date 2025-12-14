"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrencyCompact } from "@/lib/format-utils";
import { useChartColors, CHART_TOOLTIP_STYLES } from "@/lib/hooks/use-chart-colors";

interface CumulativeComparisonChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<Record<string, any>>;
}

export const CumulativeComparisonChart = React.memo(function CumulativeComparisonChart({
  data
}: CumulativeComparisonChartProps) {
  const colors = useChartColors();
  const tooltipStyles = CHART_TOOLTIP_STYLES;

  // Memoize the data transformation to avoid recalculating on every render
  const chartData = React.useMemo(() =>
    data.map((row) => ({
      year: `Year ${row.year || 0}`,
      startup: row.startup_monthly_salary || 0,
      currentJob: row.current_job_monthly_salary || 0,
      opportunityCost: row.cumulative_opportunity_cost || 0,
    })),
    [data]
  );

  return (
    <div role="img" aria-label="Bar chart comparing startup salary and current job salary over years" className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
      <BarChart
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
        <Bar
          dataKey="currentJob"
          fill={colors.chart1}
          name="Current Job Salary"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="startup"
          fill={colors.chart2}
          name="Startup Salary"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

CumulativeComparisonChart.displayName = "CumulativeComparisonChart";
