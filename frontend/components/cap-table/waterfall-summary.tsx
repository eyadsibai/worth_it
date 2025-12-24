"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { WaterfallDistribution, PreferenceTier } from "@/lib/schemas";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format-utils";
import { AnimatedCurrencyDisplay, AnimatedNumber, AnimatedPercentage } from "@/lib/motion";

interface WaterfallSummaryProps {
  distribution: WaterfallDistribution | null;
  preferenceTiers: PreferenceTier[];
  exitValuation: number;
  highlightedStakeholderId?: string;
  onSelectStakeholder?: (stakeholderId: string) => void;
}

/**
 * WaterfallSummary - Plain English explanation of liquidation waterfall
 *
 * Provides:
 * 1. Clear explanation of how exit proceeds are distributed
 * 2. Visual flow diagram showing distribution order
 * 3. Highlighted payout for selected stakeholder
 */
export function WaterfallSummary({
  distribution,
  preferenceTiers,
  exitValuation,
  highlightedStakeholderId,
  onSelectStakeholder,
}: WaterfallSummaryProps) {
  // Empty/loading state
  if (!distribution) {
    return (
      <div className="bg-card rounded-xl border p-6 text-center">
        <p className="text-muted-foreground">No distribution data available. Loading...</p>
      </div>
    );
  }

  // Get highlighted stakeholder payout
  const highlightedPayout = highlightedStakeholderId
    ? distribution.stakeholder_payouts.find((p) => p.stakeholder_id === highlightedStakeholderId)
    : undefined;

  // Check if there are preference tiers
  const hasPreferences = preferenceTiers.length > 0;

  return (
    <div className="space-y-6">
      {/* Title and explanation */}
      <div className="bg-card rounded-xl border p-6">
        <h3 className="mb-4 text-lg font-semibold">How Exit Proceeds Are Distributed</h3>

        <div className="text-muted-foreground space-y-3 text-sm">
          <p>
            At an exit valuation of{" "}
            <span className="text-foreground font-semibold">
              <AnimatedNumber value={exitValuation} formatValue={(v) => formatCurrencyCompact(v)} />
            </span>
            , here&apos;s how the money flows:
          </p>

          {/* Preference explanation */}
          <div data-testid="preference-explanation" className="space-y-2">
            {hasPreferences ? (
              <p className="[&>b]:text-foreground [&>b]:font-semibold">
                <b>Preferred investors get paid first</b> — before common shareholders see any
                money, senior investors receive their guaranteed returns.
                {preferenceTiers.some((t) => t.participating) && (
                  <>
                    {" "}
                    Some investors have <b>participating</b> rights, meaning they get their
                    guaranteed amount AND a share of the remaining proceeds.
                  </>
                )}
              </p>
            ) : (
              <p data-testid="no-preferences-message">
                <strong className="text-foreground">No preference tiers</strong> are configured. All
                proceeds go directly to shareholders based on their ownership percentages.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Visual Flow Diagram - only show when there are preferences to explain */}
      {hasPreferences && (
        <div
          data-testid="waterfall-flow-diagram"
          aria-label="Waterfall distribution flow showing how exit proceeds are distributed step by step"
          className="bg-card rounded-xl border p-6"
        >
          <h4 className="text-muted-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
            Distribution Flow
          </h4>

          <div className="space-y-2">
            {distribution.waterfall_steps.map((step, index) => (
              <React.Fragment key={step.step_number}>
                {/* Flow step */}
                <div
                  data-testid={`flow-step-${step.step_number}`}
                  className={cn("rounded-lg border p-4", getStepColorClass(step.description))}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="bg-foreground/10 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
                          {step.step_number}
                        </span>
                        <span
                          className="text-sm font-medium"
                          data-testid={`step-description-${step.step_number}`}
                        >
                          {step.description}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Recipients: {step.recipients.join(", ")}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums">{formatCurrency(step.amount)}</p>
                      {step.remaining_proceeds > 0 && (
                        <p className="text-muted-foreground text-xs">
                          {formatCurrency(step.remaining_proceeds)} remaining
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Connector arrow */}
                {index < distribution.waterfall_steps.length - 1 && (
                  <div data-testid="flow-connector" className="flex justify-center py-1">
                    <svg
                      className="text-muted-foreground/50 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                      />
                    </svg>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Highlighted Stakeholder Payout */}
      {highlightedPayout && (
        <div data-testid="highlighted-payout" className="bg-primary/5 rounded-xl border p-6">
          <h4 className="text-muted-foreground mb-2 text-sm font-semibold tracking-wide uppercase">
            {highlightedPayout.name}&apos;s Payout
          </h4>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold tabular-nums">
              <AnimatedCurrencyDisplay value={highlightedPayout.payout_amount} showDelta={false} />
            </span>
            <span className="text-muted-foreground text-lg tabular-nums">
              (<AnimatedPercentage value={highlightedPayout.payout_pct} decimals={1} />)
            </span>
            {highlightedPayout.roi !== undefined && (
              <span className="text-terminal text-lg font-semibold tabular-nums">
                <AnimatedNumber
                  value={highlightedPayout.roi}
                  formatValue={(v) => v.toFixed(1) + "x ROI"}
                />
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stakeholder Selector */}
      <div data-testid="stakeholder-selector" className="bg-card rounded-xl border p-4">
        <h4 className="mb-3 text-sm font-semibold">View Payout For</h4>
        <div className="flex flex-wrap gap-2">
          {distribution.stakeholder_payouts.map((payout) => (
            <button
              key={payout.stakeholder_id}
              type="button"
              onClick={() => onSelectStakeholder?.(payout.stakeholder_id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                payout.stakeholder_id === highlightedStakeholderId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {payout.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Color mapping for waterfall step types.
 * Maps step type identifiers to chart color classes.
 */
const STEP_TYPE_COLORS: Record<string, string> = {
  "series-b": "bg-chart-1/5 border-chart-1/20",
  senior: "bg-chart-1/5 border-chart-1/20",
  "series-a": "bg-chart-2/5 border-chart-2/20",
  seed: "bg-chart-3/5 border-chart-3/20",
  "pro-rata": "bg-chart-4/5 border-chart-4/20",
  remaining: "bg-chart-4/5 border-chart-4/20",
};

/**
 * Get appropriate color class for a waterfall step based on its description.
 * Uses a lookup table for maintainability.
 */
function getStepColorClass(description: string): string {
  const lowerDesc = description.toLowerCase();

  // Check each key pattern against the description
  for (const [key, colorClass] of Object.entries(STEP_TYPE_COLORS)) {
    // Convert key to pattern (e.g., "series-b" → "series b")
    const pattern = key.replace(/-/g, " ");
    if (lowerDesc.includes(pattern)) {
      return colorClass;
    }
  }

  return "bg-muted/50";
}
