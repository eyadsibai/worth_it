/**
 * Export utilities for downloading analysis results
 */

import type {
  StartupScenarioResponse,
  CapTable,
  FundingInstrument,
  WaterfallDistribution,
} from "@/lib/schemas";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  FrontendWinnerResult,
  FrontendMetricDiff,
  FrontendComparisonInsight,
} from "@/lib/schemas";

/**
 * Interface for saved scenario data in localStorage.
 * Note: Uses camelCase for UI-friendly storage format,
 * while API types use snake_case.
 */
export interface ScenarioData {
  name: string;
  timestamp: string;
  notes?: string;
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
    breakeven?: string;
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
export function exportResultsAsCSV(results: StartupScenarioResponse, filename: string): void {
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
 * Update notes for a saved scenario.
 * Returns true if the scenario was found and updated, false otherwise.
 */
export function updateScenarioNotes(timestamp: string, notes: string | undefined): boolean {
  try {
    const scenarios = getSavedScenarios();
    const index = scenarios.findIndex((s) => s.timestamp === timestamp);

    if (index === -1) {
      return false;
    }

    scenarios[index].notes = notes;
    localStorage.setItem("worth_it_scenarios", JSON.stringify(scenarios));
    return true;
  } catch (error) {
    console.error("Failed to update scenario notes:", error);
    return false;
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

/**
 * Generate a unique copy name for a scenario.
 * Handles existing "(Copy)" and "(Copy N)" suffixes intelligently.
 */
function generateCopyName(originalName: string, existingScenarios: ScenarioData[]): string {
  // Extract base name (removing existing (Copy) or (Copy N) suffix)
  const copyPattern = /^(.+?)\s*\(Copy(?:\s+(\d+))?\)$/;
  const match = originalName.match(copyPattern);
  const baseName = match ? match[1] : originalName;

  // Find all existing copy numbers for this base name
  const existingCopyNumbers: number[] = [];
  existingScenarios.forEach((scenario) => {
    if (scenario.name === `${baseName} (Copy)`) {
      existingCopyNumbers.push(1);
    } else {
      const scenarioMatch = scenario.name.match(
        new RegExp(`^${escapeRegex(baseName)}\\s*\\(Copy\\s+(\\d+)\\)$`)
      );
      if (scenarioMatch) {
        existingCopyNumbers.push(parseInt(scenarioMatch[1], 10));
      }
    }
  });

  // Find next available copy number
  if (existingCopyNumbers.length === 0) {
    return `${baseName} (Copy)`;
  }

  const maxNumber = Math.max(...existingCopyNumbers);
  return `${baseName} (Copy ${maxNumber + 1})`;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Duplicate a saved scenario, creating a copy with a new name and timestamp.
 * Returns the duplicated scenario or null if the original wasn't found.
 */
export function duplicateScenario(timestamp: string): ScenarioData | null {
  try {
    const scenarios = getSavedScenarios();
    const original = scenarios.find((s) => s.timestamp === timestamp);

    if (!original) {
      return null;
    }

    // Deep clone the scenario data
    const copy: ScenarioData = JSON.parse(JSON.stringify(original));

    // Generate a unique copy name
    copy.name = generateCopyName(original.name, scenarios);

    // Generate new timestamp
    copy.timestamp = new Date().toISOString();

    // Save the copy
    saveScenario(copy);

    return copy;
  } catch (error) {
    console.error("Failed to duplicate scenario:", error);
    return null;
  }
}

// ============================================================================
// Generic Helper Functions (defined early for use in export functions)
// ============================================================================

/**
 * Escape a string for CSV format according to RFC 4180
 * - Wraps in quotes if contains comma, newline, or double quote
 * - Escapes internal double quotes by doubling them
 */
function escapeCSV(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * Sanitize a string for use in filenames.
 * Removes or replaces all non-alphanumeric characters (except hyphens),
 * collapses consecutive hyphens, and trims leading/trailing hyphens.
 */
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-") // Replace non-alphanumeric sequences with hyphen
    .replace(/-+/g, "-") // Collapse consecutive hyphens
    .replace(/^-|-$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Get a consistent date string for export filenames (YYYY-MM-DD format)
 */
function getExportDateString(): string {
  return new Date().toISOString().split("T")[0];
}

// ============================================================================
// Employee Mode Scenario Export Functions
// ============================================================================

/**
 * Interface for Monte Carlo statistics used in exports
 */
export interface MonteCarloExportStats {
  mean: number;
  median: number;
  stdDev: number;
  percentiles: Record<string, number>;
  profitProbability: number;
}

/**
 * Export a scenario as a comprehensive CSV file
 */
export function exportScenarioAsCSV(scenario: ScenarioData): void {
  const rows: string[] = [];
  const timestamp = getExportDateString();

  // Header section
  rows.push("Worth It Analysis Report");
  rows.push(`Generated,${timestamp}`);
  rows.push(`Scenario Name,${escapeCSV(scenario.name)}`);
  rows.push("");

  // Global Settings
  rows.push("GLOBAL SETTINGS");
  rows.push("Setting,Value");
  rows.push(`Exit Year,${scenario.globalSettings.exitYear}`);
  rows.push("");

  // Current Job
  rows.push("CURRENT JOB");
  rows.push("Metric,Value");
  rows.push(`Monthly Salary,${scenario.currentJob.monthlySalary}`);
  rows.push(`Annual Growth Rate,${(scenario.currentJob.annualGrowthRate * 100).toFixed(1)}%`);
  rows.push(`Assumed ROI,${(scenario.currentJob.assumedROI * 100).toFixed(1)}%`);
  rows.push(`Investment Frequency,${escapeCSV(scenario.currentJob.investmentFrequency)}`);
  rows.push("");

  // Equity Details
  rows.push("STARTUP OFFER");
  rows.push("Metric,Value");
  rows.push(`Equity Type,${escapeCSV(scenario.equity.type)}`);
  rows.push(`Monthly Salary,${scenario.equity.monthlySalary}`);
  rows.push(`Vesting Period,${scenario.equity.vestingPeriod} years`);
  rows.push(`Cliff Period,${scenario.equity.cliffPeriod} year(s)`);

  if (scenario.equity.type === "RSU") {
    rows.push(`Equity Percentage,${((scenario.equity.equityPct || 0) * 100).toFixed(2)}%`);
    rows.push(`Exit Valuation,${scenario.equity.exitValuation || 0}`);
    if (scenario.equity.simulateDilution !== undefined) {
      rows.push(`Simulate Dilution,${scenario.equity.simulateDilution ? "Yes" : "No"}`);
    }
  } else {
    rows.push(`Number of Options,${scenario.equity.numOptions || 0}`);
    rows.push(`Strike Price,${scenario.equity.strikePrice || 0}`);
    rows.push(`Exit Price per Share,${scenario.equity.exitPricePerShare || 0}`);
  }
  rows.push("");

  // Results
  rows.push("RESULTS");
  rows.push("Metric,Value");
  rows.push(`Final Payout Value,${scenario.results.finalPayoutValue}`);
  rows.push(`Final Opportunity Cost,${scenario.results.finalOpportunityCost}`);
  rows.push(`Net Outcome,${scenario.results.netOutcome}`);
  rows.push(`Verdict,${scenario.results.netOutcome >= 0 ? "WORTH IT" : "NOT WORTH IT"}`);
  if (scenario.results.breakeven) {
    rows.push(`Breakeven,${escapeCSV(scenario.results.breakeven)}`);
  }

  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  const csvFilename = `scenario-${sanitizeFilename(scenario.name)}-${timestamp}.csv`;
  downloadBlob(blob, csvFilename);
}

/**
 * Export a scenario as a JSON file for backup/import
 */
export function exportScenarioAsJSON(
  scenario: ScenarioData,
  monteCarloStats?: MonteCarloExportStats
): void {
  const timestamp = getExportDateString();
  const exportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    scenario: scenario,
    monteCarloStats: monteCarloStats || null,
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const jsonFilename = `scenario-${sanitizeFilename(scenario.name)}-${timestamp}.json`;
  downloadBlob(blob, jsonFilename);
}

/**
 * Export a scenario as a professional PDF report
 */
export function exportScenarioAsPDF(
  scenario: ScenarioData,
  monteCarloStats?: MonteCarloExportStats
): void {
  const doc = new jsPDF();
  const timestamp = getExportDateString();
  const verdictText = scenario.results.netOutcome >= 0 ? "WORTH IT" : "NOT WORTH IT";

  // Title
  doc.setFontSize(24);
  doc.text("Worth It Analysis Report", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${timestamp}`, 14, 30);
  doc.text(`Scenario: ${scenario.name}`, 14, 36);
  doc.setTextColor(0);

  // Executive Summary Box
  doc.setFontSize(14);
  doc.text("Executive Summary", 14, 50);

  doc.setFontSize(11);
  const netOutcomeFormatted = formatNumber(scenario.results.netOutcome);
  doc.text(`Net Benefit: $${netOutcomeFormatted} (${verdictText})`, 14, 60);
  doc.text(`Equity Payout: $${formatNumber(scenario.results.finalPayoutValue)}`, 14, 68);
  doc.text(`Opportunity Cost: $${formatNumber(scenario.results.finalOpportunityCost)}`, 14, 76);
  if (scenario.results.breakeven) {
    doc.text(`Breakeven: ${scenario.results.breakeven}`, 14, 84);
  }

  // Inputs Table
  doc.setFontSize(14);
  doc.text("Analysis Inputs", 14, 100);

  const inputData = [
    ["Exit Horizon", `Year ${scenario.globalSettings.exitYear}`],
    ["Current Monthly Salary", `$${formatNumber(scenario.currentJob.monthlySalary)}`],
    ["Salary Growth Rate", `${(scenario.currentJob.annualGrowthRate * 100).toFixed(1)}%`],
    ["Investment ROI", `${(scenario.currentJob.assumedROI * 100).toFixed(1)}%`],
    ["Startup Monthly Salary", `$${formatNumber(scenario.equity.monthlySalary)}`],
    ["Equity Type", scenario.equity.type === "RSU" ? "RSU" : "Stock Options"],
    ["Vesting Period", `${scenario.equity.vestingPeriod} years`],
    ["Cliff Period", `${scenario.equity.cliffPeriod} year(s)`],
  ];

  // Add equity-specific details (use 2 decimal places for equity percentage, consistent with CSV)
  if (scenario.equity.type === "RSU") {
    inputData.push([
      "Equity Percentage",
      `${((scenario.equity.equityPct || 0) * 100).toFixed(2)}%`,
    ]);
    inputData.push(["Exit Valuation", `$${formatNumber(scenario.equity.exitValuation || 0)}`]);
  } else {
    inputData.push(["Number of Options", formatNumber(scenario.equity.numOptions || 0)]);
    inputData.push(["Strike Price", `$${(scenario.equity.strikePrice || 0).toFixed(2)}`]);
    inputData.push(["Exit Price/Share", `$${(scenario.equity.exitPricePerShare || 0).toFixed(2)}`]);
  }

  autoTable(doc, {
    startY: 105,
    head: [["Parameter", "Value"]],
    body: inputData,
    theme: "striped",
    headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
    styles: { fontSize: 9 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY || 105;

  // Monte Carlo Section (if provided)
  if (monteCarloStats) {
    if (finalY > PDF_CONFIG.BREAK_THRESHOLD) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 15;
    }

    doc.setFontSize(14);
    doc.text("Monte Carlo Analysis", 14, finalY);

    const mcData = [
      ["Expected Value (Mean)", `$${formatNumber(monteCarloStats.mean)}`],
      ["Median Outcome", `$${formatNumber(monteCarloStats.median)}`],
      ["Standard Deviation", `$${formatNumber(monteCarloStats.stdDev)}`],
      ["Probability of Profit", `${(monteCarloStats.profitProbability * 100).toFixed(1)}%`],
    ];

    // Add percentiles
    Object.entries(monteCarloStats.percentiles).forEach(([key, value]) => {
      mcData.push([key, `$${formatNumber(value)}`]);
    });

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Metric", "Value"]],
      body: mcData,
      theme: "striped",
      headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
      styles: { fontSize: 9 },
    });
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Generated by Worth It - https://worth-it.app",
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - 30,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save the PDF with scenario name in filename for consistency with CSV/JSON
  const pdfFilename = `scenario-${sanitizeFilename(scenario.name)}-${timestamp}.pdf`;
  doc.save(pdfFilename);
}

/**
 * Format a number with thousands separators
 */
function formatNumber(value: number): string {
  return Math.round(value).toLocaleString();
}

/**
 * Pre-computed comparison data for PDF export.
 * This data should be computed via the backend API.
 */
export interface ComparisonDataForExport {
  winner: FrontendWinnerResult | null;
  diffs: FrontendMetricDiff[];
  insights: FrontendComparisonInsight[];
}

/**
 * Export scenario comparison as a professional PDF report
 * Compares multiple scenarios side-by-side with winner highlighting
 *
 * @param scenarios - Array of scenario data to compare
 * @param comparisonData - Pre-computed comparison metrics from backend API
 */
export function exportScenarioComparisonPDF(
  scenarios: ScenarioData[],
  comparisonData?: ComparisonDataForExport
): void {
  // Handle edge cases
  if (scenarios.length === 0) {
    return;
  }

  const doc = new jsPDF();
  const timestamp = getExportDateString();

  // Use pre-computed comparison metrics if provided
  const winner = comparisonData?.winner ?? null;
  const diffs = comparisonData?.diffs ?? [];
  const insights = comparisonData?.insights ?? [];

  // Title
  doc.setFontSize(24);
  doc.text("Scenario Comparison Report", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated: ${timestamp}`, 14, 30);
  doc.text(`Comparing ${scenarios.length} scenario${scenarios.length !== 1 ? "s" : ""}`, 14, 36);
  doc.setTextColor(0);

  // Winner Summary (if applicable)
  if (winner && !winner.isTie && winner.netOutcomeAdvantage > 0) {
    doc.setFontSize(14);
    doc.text("Winner", 14, 50);
    doc.setFontSize(11);
    doc.text(`${winner.winnerName} - Best Choice`, 14, 58);
    doc.setFontSize(10);
    doc.text(`Net outcome advantage: $${formatNumber(winner.netOutcomeAdvantage)}`, 14, 66);
  } else if (winner?.isTie) {
    doc.setFontSize(14);
    doc.text("Result: Tie", 14, 50);
    doc.setFontSize(10);
    doc.text("All scenarios have equal net outcomes", 14, 58);
  }

  // Comparison Table
  // Y positioning: winner box ends at ~70, tie text ends at ~58, no winner starts at 42
  const startY = winner ? (winner.isTie ? 70 : 80) : 50;
  doc.setFontSize(14);
  doc.text("Side-by-Side Comparison", 14, startY);

  // Build comparison table data
  const comparisonHeaders = ["Metric", ...scenarios.map((s) => s.name)];
  const comparisonTableRows = [
    ["Equity Type", ...scenarios.map((s) => (s.equity.type === "RSU" ? "RSU" : "Options"))],
    ["Exit Year", ...scenarios.map((s) => `Year ${s.globalSettings.exitYear}`)],
    ["Current Salary", ...scenarios.map((s) => `$${formatNumber(s.currentJob.monthlySalary)}/mo`)],
    ["Startup Salary", ...scenarios.map((s) => `$${formatNumber(s.equity.monthlySalary)}/mo`)],
    ["Final Payout", ...scenarios.map((s) => `$${formatNumber(s.results.finalPayoutValue)}`)],
    [
      "Opportunity Cost",
      ...scenarios.map((s) => `$${formatNumber(s.results.finalOpportunityCost)}`),
    ],
    [
      "Net Outcome",
      ...scenarios.map((s) => {
        const isWinner = winner && s.name === winner.winnerName && !winner.isTie;
        return `$${formatNumber(s.results.netOutcome)}${isWinner ? " ★" : ""}`;
      }),
    ],
    ["Verdict", ...scenarios.map((s) => (s.results.netOutcome >= 0 ? "WORTH IT" : "NOT WORTH IT"))],
  ];

  autoTable(doc, {
    startY: startY + 5,
    head: [comparisonHeaders],
    body: comparisonTableRows,
    theme: "striped",
    headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
    styles: { fontSize: 9 },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY || startY + 100;

  // Metric Differences Section
  if (diffs.length > 0) {
    if (finalY > PDF_CONFIG.BREAK_THRESHOLD) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 15;
    }

    doc.setFontSize(14);
    doc.text("Key Differences", 14, finalY);

    const diffData = diffs.map((diff) => [
      diff.label,
      `$${formatNumber(diff.absoluteDiff)}`,
      `${diff.percentageDiff.toFixed(1)}%`,
      diff.betterScenario,
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Metric", "Difference", "% Change", "Better Option"]],
      body: diffData,
      theme: "striped",
      headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
      styles: { fontSize: 9 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalY = (doc as any).lastAutoTable?.finalY || finalY + 50;
  }

  // Insights Section
  if (insights.length > 0) {
    if (finalY > PDF_CONFIG.BREAK_THRESHOLD) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 15;
    }

    doc.setFontSize(14);
    doc.text("Key Insights", 14, finalY);

    const insightData = insights.map((insight) => [insight.title, insight.description]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Insight", "Details"]],
      body: insightData,
      theme: "striped",
      headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
      styles: { fontSize: 9 },
      columnStyles: { 1: { cellWidth: 100 } },
    });
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      "Generated by Worth It - https://worth-it.app",
      14,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - 30,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save the PDF
  const scenarioNames = scenarios.map((s) => sanitizeFilename(s.name)).join("-vs-");
  const pdfFilename = `comparison-${scenarioNames}-${timestamp}.pdf`;
  doc.save(pdfFilename);
}

// ============================================================================
// Cap Table Export Functions
// ============================================================================

/**
 * Export cap table as CSV
 */
export function exportCapTableAsCSV(capTable: CapTable, filename: string): void {
  const rows: string[] = [];

  // Header
  rows.push(
    "Name,Type,Share Class,Shares,Ownership %,Vesting Period (months),Cliff Period (months),Vested Shares"
  );

  // Add stakeholders
  capTable.stakeholders.forEach((stakeholder) => {
    const vestingPeriod = stakeholder.vesting?.vesting_months ?? "N/A";
    const cliffPeriod = stakeholder.vesting?.cliff_months ?? "N/A";
    const vestedShares = stakeholder.vesting?.vested_shares ?? "N/A";

    rows.push(
      `${escapeCSV(stakeholder.name)},${stakeholder.type},${stakeholder.share_class},${stakeholder.shares},${stakeholder.ownership_pct},${vestingPeriod},${cliffPeriod},${vestedShares}`
    );
  });

  // Add summary
  rows.push("");
  rows.push("Summary,,,,,,");
  rows.push(`Total Shares,${capTable.total_shares},,,,,`);
  rows.push(`Option Pool %,${capTable.option_pool_pct},,,,,`);
  const totalOwnership = capTable.stakeholders.reduce((sum, s) => sum + s.ownership_pct, 0);
  rows.push(`Total Allocated %,${totalOwnership.toFixed(2)},,,,,`);

  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export funding history as CSV
 */
export function exportFundingHistoryAsCSV(
  instruments: FundingInstrument[],
  filename: string
): void {
  const rows: string[] = [];

  // Header
  rows.push("Type,Investor/Lead,Amount,Date,Status,Details");

  // Add each instrument
  instruments.forEach((instrument) => {
    const date = instrument.date || "N/A";

    if (instrument.type === "SAFE") {
      const capInfo = instrument.valuation_cap
        ? `Cap: $${instrument.valuation_cap.toLocaleString()}`
        : "";
      const discountInfo = instrument.discount_pct ? `Discount: ${instrument.discount_pct}%` : "";
      const details = [capInfo, discountInfo].filter(Boolean).join(", ");
      rows.push(
        `SAFE,${escapeCSV(instrument.investor_name)},${instrument.investment_amount},${date},${instrument.status},${escapeCSV(details)}`
      );
    } else if (instrument.type === "CONVERTIBLE_NOTE") {
      const capInfo = instrument.valuation_cap
        ? `Cap: $${instrument.valuation_cap.toLocaleString()}`
        : "";
      const discountInfo = instrument.discount_pct ? `Discount: ${instrument.discount_pct}%` : "";
      const interestInfo = `Interest: ${instrument.interest_rate}% (${instrument.interest_type})`;
      const maturityInfo = `Maturity: ${instrument.maturity_months} months`;
      const details = [capInfo, discountInfo, interestInfo, maturityInfo]
        .filter(Boolean)
        .join(", ");
      rows.push(
        `Convertible Note,${escapeCSV(instrument.investor_name)},${instrument.principal_amount},${date},${instrument.status},${escapeCSV(details)}`
      );
    } else if (instrument.type === "PRICED_ROUND") {
      const leadInfo = instrument.lead_investor || "N/A";
      const priceInfo = `Price/Share: $${instrument.price_per_share}`;
      const preMoneyInfo = `Pre-Money: $${instrument.pre_money_valuation.toLocaleString()}`;
      const liquidationInfo = `Liquidation: ${instrument.liquidation_multiplier}x${instrument.participating ? " (Participating)" : ""}`;
      const details = [priceInfo, preMoneyInfo, liquidationInfo].join(", ");
      rows.push(
        `${escapeCSV(`Priced Round (${instrument.round_name})`)},${escapeCSV(leadInfo)},${instrument.amount_raised},${date},active,${escapeCSV(details)}`
      );
    }
  });

  // Add summary
  rows.push("");
  rows.push("Summary,,,,,");
  rows.push(`Total Raised,${calculateTotalRaised(instruments)},,,`);

  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export exit scenarios as CSV
 */
export function exportExitScenariosAsCSV(
  capTable: CapTable,
  valuations: number[],
  filename: string
): void {
  const rows: string[] = [];

  // Header row - stakeholder names (escaped per RFC 4180)
  const headers = ["Exit Valuation"];
  capTable.stakeholders.forEach((s) => headers.push(escapeCSV(s.name)));
  rows.push(headers.join(","));

  // Add row for each valuation
  valuations.forEach((valuation) => {
    const row: string[] = [valuation.toString()];

    capTable.stakeholders.forEach((s) => {
      const payout = (valuation * s.ownership_pct) / 100;
      row.push(payout.toFixed(2));
    });

    rows.push(row.join(","));
  });

  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, `${filename}.csv`);
}

/**
 * Export cap table as comprehensive PDF report
 */
export function exportCapTableAsPDF(
  capTable: CapTable,
  instruments: FundingInstrument[],
  waterfall?: WaterfallDistribution
): void {
  const doc = new jsPDF();
  const timestamp = new Date().toLocaleDateString();

  // Title
  doc.setFontSize(20);
  doc.text("Cap Table Report", 14, 22);
  doc.setFontSize(10);
  doc.text(`Generated: ${timestamp}`, 14, 30);

  // Summary Statistics
  doc.setFontSize(14);
  doc.text("Summary", 14, 45);

  const totalOwnership = capTable.stakeholders.reduce((sum, s) => sum + s.ownership_pct, 0);
  const totalRaised = calculateTotalRaised(instruments);

  doc.setFontSize(10);
  doc.text(`Total Shares: ${capTable.total_shares.toLocaleString()}`, 14, 53);
  doc.text(`Option Pool: ${capTable.option_pool_pct}%`, 14, 60);
  doc.text(`Allocated Ownership: ${totalOwnership.toFixed(1)}%`, 14, 67);
  doc.text(`Total Raised: $${totalRaised.toLocaleString()}`, 14, 74);
  doc.text(`Number of Stakeholders: ${capTable.stakeholders.length}`, 14, 81);
  doc.text(`Number of Funding Rounds: ${instruments.length}`, 14, 88);

  // Stakeholders Table
  doc.setFontSize(14);
  doc.text("Stakeholders", 14, 103);

  const stakeholdersData = capTable.stakeholders.map((s) => [
    s.name,
    s.type,
    s.share_class,
    s.shares.toLocaleString(),
    `${s.ownership_pct.toFixed(2)}%`,
    s.vesting ? `${s.vesting.vesting_months}m/${s.vesting.cliff_months}m` : "No",
  ]);

  autoTable(doc, {
    startY: 108,
    head: [["Name", "Type", "Share Class", "Shares", "Ownership %", "Vesting"]],
    body: stakeholdersData,
    theme: "striped",
    headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
    styles: { fontSize: 9 },
  });

  // Get Y position after stakeholders table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY || 108;

  // Add new page if needed
  if (finalY > PDF_CONFIG.BREAK_THRESHOLD) {
    doc.addPage();
    finalY = 20;
  } else {
    finalY += 15;
  }

  // Funding History Table
  if (instruments.length > 0) {
    doc.setFontSize(14);
    doc.text("Funding History", 14, finalY);

    const fundingData = instruments.map((i) => {
      if (i.type === "SAFE") {
        return [
          "SAFE",
          i.investor_name,
          `$${i.investment_amount.toLocaleString()}`,
          i.valuation_cap ? `$${i.valuation_cap.toLocaleString()}` : "N/A",
          i.discount_pct ? `${i.discount_pct}%` : "N/A",
          i.status,
        ];
      } else if (i.type === "CONVERTIBLE_NOTE") {
        return [
          "Note",
          i.investor_name,
          `$${i.principal_amount.toLocaleString()}`,
          i.valuation_cap ? `$${i.valuation_cap.toLocaleString()}` : "N/A",
          `${i.interest_rate}%`,
          i.status,
        ];
      } else {
        return [
          i.round_name,
          i.lead_investor || "N/A",
          `$${i.amount_raised.toLocaleString()}`,
          `$${i.pre_money_valuation.toLocaleString()}`,
          `$${i.price_per_share.toFixed(2)}`,
          "Active",
        ];
      }
    });

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Type", "Investor/Lead", "Amount", "Valuation/Cap", "Discount/Price", "Status"]],
      body: fundingData,
      theme: "striped",
      headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
      styles: { fontSize: 8 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalY = (doc as any).lastAutoTable?.finalY || finalY;
  }

  // Add waterfall analysis if provided
  if (waterfall && waterfall.stakeholder_payouts.length > 0) {
    if (finalY > PDF_CONFIG.BREAK_THRESHOLD) {
      doc.addPage();
      finalY = 20;
    } else {
      finalY += 15;
    }

    doc.setFontSize(14);
    doc.text(`Waterfall Analysis ($${waterfall.exit_valuation.toLocaleString()} Exit)`, 14, finalY);

    const waterfallData = waterfall.stakeholder_payouts.map((p) => [
      p.name,
      `$${p.payout_amount.toLocaleString()}`,
      `${p.payout_pct.toFixed(2)}%`,
      p.roi ? `${p.roi.toFixed(2)}x` : "N/A",
    ]);

    autoTable(doc, {
      startY: finalY + 5,
      head: [["Stakeholder", "Payout", "% of Exit", "ROI"]],
      body: waterfallData,
      theme: "striped",
      headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
      styles: { fontSize: 9 },
    });
  }

  // Save the PDF with consistent filename pattern
  const pdfFilename = `cap-table-${getExportDateString()}.pdf`;
  doc.save(pdfFilename);
}

// ============================================================================
// Additional Helper Functions
// ============================================================================

/**
 * Download a Blob as a file
 */
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

/**
 * Calculate total funding raised from instruments
 */
export function calculateTotalRaised(instruments: FundingInstrument[]): number {
  return instruments.reduce((sum, i) => {
    if (i.type === "SAFE") return sum + i.investment_amount;
    if (i.type === "CONVERTIBLE_NOTE") return sum + i.principal_amount;
    if (i.type === "PRICED_ROUND") return sum + i.amount_raised;
    return sum;
  }, 0);
}

// PDF Configuration constants
const PDF_CONFIG = {
  PAGE_HEIGHT: 297,
  BREAK_THRESHOLD: 220,
  MARGIN: 14,
  COLORS: {
    PRIMARY: [59, 130, 246] as [number, number, number],
  },
} as const;
