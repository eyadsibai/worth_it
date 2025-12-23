"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getScenarioMetrics } from "@/lib/scenario-utils";
import type { FounderScenario } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface ScenarioComparisonProps {
  scenarios: FounderScenario[];
  onRemoveScenario?: (id: string) => void;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercent(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

interface MetricRowProps {
  label: string;
  values: (number | string)[];
  format?: "currency" | "percent" | "number";
  higherIsBetter?: boolean;
}

function MetricRow({ label, values, format = "number", higherIsBetter = true }: MetricRowProps) {
  const numericValues = values.map((v) => (typeof v === "number" ? v : 0));
  const best = higherIsBetter ? Math.max(...numericValues) : Math.min(...numericValues);
  // Only highlight as best if the best value is unique (not when all values are equal)
  const bestCount = numericValues.filter((v) => v === best).length;

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `200px repeat(${values.length}, 1fr)` }}
    >
      <div className="text-muted-foreground text-sm font-medium">{label}</div>
      {values.map((value, idx) => {
        const numValue = typeof value === "number" ? value : 0;
        // Only highlight when there's a clear winner (best value appears only once)
        const isBest = numericValues.length > 1 && numValue === best && bestCount === 1;

        let displayValue: string;
        if (format === "currency") {
          displayValue = formatCurrency(numValue);
        } else if (format === "percent") {
          displayValue = formatPercent(numValue);
        } else {
          displayValue = numValue.toLocaleString();
        }

        return (
          <div
            key={idx}
            className={cn(
              "text-right text-sm font-semibold",
              isBest && "text-green-600 dark:text-green-400"
            )}
          >
            {displayValue}
          </div>
        );
      })}
    </div>
  );
}

export function ScenarioComparison({ scenarios, onRemoveScenario }: ScenarioComparisonProps) {
  if (scenarios.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-8 text-center">
          Select scenarios to compare them side by side.
        </CardContent>
      </Card>
    );
  }

  if (scenarios.length === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{scenarios[0].name}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-center">
          Add another scenario to compare metrics.
        </CardContent>
      </Card>
    );
  }

  const metricsData = scenarios.map((s) => ({
    scenario: s,
    metrics: getScenarioMetrics(s),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Scenario Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scenario Headers */}
        <div
          className="grid gap-4 border-b pb-4"
          style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}
        >
          <div></div>
          {scenarios.map((scenario) => (
            <div key={scenario.id} className="flex items-center justify-between">
              <span className="truncate font-semibold">{scenario.name}</span>
              {onRemoveScenario && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveScenario(scenario.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Remove {scenario.name}</span>
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Metrics */}
        <div className="space-y-3">
          <MetricRow
            label="Founder Ownership"
            values={metricsData.map((m) => m.metrics.founderOwnership)}
            format="percent"
            higherIsBetter={true}
          />

          <MetricRow
            label="Investor Ownership"
            values={metricsData.map((m) => m.metrics.investorOwnership)}
            format="percent"
            higherIsBetter={false}
          />

          <MetricRow
            label="Total Raised"
            values={metricsData.map((m) => m.metrics.totalFundingRaised)}
            format="currency"
            higherIsBetter={true}
          />

          <MetricRow
            label="Total Stakeholders"
            values={metricsData.map((m) => m.metrics.totalStakeholders)}
            format="number"
            higherIsBetter={false}
          />

          <MetricRow
            label="Option Pool"
            values={metricsData.map((m) => m.metrics.optionPoolPct)}
            format="percent"
            higherIsBetter={true}
          />

          <MetricRow
            label="Outstanding SAFEs"
            values={metricsData.map((m) => m.metrics.outstandingSAFEs)}
            format="number"
            higherIsBetter={false}
          />

          <MetricRow
            label="Priced Rounds"
            values={metricsData.map((m) => m.metrics.pricedRounds)}
            format="number"
            higherIsBetter={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}
