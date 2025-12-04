"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ScatterDataPoint } from "./types";
import { formatCurrency, tooltipStyle } from "./utils";

interface MonteCarloScatterProps {
  data: ScatterDataPoint[];
}

export function MonteCarloScatter({ data }: MonteCarloScatterProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Valuation vs Outcome</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Relationship between simulated valuations and net outcomes
      </p>
      <div role="img" aria-label="Scatter plot showing relationship between exit valuations and net outcomes">
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              dataKey="valuation"
              name="Valuation"
              className="text-xs"
              tick={{ fill: "currentColor" }}
              tickFormatter={formatCurrency}
              label={{ value: "Exit Valuation", position: "insideBottom", offset: -5 }}
            />
            <YAxis
              type="number"
              dataKey="outcome"
              name="Outcome"
              className="text-xs"
              tick={{ fill: "currentColor" }}
              tickFormatter={formatCurrency}
              label={{ value: "Net Outcome", angle: -90, position: "insideLeft" }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={tooltipStyle}
            />
            <Scatter data={data} fill="hsl(var(--primary))" fillOpacity={0.6} />
            <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
