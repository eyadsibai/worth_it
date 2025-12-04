/**
 * Export utilities for downloading analysis results
 */

export interface ScenarioData {
  name: string;
  timestamp: string;
  globalSettings: {
    exitYear: number;
  };
  currentJob: {
    monthlySalary: number;
    annualGrowthRate: number;
    assumedROI: number;
    investmentFrequency: string;
  };
  equity: {
    type: "RSU" | "STOCK_OPTIONS";
    monthlySalary: number;
    vestingPeriod: number;
    cliffPeriod: number;
    // RSU specific
    equityPct?: number;
    exitValuation?: number;
    simulateDilution?: boolean;
    // Options specific
    numOptions?: number;
    strikePrice?: number;
    exitPricePerShare?: number;
  };
  results: {
    finalPayoutValue: number;
    finalOpportunityCost: number;
    netOutcome: number;
    breakeven?: number;
  };
}

/**
 * Export data as JSON file
 */
export function exportAsJSON(data: unknown, filename: string): void {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * Export results data as CSV
 */
export function exportResultsAsCSV(
  results: Record<string, unknown>,
  filename: string
): void {
  const rows: string[] = [];

  // Header
  rows.push("Metric,Value");

  // Add each metric
  if (results.final_payout_value !== undefined) {
    rows.push(`Final Payout Value,${formatNumber(results.final_payout_value as number)}`);
  }
  if (results.final_opportunity_cost !== undefined) {
    rows.push(`Final Opportunity Cost,${formatNumber(results.final_opportunity_cost as number)}`);
  }
  if (results.net_outcome !== undefined) {
    rows.push(`Net Outcome,${formatNumber(results.net_outcome as number)}`);
  }
  if (results.breakeven_valuation !== undefined) {
    rows.push(`Breakeven Valuation,${formatNumber(results.breakeven_valuation as number)}`);
  }
  if (results.profit !== undefined) {
    rows.push(`Profit,${formatNumber(results.profit as number)}`);
  }
  if (results.breakeven_price_per_share !== undefined) {
    rows.push(`Breakeven Price/Share,${formatNumber(results.breakeven_price_per_share as number)}`);
  }

  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export Monte Carlo results as CSV
 */
export function exportMonteCarloAsCSV(
  netOutcomes: number[],
  simulatedValuations: number[],
  filename: string
): void {
  const rows: string[] = [];

  // Header
  rows.push("Simulation,Net Outcome,Simulated Valuation");

  // Add each simulation result
  for (let i = 0; i < netOutcomes.length; i++) {
    rows.push(`${i + 1},${netOutcomes[i]},${simulatedValuations[i] || ""}`);
  }

  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export Monte Carlo statistics as CSV
 */
export function exportMonteCarloStatsAsCSV(
  stats: {
    mean: number;
    median: number;
    stdDev: number;
    percentiles: Record<string, number>;
    profitProbability: number;
  },
  filename: string
): void {
  const rows: string[] = [];

  rows.push("Statistic,Value");
  rows.push(`Mean,${formatNumber(stats.mean)}`);
  rows.push(`Median,${formatNumber(stats.median)}`);
  rows.push(`Std Dev,${formatNumber(stats.stdDev)}`);
  rows.push(`Probability of Profit,${(stats.profitProbability * 100).toFixed(1)}%`);

  Object.entries(stats.percentiles).forEach(([key, value]) => {
    rows.push(`${key},${formatNumber(value)}`);
  });

  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Save scenario to localStorage
 */
export function saveScenario(scenario: ScenarioData): void {
  const savedScenarios = getSavedScenarios();
  savedScenarios.push(scenario);
  localStorage.setItem("worth_it_scenarios", JSON.stringify(savedScenarios));
}

/**
 * Get all saved scenarios from localStorage
 */
export function getSavedScenarios(): ScenarioData[] {
  const stored = localStorage.getItem("worth_it_scenarios");
  if (!stored) return [];
  try {
    return JSON.parse(stored) as ScenarioData[];
  } catch {
    return [];
  }
}

/**
 * Delete a saved scenario
 */
export function deleteScenario(timestamp: string): void {
  const scenarios = getSavedScenarios();
  const filtered = scenarios.filter((s) => s.timestamp !== timestamp);
  localStorage.setItem("worth_it_scenarios", JSON.stringify(filtered));
}

/**
 * Clear all saved scenarios
 */
export function clearAllScenarios(): void {
  localStorage.removeItem("worth_it_scenarios");
}

// Helper functions
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
