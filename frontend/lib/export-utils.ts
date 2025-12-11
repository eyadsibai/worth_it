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

// ============================================================================
// Cap Table Export Functions
// ============================================================================

/**
 * Export cap table as CSV
 */
export function exportCapTableAsCSV(capTable: CapTable, filename: string): void {
  const rows: string[] = [];

  // Header
  rows.push("Name,Type,Share Class,Shares,Ownership %,Vesting Period (months),Cliff Period (months),Vested Shares");

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
export function exportFundingHistoryAsCSV(instruments: FundingInstrument[], filename: string): void {
  const rows: string[] = [];

  // Header
  rows.push("Type,Investor/Lead,Amount,Date,Status,Details");

  // Add each instrument
  instruments.forEach((instrument) => {
    const date = instrument.date || "N/A";

    if (instrument.type === "SAFE") {
      const capInfo = instrument.valuation_cap ? `Cap: $${instrument.valuation_cap.toLocaleString()}` : "";
      const discountInfo = instrument.discount_pct ? `Discount: ${instrument.discount_pct}%` : "";
      const details = [capInfo, discountInfo].filter(Boolean).join(", ");
      rows.push(
        `SAFE,${escapeCSV(instrument.investor_name)},${instrument.investment_amount},${date},${instrument.status},${escapeCSV(details)}`
      );
    } else if (instrument.type === "CONVERTIBLE_NOTE") {
      const capInfo = instrument.valuation_cap ? `Cap: $${instrument.valuation_cap.toLocaleString()}` : "";
      const discountInfo = instrument.discount_pct ? `Discount: ${instrument.discount_pct}%` : "";
      const interestInfo = `Interest: ${instrument.interest_rate}% (${instrument.interest_type})`;
      const maturityInfo = `Maturity: ${instrument.maturity_months} months`;
      const details = [capInfo, discountInfo, interestInfo, maturityInfo].filter(Boolean).join(", ");
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
  const totalRaised = instruments.reduce((sum, i) => {
    if (i.type === "SAFE") return sum + i.investment_amount;
    if (i.type === "CONVERTIBLE_NOTE") return sum + i.principal_amount;
    if (i.type === "PRICED_ROUND") return sum + i.amount_raised;
    return sum;
  }, 0);
  rows.push(`Total Raised,${totalRaised},,,`);

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
  const totalRaised = instruments.reduce((sum, i) => {
    if (i.type === "SAFE") return sum + i.investment_amount;
    if (i.type === "CONVERTIBLE_NOTE") return sum + i.principal_amount;
    if (i.type === "PRICED_ROUND") return sum + i.amount_raised;
    return sum;
  }, 0);

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
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 9 },
  });

  // Get Y position after stakeholders table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY || 108;

  // Add new page if needed
  if (finalY > 220) {
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
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8 },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalY = (doc as any).lastAutoTable?.finalY || finalY;
  }

  // Add waterfall analysis if provided
  if (waterfall && waterfall.stakeholder_payouts.length > 0) {
    if (finalY > 220) {
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
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 9 },
    });
  }

  // Save the PDF
  const pdfFilename = `cap-table-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(pdfFilename);
}

// Helper functions

/**
 * Escape a string for CSV format according to RFC 4180
 * - Wraps in quotes if contains comma, newline, or double quote
 * - Escapes internal double quotes by doubling them
 */
function escapeCSV(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
    // Escape double quotes by doubling them
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return value;
}

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
