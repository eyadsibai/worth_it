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
import { useChartColors, CHART_TOOLTIP_STYLES } from "@/lib/hooks/use-chart-colors";

interface MonteCarloPdfProps {
  data: HistogramBin[];
}

export function MonteCarloPdf({ data }: MonteCarloPdfProps) {
  const colors = useChartColors();
  const tooltipStyles = CHART_TOOLTIP_STYLES;

  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold">Probability Density Function</h3>
      <p className="text-muted-foreground mb-4 text-sm">
        Smooth approximation of the probability distribution
      </p>
      <div
        role="img"
        aria-label="Probability density function line chart showing smooth approximation of outcome distribution"
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
                value: "Density",
                angle: -90,
                position: "insideLeft",
                fill: colors.foreground,
              }}
            />
            <Tooltip {...tooltipStyles} />
            <Line
              type="monotone"
              dataKey="count"
              stroke={colors.chart1}
              strokeWidth={3}
              dot={false}
              fill={colors.chart1}
              fillOpacity={0.2}
            />
            <ReferenceLine x={0} stroke={colors.muted} strokeDasharray="3 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
