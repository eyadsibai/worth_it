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
import type { HistogramBin } from "./types";
import { tooltipStyle } from "./utils";

interface MonteCarloPdfProps {
  data: HistogramBin[];
}

export function MonteCarloPdf({ data }: MonteCarloPdfProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Probability Density Function</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Smooth approximation of the probability distribution
      </p>
      <div role="img" aria-label="Probability density function line chart showing smooth approximation of outcome distribution">
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
              label={{ value: "Density", angle: -90, position: "insideLeft" }}
            />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              dot={false}
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
            />
            <ReferenceLine x={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
