"use client";

/** Bar chart corner radius */
const BAR_RADIUS = 4;

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
import { formatCurrency } from "./utils";
import { useChartColors, CHART_TOOLTIP_STYLES } from "@/lib/hooks/use-chart-colors";

interface MonteCarloBoxPlotProps {
  data: BoxPlotDataPoint[];
}

export function MonteCarloBoxPlot({ data }: MonteCarloBoxPlotProps) {
  const colors = useChartColors();
  const tooltipStyles = CHART_TOOLTIP_STYLES;

  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold">Outcome Percentiles</h3>
      <p className="text-muted-foreground mb-4 text-sm">
        Visual summary of distribution showing quartiles and extremes
      </p>
      <div
        role="img"
        aria-label="Horizontal bar chart showing outcome percentiles from minimum to maximum"
      >
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              type="number"
              className="text-xs"
              tick={{ fill: colors.foreground }}
              stroke={colors.muted}
              tickFormatter={formatCurrency}
            />
            <YAxis
              type="category"
              dataKey="name"
              className="text-xs"
              tick={{ fill: colors.foreground }}
              stroke={colors.muted}
            />
            <Tooltip
              formatter={(value) => formatCurrency(typeof value === "number" ? value : Number(value) || 0)}
              {...tooltipStyles}
            />
            <Bar dataKey="value" fill={colors.chart1} radius={[0, BAR_RADIUS, BAR_RADIUS, 0]} />
            <ReferenceLine x={0} stroke={colors.muted} strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
