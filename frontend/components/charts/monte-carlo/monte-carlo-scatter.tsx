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
import { formatCurrency } from "./utils";
import { useChartColors, CHART_TOOLTIP_STYLES } from "@/lib/hooks/use-chart-colors";

interface MonteCarloScatterProps {
  data: ScatterDataPoint[];
}

export function MonteCarloScatter({ data }: MonteCarloScatterProps) {
  const colors = useChartColors();
  const tooltipStyles = CHART_TOOLTIP_STYLES;

  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold">Valuation vs Outcome</h3>
      <p className="text-muted-foreground mb-4 text-sm">
        Relationship between simulated valuations and net outcomes
      </p>
      <div
        role="img"
        aria-label="Scatter plot showing relationship between exit valuations and net outcomes"
      >
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              type="number"
              dataKey="valuation"
              name="Valuation"
              className="text-xs"
              tick={{ fill: colors.foreground }}
              stroke={colors.muted}
              tickFormatter={formatCurrency}
              label={{
                value: "Exit Valuation",
                position: "insideBottom",
                offset: -5,
                fill: colors.foreground,
              }}
            />
            <YAxis
              type="number"
              dataKey="outcome"
              name="Outcome"
              className="text-xs"
              tick={{ fill: colors.foreground }}
              stroke={colors.muted}
              tickFormatter={formatCurrency}
              label={{
                value: "Net Outcome",
                angle: -90,
                position: "insideLeft",
                fill: colors.foreground,
              }}
            />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              formatter={(value: number) => formatCurrency(value)}
              {...tooltipStyles}
            />
            <Scatter data={data} fill={colors.chart1} fillOpacity={0.6} />
            <ReferenceLine y={0} stroke={colors.muted} strokeDasharray="3 3" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
