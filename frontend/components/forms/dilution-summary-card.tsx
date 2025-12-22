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
export function DilutionSummaryCard({
  completedRounds,
  upcomingRounds,
}: DilutionSummaryCardProps) {
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
          <PieChart className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Dilution Overview</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main equity remaining display */}
        <div className="text-center py-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
            Equity Remaining
          </p>
          <p
            className="text-4xl font-semibold tabular-nums"
            data-testid="equity-remaining"
          >
            {equityRemaining}
            <span className="text-xl text-muted-foreground">%</span>
          </p>
        </div>

        {/* Visual progress bar */}
        <div className="space-y-2">
          <div
            className="h-3 bg-muted rounded-full overflow-hidden flex"
            data-testid="dilution-progress-bar"
          >
            {/* Historical dilution (chart-1: dark forest green) */}
            {historicalBarWidth > 0 && (
              <div
                className="h-full bg-chart-1"
                style={{ width: `${historicalBarWidth}%` }}
                title={`Historical: ${historicalDilution}%`}
              />
            )}
            {/* Projected dilution (chart-3: lime green) */}
            {projectedBarWidth > 0 && (
              <div
                className="h-full bg-chart-3"
                style={{ width: `${projectedBarWidth}%` }}
                title={`Projected: ${projectedDilution}%`}
              />
            )}
            {/* Remaining equity (chart-4: teal/mint) */}
            <div
              className="h-full bg-chart-4"
              style={{ width: `${remainingBarWidth}%` }}
              title={`Remaining: ${equityRemaining}%`}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-chart-1" />
              <span className="text-muted-foreground">Historical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-chart-3" />
              <span className="text-muted-foreground">Projected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-chart-4" />
              <span className="text-muted-foreground">Remaining</span>
            </div>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-muted-foreground/20">
          <div className="text-center min-w-0">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              Historical
            </p>
            <p
              className="text-sm font-semibold tabular-nums text-chart-1 truncate"
              data-testid="historical-dilution"
            >
              {historicalDilution}%
            </p>
          </div>
          <div className="text-center min-w-0">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Target className="h-3 w-3" />
              Projected
            </p>
            <p
              className="text-sm font-semibold tabular-nums text-chart-3 truncate"
              data-testid="projected-dilution"
            >
              {projectedDilution}%
            </p>
          </div>
          <div className="text-center min-w-0">
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Total
            </p>
            <p
              className="text-sm font-semibold tabular-nums text-destructive truncate"
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
