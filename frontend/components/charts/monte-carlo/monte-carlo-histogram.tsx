"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import type { HistogramBin } from "./types";
import { tooltipStyle } from "./utils";

interface MonteCarloHistogramProps {
  data: HistogramBin[];
}

export function MonteCarloHistogram({ data }: MonteCarloHistogramProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Distribution of Net Outcomes</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Frequency distribution showing how often different outcomes occur
      </p>
      <div role="img" aria-label="Histogram showing distribution of net outcomes from Monte Carlo simulation">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
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
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.bin >= 0 ? "var(--chart-1)" : "var(--destructive)"}
                />
              ))}
            </Bar>
            <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
