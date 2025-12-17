/**
 * Comparison utilities for scenario analysis
 * Provides winner identification, metric diffs, and insight generation
 */

import type { ScenarioData } from "@/lib/export-utils";
import { formatCurrency } from "@/lib/format-utils";

/**
 * Result of identifying the winning scenario
 */
export interface WinnerResult {
  winnerName: string;
  winnerIndex: number;
  netOutcomeAdvantage: number;
  isTie: boolean;
}

/**
 * Difference between scenarios for a specific metric
 */
export interface MetricDiff {
  metric: string;
  label: string;
  values: number[];
  scenarioNames: string[];
  absoluteDiff: number;
  percentageDiff: number;
  betterScenario: string;
  higherIsBetter: boolean;
}

/**
 * Insight generated from comparing scenarios
 */
export interface ComparisonInsight {
  type: "winner" | "tradeoff" | "observation";
  title: string;
  description: string;
  scenarioName?: string;
  icon?: "trophy" | "scale" | "info";
}

/**
 * Aggregate comparison metrics
 */
export interface ComparisonMetrics {
  winner: WinnerResult;
  diffs: MetricDiff[];
  insights: ComparisonInsight[];
}

/**
 * Identifies the scenario with the best net outcome
 */
export function identifyWinner(scenarios: ScenarioData[]): WinnerResult {
  if (scenarios.length === 0) {
    return {
      winnerName: "",
      winnerIndex: -1,
      netOutcomeAdvantage: 0,
      isTie: false,
    };
  }

  // Find max net outcome
  let maxOutcome = scenarios[0].results.netOutcome;
  let winnerIndex = 0;

  for (let i = 1; i < scenarios.length; i++) {
    if (scenarios[i].results.netOutcome > maxOutcome) {
      maxOutcome = scenarios[i].results.netOutcome;
      winnerIndex = i;
    }
  }

  // Check for ties
  const tieCount = scenarios.filter(
    (s) => s.results.netOutcome === maxOutcome
  ).length;
  const isTie = tieCount > 1;

  // Calculate advantage over second place
  const sortedOutcomes = scenarios
    .map((s) => s.results.netOutcome)
    .sort((a, b) => b - a);

  const netOutcomeAdvantage =
    sortedOutcomes.length > 1 ? sortedOutcomes[0] - sortedOutcomes[1] : 0;

  return {
    winnerName: scenarios[winnerIndex].name,
    winnerIndex,
    netOutcomeAdvantage,
    isTie,
  };
}

/**
 * Calculate percentage and absolute differences for key metrics
 */
export function calculateMetricDiffs(scenarios: ScenarioData[]): MetricDiff[] {
  if (scenarios.length < 2) {
    return [];
  }

  const metrics: Array<{
    key: keyof ScenarioData["results"];
    label: string;
    higherIsBetter: boolean;
  }> = [
    { key: "netOutcome", label: "Net Outcome", higherIsBetter: true },
    { key: "finalPayoutValue", label: "Final Payout", higherIsBetter: true },
    {
      key: "finalOpportunityCost",
      label: "Opportunity Cost",
      higherIsBetter: false,
    },
  ];

  return metrics.map((metric) => {
    const values = scenarios.map((s) => s.results[metric.key] as number);
    const scenarioNames = scenarios.map((s) => s.name);

    // Find best and worst values
    const bestValue = metric.higherIsBetter
      ? Math.max(...values)
      : Math.min(...values);
    const worstValue = metric.higherIsBetter
      ? Math.min(...values)
      : Math.max(...values);

    const bestIndex = values.indexOf(bestValue);
    const betterScenario = scenarioNames[bestIndex];

    // Calculate absolute difference
    const absoluteDiff = Math.abs(bestValue - worstValue);

    // Calculate percentage difference (avoid division by zero)
    let percentageDiff = 0;
    if (worstValue !== 0) {
      percentageDiff = (absoluteDiff / Math.abs(worstValue)) * 100;
    } else if (bestValue !== 0) {
      // If baseline is 0 but other value exists, use 100%
      percentageDiff = 100;
    }

    return {
      metric: metric.key,
      label: metric.label,
      values,
      scenarioNames,
      absoluteDiff,
      percentageDiff,
      betterScenario,
      higherIsBetter: metric.higherIsBetter,
    };
  });
}

/**
 * Generate human-readable insights from scenario comparison
 */
export function generateComparisonInsights(
  scenarios: ScenarioData[]
): ComparisonInsight[] {
  if (scenarios.length < 2) {
    return [];
  }

  const insights: ComparisonInsight[] = [];

  // 1. Winner insight
  const winner = identifyWinner(scenarios);
  if (!winner.isTie && winner.netOutcomeAdvantage > 0) {
    insights.push({
      type: "winner",
      title: `${winner.winnerName} offers higher total value`,
      description: `Net outcome is ${formatCurrency(winner.netOutcomeAdvantage)} more than the next best option.`,
      scenarioName: winner.winnerName,
      icon: "trophy",
    });
  } else if (winner.isTie) {
    insights.push({
      type: "observation",
      title: "Scenarios are equally valuable",
      description:
        "All scenarios have the same net outcome. Consider other factors like risk and timeline.",
      icon: "info",
    });
  }

  // 2. Trade-off insight (salary vs equity)
  const salaryDiffs = scenarios.map((s) => s.equity.monthlySalary);
  const maxSalary = Math.max(...salaryDiffs);
  const minSalary = Math.min(...salaryDiffs);
  const salaryDiffPct = minSalary > 0 ? ((maxSalary - minSalary) / minSalary) * 100 : 0;

  if (salaryDiffPct > 10) {
    // Significant salary difference
    const highSalaryScenario = scenarios.find(
      (s) => s.equity.monthlySalary === maxSalary
    );
    const lowSalaryScenario = scenarios.find(
      (s) => s.equity.monthlySalary === minSalary
    );

    if (highSalaryScenario && lowSalaryScenario) {
      // Check if there's a trade-off (higher salary but lower outcome)
      const highSalaryWins =
        highSalaryScenario.results.netOutcome >
        lowSalaryScenario.results.netOutcome;

      if (!highSalaryWins) {
        insights.push({
          type: "tradeoff",
          title: "Salary vs. Equity Trade-off",
          description: `${highSalaryScenario.name} pays ${formatCurrency(maxSalary - minSalary)}/mo more, but ${lowSalaryScenario.name} has better equity upside.`,
          icon: "scale",
        });
      }
    }
  }

  // 3. Breakeven insight
  const breakevenScenarios = scenarios.filter((s) => s.results.breakeven);
  if (breakevenScenarios.length > 0) {
    const earliestBreakeven = breakevenScenarios.reduce((earliest, current) => {
      const currentYear = parseInt(current.results.breakeven?.replace(/\D/g, "") || "99");
      const earliestYear = parseInt(earliest.results.breakeven?.replace(/\D/g, "") || "99");
      return currentYear < earliestYear ? current : earliest;
    });

    if (earliestBreakeven.results.breakeven) {
      insights.push({
        type: "observation",
        title: "Earliest Breakeven",
        description: `${earliestBreakeven.name} reaches breakeven at ${earliestBreakeven.results.breakeven}.`,
        scenarioName: earliestBreakeven.name,
        icon: "info",
      });
    }
  }

  // Limit to top 5 most relevant insights
  return insights.slice(0, 5);
}

/**
 * Get all comparison metrics for a set of scenarios
 */
export function getComparisonMetrics(
  scenarios: ScenarioData[]
): ComparisonMetrics {
  return {
    winner: identifyWinner(scenarios),
    diffs: calculateMetricDiffs(scenarios),
    insights: generateComparisonInsights(scenarios),
  };
}
