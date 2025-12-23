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
import { useChartColors, CHART_TOOLTIP_STYLES } from "@/lib/hooks/use-chart-colors";

interface MonteCarloEcdfProps {
  data: EcdfDataPoint[];
}

export function MonteCarloEcdf({ data }: MonteCarloEcdfProps) {
  const colors = useChartColors();
  const tooltipStyles = CHART_TOOLTIP_STYLES;

  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold">Cumulative Distribution</h3>
      <p className="text-muted-foreground mb-4 text-sm">
        Probability that outcome is less than or equal to a given value
      </p>
      <div
        role="img"
        aria-label="Cumulative distribution function line chart showing probability of outcomes"
      >
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey="label"
              className="text-xs"
              tick={{ fill: colors.foreground }}
              stroke={colors.muted}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: colors.foreground }}
              stroke={colors.muted}
              label={{
                value: "Cumulative Probability (%)",
                angle: -90,
                position: "insideLeft",
                fill: colors.foreground,
              }}
              domain={[0, 100]}
            />
            <Tooltip {...tooltipStyles} />
            <Line
              type="stepAfter"
              dataKey="probability"
              stroke={colors.chart1}
              strokeWidth={2}
              dot={false}
            />
            <ReferenceLine
              y={50}
              stroke={colors.muted}
              strokeDasharray="3 3"
              label={{ value: "Median (50%)", position: "right", fill: colors.foreground }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
