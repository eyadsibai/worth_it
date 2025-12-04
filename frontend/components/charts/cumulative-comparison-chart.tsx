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

interface CumulativeComparisonChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<Record<string, any>>;
}

// Format currency with compact notation (e.g., SAR 10K)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);
};

export const CumulativeComparisonChart = React.memo(function CumulativeComparisonChart({
  data
}: CumulativeComparisonChartProps) {
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
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
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
          tickFormatter={formatCurrency}
        />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: "hsl(var(--background))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <Bar
          dataKey="startup"
          fill="hsl(var(--primary))"
          name="Startup Salary"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="currentJob"
          fill="hsl(var(--secondary))"
          name="Current Job Salary"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});

CumulativeComparisonChart.displayName = "CumulativeComparisonChart";
