"use client";

import { memo, useMemo } from "react";
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
import { formatCurrency } from "./utils";

interface HistogramChartProps {
  netOutcomes: number[];
  bins?: number;
}

export const HistogramChart = memo(function HistogramChart({
  netOutcomes,
  bins = 30,
}: HistogramChartProps) {
  const histogramData = useMemo(() => {
    const min = Math.min(...netOutcomes);
    const max = Math.max(...netOutcomes);
    const binWidth = (max - min) / bins;

    const histogram = Array.from({ length: bins }, (_, i) => ({
      bin: min + i * binWidth,
      count: 0,
      label: formatCurrency(min + i * binWidth),
    }));

    netOutcomes.forEach((value) => {
      const binIndex = Math.min(
        Math.floor((value - min) / binWidth),
        bins - 1
      );
      histogram[binIndex].count++;
    });

    return histogram;
  }, [netOutcomes, bins]);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Distribution of Net Outcomes</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Frequency distribution showing how often different outcomes occur
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={histogramData}>
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
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
            {histogramData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.bin >= 0
                    ? "hsl(var(--primary))"
                    : "hsl(var(--destructive))"
                }
              />
            ))}
          </Bar>
          <ReferenceLine
            x={0}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
