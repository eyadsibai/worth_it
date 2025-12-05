"use client";

import * as React from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface RunwayChartProps {
    data: {
        Month: number;
        Cash: number;
        Runway: number;
    }[];
}

export function RunwayChart({ data }: RunwayChartProps) {
    return (
        <Card className="glass-card">
            <CardHeader>
                <CardTitle className="text-lg">Cash Runway Projection</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="oklch(var(--terminal))" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="oklch(var(--terminal))" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" vertical={false} />
                            <XAxis
                                dataKey="Month"
                                stroke="oklch(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `M${value}`}
                            />
                            <YAxis
                                stroke="oklch(var(--muted-foreground))"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "oklch(var(--card))",
                                    borderColor: "oklch(var(--border))",
                                    borderRadius: "var(--radius)",
                                }}
                                formatter={(value: number) => [formatCurrency(value), "Cash Balance"]}
                                labelFormatter={(label) => `Month ${label}`}
                            />
                            <Area
                                type="monotone"
                                dataKey="Cash"
                                stroke="oklch(var(--terminal))"
                                fillOpacity={1}
                                fill="url(#colorCash)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
