"use client";

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
import type { BoxPlotDataPoint } from "./types";
import { formatCurrency, tooltipStyle } from "./utils";

interface MonteCarloBoxPlotProps {
  data: BoxPlotDataPoint[];
}

export function MonteCarloBoxPlot({ data }: MonteCarloBoxPlotProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Outcome Percentiles</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Visual summary of distribution showing quartiles and extremes
      </p>
      <div role="img" aria-label="Horizontal bar chart showing outcome percentiles from minimum to maximum">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="horizontal">
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
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
            <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
