/**
 * Explanations for result metrics in the scenario results view.
 * These provide contextual help for understanding financial outcomes.
 */

export const RESULT_EXPLANATIONS = {
  // Metric card tooltips
  finalPayout:
    "The total value of your equity stake at exit, after accounting for dilution from future funding rounds. This is what you would actually receive when the company is sold or goes public.",
  opportunityCost:
    "What you would have accumulated by staying at your current job and investing the salary difference. Includes salary growth and compound investment returns over the analysis period.",
  netBenefit:
    "Final Payout minus Opportunity Cost. A positive number means the startup offer is worth more than staying at your current job. A negative number means you're better off staying.",
  totalDilution:
    "The percentage of your initial equity that's been reduced by future funding rounds. Higher dilution means investors took larger stakes, reducing your slice of the pie.",
  breakEven:
    "The minimum company valuation needed at exit for your startup compensation to equal what you'd have at your current job. Below this valuation, staying is the better financial choice.",

  // Worth It badge explanations
  worthItPositive:
    "Based on your inputs, the startup equity offer is projected to be worth more than the alternative of staying at your current job and investing the salary difference.",
  worthItNegative:
    "Based on your inputs, staying at your current job and investing the salary difference is projected to be worth more than the startup equity offer.",
} as const;

/**
 * Generate a plain-English summary of the scenario results.
 */
export function generateResultsSummary({
  netBenefit,
  finalPayout,
  opportunityCost,
  exitYear,
  breakEvenValuation,
  totalDilution,
}: {
  netBenefit: number;
  finalPayout: number;
  opportunityCost: number;
  exitYear: number;
  breakEvenValuation?: number;
  totalDilution?: number;
}): string {
  const isPositive = netBenefit >= 0;
  const absNetBenefit = Math.abs(netBenefit);
  const formattedNet = formatCompact(absNetBenefit);
  const formattedPayout = formatCompact(finalPayout);
  const formattedOppCost = formatCompact(opportunityCost);

  let summary = "";

  if (isPositive) {
    summary = `Based on your inputs, taking this startup offer would net you **${formattedNet} more** than staying at your current job over ${exitYear} year${exitYear === 1 ? "" : "s"}.`;

    if (finalPayout > 0) {
      summary += ` Your equity would be worth **${formattedPayout}** at exit`;
      if (totalDilution !== undefined && totalDilution > 0) {
        summary += ` (after ${(totalDilution * 100).toFixed(0)}% dilution)`;
      }
      summary += ".";
    }
  } else {
    summary = `Based on your inputs, staying at your current job would net you **${formattedNet} more** than taking the startup offer over ${exitYear} year${exitYear === 1 ? "" : "s"}.`;
    summary += ` By staying and investing the salary difference, you'd accumulate **${formattedOppCost}**.`;
  }

  // Add break-even context if available
  if (breakEvenValuation !== undefined && breakEvenValuation > 0) {
    const formattedBreakEven = formatCompact(breakEvenValuation);
    if (isPositive) {
      summary += ` The company would need to reach at least **${formattedBreakEven}** for you to break even.`;
    } else {
      summary += ` You'd need the company to reach **${formattedBreakEven}** to match your current job's outcome.`;
    }
  }

  return summary;
}

/**
 * Format large numbers in a compact, readable way.
 */
function formatCompact(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000_000) {
    return `${sign}$${(absValue / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}$${(absValue / 1_000).toFixed(0)}K`;
  }
  return `${sign}$${absValue.toFixed(0)}`;
}

export type ResultExplanationKey = keyof typeof RESULT_EXPLANATIONS;
