"use client";

import * as React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { DilutionData } from "@/lib/dilution-utils";

// Color mapping for stakeholder types
const TYPE_COLORS: Record<string, string> = {
  founder: "hsl(var(--chart-1))",
  employee: "hsl(var(--chart-2))",
  investor: "hsl(var(--chart-3))",
  advisor: "hsl(var(--chart-4))",
  option_pool: "hsl(var(--chart-5))",
  new_investor: "hsl(var(--terminal))",
};

interface DilutionComparisonChartsProps {
  data: DilutionData[];
}

interface ChartDataItem {
  name: string;
  value: number;
  type: string;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDataItem }>;
}) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-2 text-sm">
        <p className="font-medium">{data.name}</p>
        <p className="text-muted-foreground">{data.value.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
}

function MiniPieChart({
  data,
  label,
}: {
  data: ChartDataItem[];
  label: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={60}
            paddingAngle={1}
            dataKey="value"
          >
            {data.map((entry) => (
              <Cell
                key={`cell-${entry.name}`}
                fill={TYPE_COLORS[entry.type] || "hsl(var(--muted))"}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DilutionComparisonCharts({
  data,
}: DilutionComparisonChartsProps) {
  // Prepare before data (excluding new investor)
  const beforeData: ChartDataItem[] = React.useMemo(
    () =>
      data
        .filter((d) => !d.isNew)
        .map((d) => ({
          name: d.name,
          value: d.beforePct,
          type: d.type,
        })),
    [data]
  );

  // Prepare after data (including new investor)
  const afterData: ChartDataItem[] = React.useMemo(
    () =>
      data.map((d) => ({
        name: d.name,
        value: d.afterPct,
        type: d.type,
      })),
    [data]
  );

  return (
    <div className="grid grid-cols-2 gap-4">
      <MiniPieChart data={beforeData} label="Before" />
      <MiniPieChart data={afterData} label="After" />
    </div>
  );
}
