"use client";

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
import type { EcdfDataPoint } from "./types";
import { tooltipStyle } from "./utils";

interface MonteCarloEcdfProps {
  data: EcdfDataPoint[];
}

export function MonteCarloEcdf({ data }: MonteCarloEcdfProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Cumulative Distribution</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Probability that outcome is less than or equal to a given value
      </p>
      <div role="img" aria-label="Cumulative distribution function line chart showing probability of outcomes">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
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
              label={{ value: "Cumulative Probability (%)", angle: -90, position: "insideLeft" }}
              domain={[0, 100]}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="stepAfter"
              dataKey="probability"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
            <ReferenceLine
              y={50}
              stroke="var(--muted-foreground)"
              strokeDasharray="3 3"
              label={{ value: "Median (50%)", position: "right" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
