"use client";

import { memo, useMemo } from "react";
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
import { formatCurrency } from "./utils";

interface PDFChartProps {
  netOutcomes: number[];
  bins?: number;
}

export const PDFChart = memo(function PDFChart({
  netOutcomes,
  bins = 30,
}: PDFChartProps) {
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
      <h3 className="text-lg font-semibold mb-2">Probability Density Function</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Smooth approximation of the probability distribution
      </p>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={histogramData}>
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
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={false}
            fill="hsl(var(--primary))"
            fillOpacity={0.2}
          />
          <ReferenceLine
            x={0}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
