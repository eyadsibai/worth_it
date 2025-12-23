"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, TrendingDown, Clock, Target } from "lucide-react";
import type { DilutionRoundForm } from "@/lib/schemas";

interface DilutionSummaryCardProps {
  completedRounds: DilutionRoundForm[];
  upcomingRounds: DilutionRoundForm[];
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
export function DilutionSummaryCard({ completedRounds, upcomingRounds }: DilutionSummaryCardProps) {
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
            {equityRemaining}
            <span className="text-muted-foreground text-xl">%</span>
          </p>
        </div>

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
