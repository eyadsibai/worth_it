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
import { useChartColors, CHART_TOOLTIP_STYLES } from "@/lib/hooks/use-chart-colors";

interface MonteCarloHistogramProps {
  data: HistogramBin[];
}

export function MonteCarloHistogram({ data }: MonteCarloHistogramProps) {
  const colors = useChartColors();
  const tooltipStyles = CHART_TOOLTIP_STYLES;

  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold">Distribution of Net Outcomes</h3>
      <p className="text-muted-foreground mb-4 text-sm">
        Frequency distribution showing how often different outcomes occur
      </p>
      <div
        role="img"
        aria-label="Histogram showing distribution of net outcomes from Monte Carlo simulation"
      >
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
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
                value: "Frequency",
                angle: -90,
                position: "insideLeft",
                fill: colors.foreground,
              }}
            />
            <Tooltip {...tooltipStyles} />
            <Bar dataKey="count" fill={colors.chart1} radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.bin >= 0 ? colors.chart1 : colors.destructive}
                />
              ))}
            </Bar>
            <ReferenceLine x={0} stroke={colors.muted} strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
