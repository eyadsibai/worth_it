"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { useChartColors, CHART_TOOLTIP_STYLES } from "@/lib/hooks/use-chart-colors";
import { formatCurrencyCompact } from "@/lib/format-utils";
import type { SensitivityDataPoint } from "@/lib/sensitivity-utils";

interface TornadoChartProps {
  data: SensitivityDataPoint[];
  title?: string;
  showImpactLabels?: boolean;
  height?: number;
}

/**
 * Tornado chart for sensitivity analysis
 * Shows how each variable impacts outcomes (negative on left, positive on right)
 */
export function TornadoChart({
  data,
  title,
  showImpactLabels = false,
  height = 300,
}: TornadoChartProps) {
  const colors = useChartColors();

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No sensitivity data available
      </div>
    );
  }

  // Transform data for horizontal bar chart
  // Each bar shows the range from low to high
  const chartData = data.map((item) => ({
    name: item.variable,
    low: item.lowDelta,
    high: item.highDelta,
    impact: item.impact,
    lowValue: item.low,
    highValue: item.high,
  }));

  // Calculate domain for symmetrical display
  const maxAbsValue = Math.max(
    ...data.map((d) => Math.max(Math.abs(d.lowDelta), Math.abs(d.highDelta)))
  );

  // Generate accessibility description
  const accessibilityLabel = `Tornado chart showing sensitivity analysis. ${data.length} variables analyzed. Most impactful: ${data[0]?.variable} with ${formatCurrencyCompact(data[0]?.impact || 0)} impact.`;

  return (
    <div className="space-y-2">
      {title && (
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      )}
      <div
        role="img"
        aria-label={accessibilityLabel}
        style={{ height: height }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
          >
            <XAxis
              type="number"
              domain={[-maxAbsValue * 1.1, maxAbsValue * 1.1]}
              tickFormatter={(value) => formatCurrencyCompact(value)}
              tick={{ fill: colors.foreground, fontSize: 11 }}
              stroke={colors.muted}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fill: colors.foreground, fontSize: 12 }}
              stroke={colors.muted}
              width={95}
            />
            <Tooltip
              content={<TornadoTooltip showImpactLabels={showImpactLabels} />}
              {...CHART_TOOLTIP_STYLES}
            />
            <ReferenceLine x={0} stroke={colors.muted} strokeDasharray="3 3" />

            {/* Low (negative impact) bars - shown in red/destructive color
                Note: "Low" here means the outcome when the variable is at its low range.
                We show this in destructive color because lower outcomes are generally worse.
                The actual variable value direction depends on the variable type. */}
            <Bar dataKey="low" stackId="stack" radius={[4, 0, 0, 4]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`low-${index}`}
                  fill={colors.destructive}
                  opacity={0.8}
                />
              ))}
            </Bar>

            {/* High (positive impact) bars - shown in green/chart3 color */}
            <Bar dataKey="high" stackId="stack" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`high-${index}`}
                  fill={colors.chart3}
                  opacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Impact labels below chart */}
      {showImpactLabels && (
        <div className="space-y-1 mt-3">
          {data.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs text-muted-foreground"
            >
              <span>{item.variable}</span>
              <span className="font-medium tabular-nums">
                Impact: {formatCurrencyCompact(item.impact)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground mt-2">
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: colors.destructive, opacity: 0.8 }}
          />
          <span>Worse Outcome</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: colors.chart3, opacity: 0.8 }}
          />
          <span>Better Outcome</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Custom tooltip for tornado chart
 */
function TornadoTooltip({
  active,
  payload,
  showImpactLabels,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      name: string;
      lowValue: number;
      highValue: number;
      impact: number;
    };
  }>;
  showImpactLabels?: boolean;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload;

  return (
    <div className={`${CHART_TOOLTIP_STYLES} px-3 py-2 rounded-xl shadow-lg text-sm`}>
      <p className="font-medium mb-1">{data.name}</p>
      <div className="space-y-0.5 text-xs">
        <p>
          <span className="text-gray-400">Low scenario: </span>
          <span className="tabular-nums">{formatCurrencyCompact(data.lowValue)}</span>
        </p>
        <p>
          <span className="text-gray-400">High scenario: </span>
          <span className="tabular-nums">{formatCurrencyCompact(data.highValue)}</span>
        </p>
        {showImpactLabels && (
          <p className="mt-1 pt-1 border-t border-gray-600">
            <span className="text-gray-400">Total impact: </span>
            <span className="font-medium tabular-nums">
              {formatCurrencyCompact(data.impact)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
