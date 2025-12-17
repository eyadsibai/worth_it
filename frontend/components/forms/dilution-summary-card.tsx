"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, TrendingDown } from "lucide-react";
import type { DilutionRoundForm } from "@/lib/schemas";

interface DilutionSummaryCardProps {
  completedRounds: DilutionRoundForm[];
  upcomingRounds: DilutionRoundForm[];
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

  // Convert to percentages
  const historicalDilution = ((1 - historicalFactor) * 100).toFixed(1);
  const projectedDilution = ((1 - projectedFactor) * 100).toFixed(1);
  const totalDilution = ((1 - totalFactor) * 100).toFixed(1);
  const equityRemaining = Math.round(totalFactor * 100);

  // Progress bar segments (as percentages of the bar)
  const historicalBarWidth = (1 - historicalFactor) * 100;
  const projectedBarWidth = historicalFactor * (1 - projectedFactor) * 100;
  const remainingBarWidth = totalFactor * 100;

  return (
    <Card className="bg-white border-0 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_2px_8px_rgba(0,0,0,0.04)]">
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
            {/* Historical dilution (dark forest green) */}
            {historicalBarWidth > 0 && (
              <div
                className="h-full bg-[hsl(150,40%,25%)]"
                style={{ width: `${historicalBarWidth}%` }}
                title={`Historical: ${historicalDilution}%`}
              />
            )}
            {/* Projected dilution (lime green) */}
            {projectedBarWidth > 0 && (
              <div
                className="h-full bg-[hsl(75,50%,50%)]"
                style={{ width: `${projectedBarWidth}%` }}
                title={`Projected: ${projectedDilution}%`}
              />
            )}
            {/* Remaining equity (teal/mint) */}
            <div
              className="h-full bg-[hsl(165,50%,50%)]"
              style={{ width: `${remainingBarWidth}%` }}
              title={`Remaining: ${equityRemaining}%`}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(150,40%,25%)]" />
              <span className="text-muted-foreground">Historical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(75,50%,50%)]" />
              <span className="text-muted-foreground">Projected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm bg-[hsl(165,50%,50%)]" />
              <span className="text-muted-foreground">Remaining</span>
            </div>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Historical</p>
            <p
              className="text-sm font-semibold tabular-nums text-[hsl(150,40%,25%)]"
              data-testid="historical-dilution"
            >
              {historicalDilution}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Projected</p>
            <p
              className="text-sm font-semibold tabular-nums text-[hsl(75,40%,40%)]"
              data-testid="projected-dilution"
            >
              {projectedDilution}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p
              className="text-sm font-semibold tabular-nums flex items-center justify-center gap-1"
              data-testid="total-dilution"
            >
              <TrendingDown className="h-3 w-3 text-destructive" />
              {totalDilution}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
