"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, CheckCircle, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { formatCurrency } from "@/lib/format-utils";
import type { FrontendValuationComparison, FrontendValuationResult } from "@/lib/schemas";

interface ValuationComparisonProps {
  comparison: FrontendValuationComparison;
}

const methodLabels: Record<string, string> = {
  revenue_multiple: "Revenue Multiple",
  dcf: "DCF",
  vc_method: "VC Method",
};

const CHART_COLORS = {
  primary: "#1A3D2E",
  secondary: "#2D5A3D",
  tertiary: "#9BC53D",
  reference: "#6B7280",
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { name: string; valuation: number; confidence: number } }>;
}

function ChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const valuationStr = formatCurrency(data.valuation);

  return (
    <div className="bg-[hsl(220,15%,15%)] text-white px-3 py-2 rounded-xl shadow-lg">
      <p className="text-sm font-medium mb-1">{data.name}</p>
      <p className="text-lg font-semibold tabular-nums">{valuationStr}</p>
      <p className="text-xs text-gray-400">
        {Math.round(data.confidence * 100)}% confidence
      </p>
    </div>
  );
}

export function ValuationComparison({ comparison }: ValuationComparisonProps) {
  const chartData = comparison.results.map((result) => ({
    name: methodLabels[result.method] || result.method,
    valuation: result.valuation,
    confidence: result.confidence,
    method: result.method,
  }));

  const rangePctDisplay = Math.round(comparison.rangePct * 100);
  const isWideRange = comparison.rangePct > 0.5;
  const isTightRange = comparison.rangePct < 0.2;

  // Format large values for display
  const formatValuation = (value: number) => {
    const formatted = formatCurrency(value);
    const [whole, decimal] = formatted.split(".");
    return { whole, decimal };
  };

  const weighted = formatValuation(comparison.weightedAverage);
  const minVal = formatValuation(comparison.minValuation);
  const maxVal = formatValuation(comparison.maxValuation);

  return (
    <Card className="border-0 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_2px_8px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Valuation Comparison
              {isTightRange && (
                <Badge variant="outline" className="text-terminal">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Strong Consensus
                </Badge>
              )}
              {isWideRange && (
                <Badge variant="outline" className="text-amber-500">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Wide Range
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Comparison of {comparison.results.length} valuation methods
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Weighted Average
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {weighted.whole}
              {weighted.decimal && (
                <span className="text-muted-foreground">.{weighted.decimal}</span>
              )}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Minimum
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {minVal.whole}
              <span className="text-muted-foreground">.{minVal.decimal || "00"}</span>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Maximum
            </p>
            <p className="text-lg font-semibold tabular-nums">
              {maxVal.whole}
              <span className="text-muted-foreground">.{maxVal.decimal || "00"}</span>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Range
            </p>
            <p className={`text-lg font-semibold ${isWideRange ? "text-amber-500" : isTightRange ? "text-terminal" : ""}`}>
              ±{rangePctDisplay}%
            </p>
          </div>
        </div>

        {/* Bar Chart - only show when comparing 2+ methods */}
        {chartData.length >= 2 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                <XAxis
                  type="number"
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`}
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                  width={100}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine
                  x={comparison.weightedAverage}
                  stroke={CHART_COLORS.reference}
                  strokeDasharray="3 3"
                  label={{
                    value: "Weighted Avg",
                    position: "top",
                    fill: CHART_COLORS.reference,
                    fontSize: 10,
                  }}
                />
                <Bar dataKey="valuation" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={entry.method}
                      fill={
                        index === 0
                          ? CHART_COLORS.primary
                          : index === 1
                          ? CHART_COLORS.secondary
                          : CHART_COLORS.tertiary
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Add more valuation methods to see a comparison chart</p>
          </div>
        )}

        {/* Outliers Warning */}
        {comparison.outliers.length > 0 && (
          <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Outlier Methods Detected</p>
              <p className="text-muted-foreground">
                The following methods show significant deviation:{" "}
                {comparison.outliers.map((o) => methodLabels[o] || o).join(", ")}
              </p>
            </div>
          </div>
        )}

        {/* Insights */}
        {comparison.insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Insights
            </p>
            <div className="space-y-2">
              {comparison.insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Results Grid */}
        <div className="pt-4 border-t">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
            Method Breakdown
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparison.results.map((result) => (
              <MethodCard key={result.method} result={result} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MethodCard({ result }: { result: FrontendValuationResult }) {
  const valuationStr = formatCurrency(result.valuation);
  const [whole, decimal] = valuationStr.split(".");
  const confidencePercent = Math.round(result.confidence * 100);

  return (
    <div className="p-4 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">
          {methodLabels[result.method] || result.method}
        </p>
        <Badge variant="outline" className="text-xs">
          {confidencePercent}%
        </Badge>
      </div>
      <p className="text-xl font-semibold tabular-nums">
        {whole}
        {decimal && <span className="text-muted-foreground">.{decimal}</span>}
      </p>
      {result.notes && (
        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
          {result.notes}
        </p>
      )}
    </div>
  );
}
