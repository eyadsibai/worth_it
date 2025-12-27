"use client";

/**
 * Ownership Area Chart Component (#228)
 *
 * Stacked area chart showing ownership percentages over time.
 * Includes event markers on the x-axis and syncs with the timeline below.
 */

import { useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { format } from "date-fns";
import type {
  TimelineChartDataPoint,
  TimelineEvent,
  TimelineInteractionState,
  TimelineInteractionHandlers,
} from "./types";
import { STAKEHOLDER_COLORS } from "./types";
import { useChartColors } from "@/lib/hooks/use-chart-colors";

// ============================================================================
// Custom Tooltip (Fundcy Dark Style)
// ============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

function FundcyTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  // Sort by value descending for display
  const sortedPayload = [...payload].sort((a, b) => b.value - a.value);

  return (
    <div className="min-w-[180px] rounded-xl bg-[hsl(220,15%,15%)] px-4 py-3 text-white shadow-lg">
      <p className="mb-2 text-xs text-gray-400">{label}</p>
      <div className="space-y-1.5">
        {sortedPayload.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-sm">{entry.name}</span>
            </div>
            <span className="text-sm font-medium tabular-nums">{entry.value.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface OwnershipAreaChartProps {
  chartData: TimelineChartDataPoint[];
  stakeholderNames: string[];
  events: TimelineEvent[];
  interactionState: TimelineInteractionState;
  interactionHandlers: TimelineInteractionHandlers;
}

export function OwnershipAreaChart({
  chartData,
  stakeholderNames,
  events: _events, // Reserved for future event markers on chart
  interactionState,
  interactionHandlers,
}: OwnershipAreaChartProps) {
  const { selectedTimestamp, hoveredTimestamp } = interactionState;
  const { onSelect, onHover } = interactionHandlers;
  const chartColors = useChartColors();

  // Create color mapping for stakeholders
  const stakeholderColors = useMemo(() => {
    const colors: Record<string, string> = {};
    stakeholderNames.forEach((name, index) => {
      colors[name] = STAKEHOLDER_COLORS[index % STAKEHOLDER_COLORS.length];
    });
    return colors;
  }, [stakeholderNames]);

  // Get unique date values for X-axis to prevent duplicate labels
  // Multiple events can occur on the same date (e.g., vesting + funding round)
  const uniqueDateTicks = useMemo(() => {
    const seen = new Set<string>();
    return chartData
      .map((point) => point.date)
      .filter((date) => {
        if (seen.has(date)) return false;
        seen.add(date);
        return true;
      });
  }, [chartData]);

  // Handle mouse move on chart - use Recharts' internal type
  const handleMouseMove = useCallback(
    (state: { activePayload?: Array<{ payload?: TimelineChartDataPoint }> } | null) => {
      if (state?.activePayload && state.activePayload.length > 0) {
        const payload = state.activePayload[0].payload;
        if (payload?.timestamp) {
          onHover(payload.timestamp);
        }
      }
    },
    [onHover]
  );

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  // Handle click - use Recharts' internal type
  const handleClick = useCallback(
    (state: { activePayload?: Array<{ payload?: TimelineChartDataPoint }> } | null) => {
      if (state?.activePayload && state.activePayload.length > 0) {
        const payload = state.activePayload[0].payload;
        if (payload?.timestamp) {
          // Toggle selection
          onSelect(selectedTimestamp === payload.timestamp ? null : payload.timestamp);
        }
      }
    },
    [onSelect, selectedTimestamp]
  );

  if (chartData.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[300px] items-center justify-center">
        <p>No timeline data available. Add stakeholders or funding to see your equity evolution.</p>
      </div>
    );
  }

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          onMouseMove={handleMouseMove as never}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick as never}
        >
          <defs>
            {stakeholderNames.map((name, index) => (
              <linearGradient key={name} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={stakeholderColors[name]} stopOpacity={0.8} />
                <stop offset="95%" stopColor={stakeholderColors[name]} stopOpacity={0.2} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />

          <XAxis
            dataKey="date"
            ticks={uniqueDateTicks}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: chartColors.foreground }}
            dy={10}
          />

          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: chartColors.foreground }}
            tickFormatter={(value) => `${value}%`}
            width={45}
          />

          <Tooltip content={<FundcyTooltip />} />

          {/* Stacked areas for each stakeholder */}
          {stakeholderNames.map((name, index) => (
            <Area
              key={name}
              type="monotone"
              dataKey={name}
              stackId="1"
              stroke={stakeholderColors[name]}
              fill={`url(#gradient-${index})`}
              strokeWidth={2}
            />
          ))}

          {/* Vertical reference line for hovered/selected timestamp */}
          {(hoveredTimestamp || selectedTimestamp) && (
            <ReferenceLine
              x={format(new Date(hoveredTimestamp || selectedTimestamp!), "MMM yyyy")}
              stroke="hsl(var(--primary))"
              strokeDasharray="3 3"
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
