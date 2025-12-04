/**
 * Export utilities for downloading analysis results
 */

import type { StartupScenarioResponse } from "@/lib/schemas";

/**
 * Interface for saved scenario data in localStorage.
 * Note: Uses camelCase for UI-friendly storage format,
 * while API types use snake_case.
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
 * Exports actual StartupScenarioResponse fields matching the API schema
 */
export function exportResultsAsCSV(
  results: StartupScenarioResponse,
  filename: string
): void {
  const rows: string[] = [];

  // Header
  rows.push("Metric,Value");

  // Calculate net benefit (not in response but shown in UI)
  const netBenefit = results.final_payout_value - results.final_opportunity_cost;

  // Add key metrics using actual response fields with raw numbers for CSV compatibility
  rows.push(`Final Payout Value,${results.final_payout_value}`);
  rows.push(`Final Opportunity Cost,${results.final_opportunity_cost}`);
  rows.push(`Net Benefit,${netBenefit}`);
  rows.push(`Payout Label,${results.payout_label}`);
  rows.push(`Breakeven Label,${results.breakeven_label}`);

  // Add optional dilution fields if present
  if (results.total_dilution !== null && results.total_dilution !== undefined) {
    rows.push(`Total Dilution,${results.total_dilution}`);
  }
  if (results.diluted_equity_pct !== null && results.diluted_equity_pct !== undefined) {
    rows.push(`Diluted Equity Percentage,${results.diluted_equity_pct}`);
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

  // Add each simulation result with raw numbers (no formatting)
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
  // Use raw numbers for CSV compatibility
  rows.push(`Mean,${stats.mean}`);
  rows.push(`Median,${stats.median}`);
  rows.push(`Std Dev,${stats.stdDev}`);
  rows.push(`Probability of Profit,${stats.profitProbability}`);

  Object.entries(stats.percentiles).forEach(([key, value]) => {
    rows.push(`${key},${value}`);
  });

  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Save scenario to localStorage
 */
export function saveScenario(scenario: ScenarioData): void {
  try {
    const savedScenarios = getSavedScenarios();
    savedScenarios.push(scenario);
    localStorage.setItem("worth_it_scenarios", JSON.stringify(savedScenarios));
  } catch (error) {
    console.error("Failed to save scenario to localStorage:", error);
    throw new Error("Failed to save scenario. Storage may be full or unavailable.");
  }
}

/**
 * Get all saved scenarios from localStorage
 */
export function getSavedScenarios(): ScenarioData[] {
  try {
    const stored = localStorage.getItem("worth_it_scenarios");
    if (!stored) return [];
    return JSON.parse(stored) as ScenarioData[];
  } catch (error) {
    console.error("Failed to retrieve scenarios from localStorage:", error);
    return [];
  }
}

/**
 * Delete a saved scenario
 */
export function deleteScenario(timestamp: string): void {
  try {
    const scenarios = getSavedScenarios();
    const filtered = scenarios.filter((s) => s.timestamp !== timestamp);
    localStorage.setItem("worth_it_scenarios", JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete scenario from localStorage:", error);
    throw new Error("Failed to delete scenario. Storage may be unavailable.");
  }
}

/**
 * Clear all saved scenarios
 */
export function clearAllScenarios(): void {
  try {
    localStorage.removeItem("worth_it_scenarios");
  } catch (error) {
    console.error("Failed to clear scenarios from localStorage:", error);
    throw new Error("Failed to clear scenarios. Storage may be unavailable.");
  }
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
