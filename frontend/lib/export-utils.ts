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
const JSON_INDENT_SPACES = 2;

export function exportAsJSON(data: unknown, filename: string): void {
  const jsonString = JSON.stringify(data, null, JSON_INDENT_SPACES);
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
  rows.push(`Annual Growth Rate,${(scenario.currentJob.annualGrowthRate * PDF_CONFIG.PCT_MULTIPLIER).toFixed(PDF_CONFIG.PCT_DECIMAL_PLACES)}%`);
  rows.push(`Assumed ROI,${(scenario.currentJob.assumedROI * PDF_CONFIG.PCT_MULTIPLIER).toFixed(PDF_CONFIG.PCT_DECIMAL_PLACES)}%`);
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
    rows.push(`Equity Percentage,${((scenario.equity.equityPct || 0) * PDF_CONFIG.PCT_MULTIPLIER).toFixed(PDF_CONFIG.DECIMAL_PLACES_2)}%`);
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

  const JSON_INDENT = 2;
  const jsonString = JSON.stringify(exportData, null, JSON_INDENT);
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
  doc.setFontSize(PDF_CONFIG.FONT_SIZE.TITLE);
  doc.text("Worth It Analysis Report", PDF_CONFIG.MARGIN, PDF_CONFIG.Y.TITLE);

  doc.setFontSize(PDF_CONFIG.FONT_SIZE.SMALL);
  doc.setTextColor(PDF_CONFIG.TEXT_COLOR.MUTED);
  doc.text(`Generated: ${timestamp}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUBTITLE_1);
  doc.text(`Scenario: ${scenario.name}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUBTITLE_2);
  doc.setTextColor(PDF_CONFIG.TEXT_COLOR.DEFAULT);

  // Executive Summary Box
  doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
  doc.text("Executive Summary", PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_START);

  doc.setFontSize(PDF_CONFIG.FONT_SIZE.BODY);
  const netOutcomeFormatted = formatNumber(scenario.results.netOutcome);
  doc.text(`Net Benefit: $${netOutcomeFormatted} (${verdictText})`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_BODY_3);
  doc.text(`Equity Payout: $${formatNumber(scenario.results.finalPayoutValue)}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_BODY_6);
  doc.text(`Opportunity Cost: $${formatNumber(scenario.results.finalOpportunityCost)}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_BODY_8);
  if (scenario.results.breakeven) {
    doc.text(`Breakeven: ${scenario.results.breakeven}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_BODY_10);
  }

  // Inputs Table
  doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
  doc.text("Analysis Inputs", PDF_CONFIG.MARGIN, PDF_CONFIG.Y.INPUTS_HEADING);

  const inputData = [
    ["Exit Horizon", `Year ${scenario.globalSettings.exitYear}`],
    ["Current Monthly Salary", `$${formatNumber(scenario.currentJob.monthlySalary)}`],
    ["Salary Growth Rate", `${(scenario.currentJob.annualGrowthRate * PDF_CONFIG.PCT_MULTIPLIER).toFixed(PDF_CONFIG.PCT_DECIMAL_PLACES)}%`],
    ["Investment ROI", `${(scenario.currentJob.assumedROI * PDF_CONFIG.PCT_MULTIPLIER).toFixed(PDF_CONFIG.PCT_DECIMAL_PLACES)}%`],
    ["Startup Monthly Salary", `$${formatNumber(scenario.equity.monthlySalary)}`],
    ["Equity Type", scenario.equity.type === "RSU" ? "RSU" : "Stock Options"],
    ["Vesting Period", `${scenario.equity.vestingPeriod} years`],
    ["Cliff Period", `${scenario.equity.cliffPeriod} year(s)`],
  ];

  // Add equity-specific details (use 2 decimal places for equity percentage, consistent with CSV)
  if (scenario.equity.type === "RSU") {
    inputData.push([
      "Equity Percentage",
      `${((scenario.equity.equityPct || 0) * PDF_CONFIG.PCT_MULTIPLIER).toFixed(PDF_CONFIG.DECIMAL_PLACES_2)}%`,
    ]);
    inputData.push(["Exit Valuation", `$${formatNumber(scenario.equity.exitValuation || 0)}`]);
  } else {
    inputData.push(["Number of Options", formatNumber(scenario.equity.numOptions || 0)]);
    inputData.push(["Strike Price", `$${(scenario.equity.strikePrice || 0).toFixed(PDF_CONFIG.DECIMAL_PLACES_2)}`]);
    inputData.push(["Exit Price/Share", `$${(scenario.equity.exitPricePerShare || 0).toFixed(PDF_CONFIG.DECIMAL_PLACES_2)}`]);
  }

  autoTable(doc, {
    startY: PDF_CONFIG.Y.INPUTS_TABLE_BODY,
    head: [["Parameter", "Value"]],
    body: inputData,
    theme: "striped",
    headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
    styles: { fontSize: PDF_CONFIG.FONT_SIZE.TABLE },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY || PDF_CONFIG.Y.INPUTS_TABLE_BODY;

  // Monte Carlo Section (if provided)
  if (monteCarloStats) {
    if (finalY > PDF_CONFIG.BREAK_THRESHOLD) {
      doc.addPage();
      finalY = PDF_CONFIG.Y.NEW_PAGE_START;
    } else {
      finalY += PDF_CONFIG.Y.SECTION_GAP;
    }

    doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
    doc.text("Monte Carlo Analysis", PDF_CONFIG.MARGIN, finalY);

    const mcData = [
      ["Expected Value (Mean)", `$${formatNumber(monteCarloStats.mean)}`],
      ["Median Outcome", `$${formatNumber(monteCarloStats.median)}`],
      ["Standard Deviation", `$${formatNumber(monteCarloStats.stdDev)}`],
      ["Probability of Profit", `${(monteCarloStats.profitProbability * PDF_CONFIG.PCT_MULTIPLIER).toFixed(PDF_CONFIG.PCT_DECIMAL_PLACES)}%`],
    ];

    // Add percentiles
    Object.entries(monteCarloStats.percentiles).forEach(([key, value]) => {
      mcData.push([key, `$${formatNumber(value)}`]);
    });

    autoTable(doc, {
      startY: finalY + PDF_CONFIG.Y.TABLE_GAP,
      head: [["Metric", "Value"]],
      body: mcData,
      theme: "striped",
      headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
      styles: { fontSize: PDF_CONFIG.FONT_SIZE.TABLE },
    });
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(PDF_CONFIG.FONT_SIZE.FOOTER);
    doc.setTextColor(PDF_CONFIG.TEXT_COLOR.FOOTER);
    doc.text(
      "Generated by Worth It - https://worth-it.app",
      PDF_CONFIG.MARGIN,
      doc.internal.pageSize.getHeight() - PDF_CONFIG.Y.FOOTER_OFFSET
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - PDF_CONFIG.Y.PAGE_NUMBER_OFFSET,
      doc.internal.pageSize.getHeight() - PDF_CONFIG.Y.FOOTER_OFFSET
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
  doc.setFontSize(PDF_CONFIG.FONT_SIZE.TITLE);
  doc.text("Scenario Comparison Report", PDF_CONFIG.MARGIN, PDF_CONFIG.Y.TITLE);

  doc.setFontSize(PDF_CONFIG.FONT_SIZE.SMALL);
  doc.setTextColor(PDF_CONFIG.TEXT_COLOR.MUTED);
  doc.text(`Generated: ${timestamp}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUBTITLE_1);
  doc.text(`Comparing ${scenarios.length} scenario${scenarios.length !== 1 ? "s" : ""}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUBTITLE_2);
  doc.setTextColor(PDF_CONFIG.TEXT_COLOR.DEFAULT);

  // Winner Summary (if applicable)
  if (winner && !winner.isTie && winner.netOutcomeAdvantage > 0) {
    doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
    doc.text("Winner", PDF_CONFIG.MARGIN, PDF_CONFIG.COMPARE_Y.WINNER_TITLE);
    doc.setFontSize(PDF_CONFIG.FONT_SIZE.BODY);
    doc.text(`${winner.winnerName} - Best Choice`, PDF_CONFIG.MARGIN, PDF_CONFIG.COMPARE_Y.WINNER_NAME);
    doc.setFontSize(PDF_CONFIG.FONT_SIZE.SMALL);
    doc.text(`Net outcome advantage: $${formatNumber(winner.netOutcomeAdvantage)}`, PDF_CONFIG.MARGIN, PDF_CONFIG.COMPARE_Y.WINNER_DETAIL);
  } else if (winner?.isTie) {
    doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
    doc.text("Result: Tie", PDF_CONFIG.MARGIN, PDF_CONFIG.COMPARE_Y.TIE_TITLE);
    doc.setFontSize(PDF_CONFIG.FONT_SIZE.SMALL);
    doc.text("All scenarios have equal net outcomes", PDF_CONFIG.MARGIN, PDF_CONFIG.COMPARE_Y.TIE_DETAIL);
  }

  // Comparison Table
  const startY = winner ? (winner.isTie ? PDF_CONFIG.COMPARE_Y.TABLE_WITH_TIE : PDF_CONFIG.COMPARE_Y.TABLE_WITH_WINNER) : PDF_CONFIG.COMPARE_Y.TABLE_NO_WINNER;
  doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
  doc.text("Side-by-Side Comparison", PDF_CONFIG.MARGIN, startY);

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
    startY: startY + PDF_CONFIG.Y.TABLE_GAP,
    head: [comparisonHeaders],
    body: comparisonTableRows,
    theme: "striped",
    headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
    styles: { fontSize: PDF_CONFIG.FONT_SIZE.TABLE },
  });

  const FALLBACK_TABLE_HEIGHT = 100;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY || startY + FALLBACK_TABLE_HEIGHT;

  // Metric Differences Section
  if (diffs.length > 0) {
    if (finalY > PDF_CONFIG.BREAK_THRESHOLD) {
      doc.addPage();
      finalY = PDF_CONFIG.Y.NEW_PAGE_START;
    } else {
      finalY += PDF_CONFIG.Y.SECTION_GAP;
    }

    doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
    doc.text("Key Differences", PDF_CONFIG.MARGIN, finalY);

    const diffData = diffs.map((diff) => [
      diff.label,
      `$${formatNumber(diff.absoluteDiff)}`,
      `${diff.percentageDiff.toFixed(PDF_CONFIG.PCT_DECIMAL_PLACES)}%`,
      diff.betterScenario,
    ]);

    autoTable(doc, {
      startY: finalY + PDF_CONFIG.Y.TABLE_GAP,
      head: [["Metric", "Difference", "% Change", "Better Option"]],
      body: diffData,
      theme: "striped",
      headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
      styles: { fontSize: PDF_CONFIG.FONT_SIZE.TABLE },
    });

    const FALLBACK_DIFF_TABLE_HEIGHT = 50;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalY = (doc as any).lastAutoTable?.finalY || finalY + FALLBACK_DIFF_TABLE_HEIGHT;
  }

  // Insights Section
  if (insights.length > 0) {
    if (finalY > PDF_CONFIG.BREAK_THRESHOLD) {
      doc.addPage();
      finalY = PDF_CONFIG.Y.NEW_PAGE_START;
    } else {
      finalY += PDF_CONFIG.Y.SECTION_GAP;
    }

    doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
    doc.text("Key Insights", PDF_CONFIG.MARGIN, finalY);

    const insightData = insights.map((insight) => [insight.title, insight.description]);

    autoTable(doc, {
      startY: finalY + PDF_CONFIG.Y.TABLE_GAP,
      head: [["Insight", "Details"]],
      body: insightData,
      theme: "striped",
      headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
      styles: { fontSize: PDF_CONFIG.FONT_SIZE.TABLE },
      columnStyles: { 1: { cellWidth: PDF_CONFIG.INSIGHT_DETAIL_WIDTH } },
    });
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(PDF_CONFIG.FONT_SIZE.FOOTER);
    doc.setTextColor(PDF_CONFIG.TEXT_COLOR.FOOTER);
    doc.text(
      "Generated by Worth It - https://worth-it.app",
      PDF_CONFIG.MARGIN,
      doc.internal.pageSize.getHeight() - PDF_CONFIG.Y.FOOTER_OFFSET
    );
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() - PDF_CONFIG.Y.PAGE_NUMBER_OFFSET,
      doc.internal.pageSize.getHeight() - PDF_CONFIG.Y.FOOTER_OFFSET
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
  rows.push(`Total Allocated %,${totalOwnership.toFixed(PDF_CONFIG.DECIMAL_PLACES_2)},,,,,`);

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
      const payout = (valuation * s.ownership_pct) / PDF_CONFIG.PCT_MULTIPLIER;
      row.push(payout.toFixed(PDF_CONFIG.DECIMAL_PLACES_2));
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

  const CAP_TABLE_FONT_SIZE = 20;
  // Title
  doc.setFontSize(CAP_TABLE_FONT_SIZE);
  doc.text("Cap Table Report", PDF_CONFIG.MARGIN, PDF_CONFIG.Y.TITLE);
  doc.setFontSize(PDF_CONFIG.FONT_SIZE.SMALL);
  doc.text(`Generated: ${timestamp}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUBTITLE_1);

  // Summary Statistics
  doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
  doc.text("Summary", PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_HEADING);

  const totalOwnership = capTable.stakeholders.reduce((sum, s) => sum + s.ownership_pct, 0);
  const totalRaised = calculateTotalRaised(instruments);

  doc.setFontSize(PDF_CONFIG.FONT_SIZE.SMALL);
  doc.text(`Total Shares: ${capTable.total_shares.toLocaleString()}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_BODY_1);
  doc.text(`Option Pool: ${capTable.option_pool_pct}%`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_BODY_3);
  doc.text(`Allocated Ownership: ${totalOwnership.toFixed(PDF_CONFIG.PCT_DECIMAL_PLACES)}%`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_BODY_5);
  doc.text(`Total Raised: $${totalRaised.toLocaleString()}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_BODY_7);
  doc.text(`Number of Stakeholders: ${capTable.stakeholders.length}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_BODY_9);
  doc.text(`Number of Funding Rounds: ${instruments.length}`, PDF_CONFIG.MARGIN, PDF_CONFIG.Y.SUMMARY_BODY_11);

  // Stakeholders Table
  doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
  doc.text("Stakeholders", PDF_CONFIG.MARGIN, PDF_CONFIG.Y.INPUTS_TABLE_START);

  const stakeholdersData = capTable.stakeholders.map((s) => [
    s.name,
    s.type,
    s.share_class,
    s.shares.toLocaleString(),
    `${s.ownership_pct.toFixed(PDF_CONFIG.DECIMAL_PLACES_2)}%`,
    s.vesting ? `${s.vesting.vesting_months}m/${s.vesting.cliff_months}m` : "No",
  ]);

  autoTable(doc, {
    startY: PDF_CONFIG.Y.INPUTS_TABLE_ALT,
    head: [["Name", "Type", "Share Class", "Shares", "Ownership %", "Vesting"]],
    body: stakeholdersData,
    theme: "striped",
    headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
    styles: { fontSize: PDF_CONFIG.FONT_SIZE.TABLE },
  });

  // Get Y position after stakeholders table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY || PDF_CONFIG.Y.INPUTS_TABLE_ALT;

  // Add new page if needed
  if (finalY > PDF_CONFIG.BREAK_THRESHOLD) {
    doc.addPage();
    finalY = PDF_CONFIG.Y.NEW_PAGE_START;
  } else {
    finalY += PDF_CONFIG.Y.SECTION_GAP;
  }

  // Funding History Table
  if (instruments.length > 0) {
    doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
    doc.text("Funding History", PDF_CONFIG.MARGIN, finalY);

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
          `$${i.price_per_share.toFixed(PDF_CONFIG.DECIMAL_PLACES_2)}`,
          "Active",
        ];
      }
    });

    autoTable(doc, {
      startY: finalY + PDF_CONFIG.Y.TABLE_GAP,
      head: [["Type", "Investor/Lead", "Amount", "Valuation/Cap", "Discount/Price", "Status"]],
      body: fundingData,
      theme: "striped",
      headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
      styles: { fontSize: PDF_CONFIG.FONT_SIZE.TABLE_SMALL },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalY = (doc as any).lastAutoTable?.finalY || finalY;
  }

  // Add waterfall analysis if provided
  if (waterfall && waterfall.stakeholder_payouts.length > 0) {
    if (finalY > PDF_CONFIG.BREAK_THRESHOLD) {
      doc.addPage();
      finalY = PDF_CONFIG.Y.NEW_PAGE_START;
    } else {
      finalY += PDF_CONFIG.Y.SECTION_GAP;
    }

    doc.setFontSize(PDF_CONFIG.FONT_SIZE.SECTION_HEADING);
    doc.text(`Waterfall Analysis ($${waterfall.exit_valuation.toLocaleString()} Exit)`, PDF_CONFIG.MARGIN, finalY);

    const waterfallData = waterfall.stakeholder_payouts.map((p) => [
      p.name,
      `$${p.payout_amount.toLocaleString()}`,
      `${p.payout_pct.toFixed(PDF_CONFIG.DECIMAL_PLACES_2)}%`,
      p.roi ? `${p.roi.toFixed(PDF_CONFIG.DECIMAL_PLACES_2)}x` : "N/A",
    ]);

    autoTable(doc, {
      startY: finalY + PDF_CONFIG.Y.TABLE_GAP,
      head: [["Stakeholder", "Payout", "% of Exit", "ROI"]],
      body: waterfallData,
      theme: "striped",
      headStyles: { fillColor: PDF_CONFIG.COLORS.PRIMARY },
      styles: { fontSize: PDF_CONFIG.FONT_SIZE.TABLE },
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

// PDF color values (blue primary for table headers)
const PDF_PRIMARY_R = 59;
const PDF_PRIMARY_G = 130;
const PDF_PRIMARY_B = 246;

// PDF Configuration constants
const PDF_CONFIG = {
  PAGE_HEIGHT: 297,
  BREAK_THRESHOLD: 220,
  MARGIN: 14,
  FONT_SIZE: {
    TITLE: 24,
    SECTION_HEADING: 14,
    BODY: 11,
    SMALL: 10,
    TABLE: 9,
    TABLE_SMALL: 8,
    FOOTER: 8,
  },
  TEXT_COLOR: {
    MUTED: 100,
    FOOTER: 150,
    DEFAULT: 0,
  },
  /** Y-positions for standard report layouts */
  Y: {
    TITLE: 22,
    SUBTITLE_1: 30,
    SUBTITLE_2: 36,
    SUMMARY_HEADING: 45,
    SUMMARY_START: 50,
    SUMMARY_BODY_1: 53,
    SUMMARY_BODY_2: 58,
    SUMMARY_BODY_3: 60,
    SUMMARY_BODY_4: 66,
    SUMMARY_BODY_5: 67,
    SUMMARY_BODY_6: 68,
    SUMMARY_BODY_7: 74,
    SUMMARY_BODY_8: 76,
    SUMMARY_BODY_9: 81,
    SUMMARY_BODY_10: 84,
    SUMMARY_BODY_11: 88,
    INPUTS_HEADING: 100,
    INPUTS_TABLE_START: 103,
    INPUTS_TABLE_BODY: 105,
    INPUTS_TABLE_ALT: 108,
    NEW_PAGE_START: 20,
    SECTION_GAP: 15,
    TABLE_GAP: 5,
    FOOTER_OFFSET: 10,
    PAGE_NUMBER_OFFSET: 30,
  },
  /** Comparison report-specific Y positions */
  COMPARE_Y: {
    WINNER_TITLE: 50,
    WINNER_NAME: 58,
    WINNER_DETAIL: 66,
    TIE_TITLE: 50,
    TIE_DETAIL: 58,
    TABLE_WITH_WINNER: 80,
    TABLE_WITH_TIE: 70,
    TABLE_NO_WINNER: 50,
  },
  COLORS: {
    PRIMARY: [PDF_PRIMARY_R, PDF_PRIMARY_G, PDF_PRIMARY_B] as [number, number, number],
  },
  /** Column width for insight details */
  INSIGHT_DETAIL_WIDTH: 100,
  /** Percentage formatting constants */
  PCT_MULTIPLIER: 100,
  PCT_DECIMAL_PLACES: 1,
  DECIMAL_PLACES_2: 2,
} as const;
