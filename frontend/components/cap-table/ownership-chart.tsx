"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Stakeholder } from "@/lib/schemas";

// Color palette for stakeholders
const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(200, 70%, 50%)",
  "hsl(280, 70%, 50%)",
  "hsl(340, 70%, 50%)",
];

interface OwnershipChartProps {
  stakeholders: Stakeholder[];
  optionPoolPct: number;
}

interface ChartData {
  name: string;
  value: number;
  type: string;
  [key: string]: string | number; // Index signature for Recharts compatibility
}

// Custom tooltip component - defined outside to avoid recreation on each render
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartData }> }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg shadow-lg p-3">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm text-muted-foreground">
          {data.value.toFixed(2)}% ownership
        </p>
        <p className="text-xs text-muted-foreground capitalize">
          {data.type.replace("_", " ")}
        </p>
      </div>
    );
  }
  return null;
}

export function OwnershipChart({ stakeholders, optionPoolPct }: OwnershipChartProps) {
  const chartData: ChartData[] = React.useMemo(() => {
    const data: ChartData[] = stakeholders.map((s) => ({
      name: s.name,
      value: s.ownership_pct,
      type: s.type,
    }));

    // Add option pool if > 0
    if (optionPoolPct > 0) {
      data.push({
        name: "Option Pool",
        value: optionPoolPct,
        type: "option_pool",
      });
    }

    // Calculate unallocated
    const totalAllocated = data.reduce((sum, d) => sum + d.value, 0);
    if (totalAllocated < 100) {
      data.push({
        name: "Unallocated",
        value: 100 - totalAllocated,
        type: "unallocated",
      });
    }

    return data;
  }, [stakeholders, optionPoolPct]);

  const totalAllocated = stakeholders.reduce((sum, s) => sum + s.ownership_pct, 0) + optionPoolPct;

  return (
    <Card className="terminal-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Ownership Distribution</span>
          <span className="text-sm font-normal text-muted-foreground">
            {totalAllocated.toFixed(1)}% allocated
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 || (chartData.length === 1 && chartData[0].type === "unallocated") ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Add stakeholders to see ownership distribution
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={
                      entry.type === "unallocated"
                        ? "hsl(var(--muted))"
                        : entry.type === "option_pool"
                        ? "hsl(var(--accent))"
                        : COLORS[index % COLORS.length]
                    }
                    opacity={entry.type === "unallocated" ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span className="text-sm">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
