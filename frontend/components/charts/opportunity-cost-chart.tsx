"use client";

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

interface OpportunityCostChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Array<Record<string, any>>;
}

export function OpportunityCostChart({ data }: OpportunityCostChartProps) {
  const chartData = data.map((row) => ({
    year: `Year ${row.year || 0}`,
    opportunityCost: row.cumulative_opportunity_cost || 0,
    monthlySurplus: (row.monthly_surplus || 0) * 12, // Convert to annual
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency: "SAR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: "compact",
    }).format(value);
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
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
        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" />
        <Line
          type="monotone"
          dataKey="opportunityCost"
          stroke="hsl(var(--destructive))"
          strokeWidth={2}
          name="Cumulative Opportunity Cost"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="monthlySurplus"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          name="Annual Surplus"
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
