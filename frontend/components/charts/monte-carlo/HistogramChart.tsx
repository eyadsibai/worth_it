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
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[binIndex].count++;
    });

    return histogram;
  }, [netOutcomes, bins]);

  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold">Distribution of Net Outcomes</h3>
      <p className="text-muted-foreground mb-4 text-sm">
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
              backgroundColor: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]}>
            {histogramData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.bin >= 0 ? "var(--chart-1)" : "var(--destructive)"}
              />
            ))}
          </Bar>
          <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
