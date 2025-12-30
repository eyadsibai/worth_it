"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { PieChart, TrendingDown, Clock, Target, SlidersHorizontal } from "lucide-react";
import type { DilutionRoundForm } from "@/lib/schemas";
import { AnimatedNumber } from "@/lib/motion";

interface DilutionSummaryCardProps {
  completedRounds: DilutionRoundForm[];
  upcomingRounds: DilutionRoundForm[];
  /** Form instance for updating dilution rounds */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form?: UseFormReturn<any>;
  /** Indices of upcoming rounds in the full dilution_rounds array */
  upcomingRoundIndices?: number[];
}

/**
 * Format a percentage, removing trailing .0 if present
 */
function formatPct(value: number): string {
  const fixed = value.toFixed(1);
  return fixed.endsWith(".0") ? Math.round(value).toString() : fixed;
}

/**
 * Calculates cumulative dilution factor from a list of rounds.
 * Only includes enabled rounds.
 * @returns Remaining equity factor (1 = no dilution, 0.68 = 32% dilution)
 */
function calculateDilutionFactor(rounds: DilutionRoundForm[]): number {
  return rounds.reduce((factor, round) => {
    if (round.enabled) {
      return factor * (1 - round.dilution_pct / 100);
    }
    return factor;
  }, 1);
}

/**
 * Displays a summary of historical and projected dilution with a visual breakdown.
 * Shows how much equity remains after all funding rounds.
 *
 * Follows Fundcy design system:
 * - Clean white card with subtle shadow
 * - Large percentage display with muted suffix
 * - Progress bar visualization
 */
export function DilutionSummaryCard({
  completedRounds,
  upcomingRounds,
  form,
  upcomingRoundIndices,
}: DilutionSummaryCardProps) {
  // Store the initial dilution ratios when rounds are first loaded
  const [baseRatios, setBaseRatios] = React.useState<number[] | null>(null);

  // Calculate enabled upcoming rounds for the slider (must be before hooks that depend on it)
  const enabledUpcomingRounds = React.useMemo(
    () => upcomingRounds.filter((r) => r.enabled),
    [upcomingRounds]
  );
  const hasEnabledUpcoming = enabledUpcomingRounds.length > 0;
  const enabledCount = enabledUpcomingRounds.length;

  // Initialize base ratios when we have enabled rounds
  React.useEffect(() => {
    if (hasEnabledUpcoming && baseRatios === null) {
      // Store the initial dilution percentages as ratios
      const totalDilutionPct = enabledUpcomingRounds.reduce((sum, r) => sum + r.dilution_pct, 0);
      if (totalDilutionPct > 0) {
        const ratios = enabledUpcomingRounds.map((r) => r.dilution_pct / totalDilutionPct);
        setBaseRatios(ratios);
      }
    }
  }, [hasEnabledUpcoming, enabledUpcomingRounds, baseRatios]);

  // Reset base ratios when enabled round count changes (e.g., stage selection or toggling)
  React.useEffect(() => {
    setBaseRatios(null);
  }, [enabledCount]);

  // Handle slider change - scale all enabled upcoming rounds proportionally
  const handleTotalDilutionChange = React.useCallback(
    (values: number[]) => {
      if (!form || !upcomingRoundIndices || !baseRatios) return;

      const newTotalDilution = values[0];

      // Get enabled round indices
      const enabledIndices = upcomingRoundIndices.filter((idx) => {
        const round = form.getValues(`dilution_rounds.${idx}`) as DilutionRoundForm;
        return round?.enabled;
      });

      // Distribute the new total dilution according to base ratios
      enabledIndices.forEach((originalIdx, i) => {
        if (i < baseRatios.length) {
          const newDilution = Math.round(newTotalDilution * baseRatios[i] * 10) / 10;
          // Clamp to valid range
          const clampedDilution = Math.max(0, Math.min(50, newDilution));
          form.setValue(`dilution_rounds.${originalIdx}.dilution_pct`, clampedDilution);
        }
      });
    },
    [form, upcomingRoundIndices, baseRatios]
  );

  // Don't render if no rounds at all
  if (completedRounds.length === 0 && upcomingRounds.length === 0) {
    return null;
  }

  // Calculate dilution factors
  const historicalFactor = calculateDilutionFactor(completedRounds);
  const projectedFactor = calculateDilutionFactor(upcomingRounds);
  const totalFactor = historicalFactor * projectedFactor;

  // Convert to percentages (formatted without trailing .0)
  const historicalDilution = formatPct((1 - historicalFactor) * 100);
  const projectedDilution = formatPct((1 - projectedFactor) * 100);
  const totalDilution = formatPct((1 - totalFactor) * 100);
  const equityRemaining = Math.round(totalFactor * 100);

  // Progress bar segments (as percentages of the bar)
  const historicalBarWidth = (1 - historicalFactor) * 100;
  const projectedBarWidth = historicalFactor * (1 - projectedFactor) * 100;
  const remainingBarWidth = totalFactor * 100;

  // Calculate total projected dilution percentage for slider
  const projectedDilutionPct = (1 - projectedFactor) * 100;

  return (
    <Card className="terminal-card">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <PieChart className="text-muted-foreground h-4 w-4" />
          <CardTitle className="text-sm font-medium">Dilution Overview</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main equity remaining display */}
        <div className="py-2 text-center">
          <p className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">
            Equity Remaining
          </p>
          <p className="text-4xl font-semibold tabular-nums" data-testid="equity-remaining">
            <AnimatedNumber value={equityRemaining} />
            <span className="text-muted-foreground text-xl">%</span>
          </p>
        </div>

        {/* Total Projected Dilution Slider */}
        {form && upcomingRoundIndices && hasEnabledUpcoming && (
          <div className="border-input space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="text-muted-foreground h-4 w-4" />
                <Label className="text-sm font-medium">Total Projected Dilution</Label>
              </div>
              <span className="text-chart-3 text-lg font-semibold tabular-nums">
                {formatPct(projectedDilutionPct)}%
              </span>
            </div>
            <Slider
              value={[projectedDilutionPct]}
              onValueChange={handleTotalDilutionChange}
              min={0}
              max={80}
              step={1}
              className="w-full"
            />
            <p className="text-muted-foreground text-xs">
              Adjusts all enabled future rounds proportionally
            </p>
          </div>
        )}

        {/* Visual progress bar */}
        <div className="space-y-2">
          <div
            className="bg-muted flex h-3 overflow-hidden rounded-full"
            data-testid="dilution-progress-bar"
          >
            {/* Historical dilution (chart-1: dark forest green) */}
            {historicalBarWidth > 0 && (
              <div
                className="bg-chart-1 h-full"
                style={{ width: `${historicalBarWidth}%` }}
                title={`Historical: ${historicalDilution}%`}
              />
            )}
            {/* Projected dilution (chart-3: lime green) */}
            {projectedBarWidth > 0 && (
              <div
                className="bg-chart-3 h-full"
                style={{ width: `${projectedBarWidth}%` }}
                title={`Projected: ${projectedDilution}%`}
              />
            )}
            {/* Remaining equity (chart-4: teal/mint) */}
            <div
              className="bg-chart-4 h-full"
              style={{ width: `${remainingBarWidth}%` }}
              title={`Remaining: ${equityRemaining}%`}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="bg-chart-1 h-2.5 w-2.5 rounded-sm" />
              <span className="text-muted-foreground">Historical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="bg-chart-3 h-2.5 w-2.5 rounded-sm" />
              <span className="text-muted-foreground">Projected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="bg-chart-4 h-2.5 w-2.5 rounded-sm" />
              <span className="text-muted-foreground">Remaining</span>
            </div>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className="border-muted-foreground/20 grid grid-cols-3 gap-2 border-t pt-2">
          <div className="min-w-0 text-center">
            <p className="text-muted-foreground flex items-center justify-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              Historical
            </p>
            <p
              className="text-chart-1 truncate text-sm font-semibold tabular-nums"
              data-testid="historical-dilution"
            >
              {historicalDilution}%
            </p>
          </div>
          <div className="min-w-0 text-center">
            <p className="text-muted-foreground flex items-center justify-center gap-1 text-xs">
              <Target className="h-3 w-3" />
              Projected
            </p>
            <p
              className="text-chart-3 truncate text-sm font-semibold tabular-nums"
              data-testid="projected-dilution"
            >
              {projectedDilution}%
            </p>
          </div>
          <div className="min-w-0 text-center">
            <p className="text-muted-foreground flex items-center justify-center gap-1 text-xs">
              <TrendingDown className="h-3 w-3" />
              Total
            </p>
            <p
              className="text-destructive truncate text-sm font-semibold tabular-nums"
              data-testid="total-dilution"
            >
              {totalDilution}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
