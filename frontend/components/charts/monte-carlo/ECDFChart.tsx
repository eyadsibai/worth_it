"use client";

import { memo, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { formatCurrency } from "./utils";

interface ECDFChartProps {
  netOutcomes: number[];
}

export const ECDFChart = memo(function ECDFChart({
  netOutcomes,
}: ECDFChartProps) {
  const ecdfData = useMemo(() => {
    const sorted = [...netOutcomes].sort((a, b) => a - b);
    return sorted.map((value, index) => ({
      value,
      probability: ((index + 1) / sorted.length) * 100,
      label: formatCurrency(value),
    }));
  }, [netOutcomes]);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Cumulative Distribution</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Probability that outcome is less than or equal to a given value
      </p>
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
            label={{
              value: "Cumulative Probability (%)",
              angle: -90,
              position: "insideLeft",
            }}
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
  );
});
