"use client";

import { memo, useMemo } from "react";
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
import { formatCurrency } from "./utils";

interface ScatterPlotChartProps {
  netOutcomes: number[];
  simulatedValuations: number[];
}

export const ScatterPlotChart = memo(function ScatterPlotChart({
  netOutcomes,
  simulatedValuations,
}: ScatterPlotChartProps) {
  const scatterData = useMemo(() => {
    return netOutcomes.map((outcome, i) => ({
      valuation: simulatedValuations[i],
      outcome,
    }));
  }, [netOutcomes, simulatedValuations]);

  return (
    <div>
      <h3 className="text-lg font-semibold mb-2">Valuation vs Outcome</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Relationship between simulated valuations and net outcomes
      </p>
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
            label={{
              value: "Exit Valuation",
              position: "insideBottom",
              offset: -5,
            }}
          />
          <YAxis
            type="number"
            dataKey="outcome"
            name="Outcome"
            className="text-xs"
            tick={{ fill: "currentColor" }}
            tickFormatter={formatCurrency}
            label={{
              value: "Net Outcome",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            formatter={(value: number) => formatCurrency(value)}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Scatter
            data={scatterData}
            fill="hsl(var(--primary))"
            fillOpacity={0.6}
          />
          <ReferenceLine
            y={0}
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="3 3"
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
});
