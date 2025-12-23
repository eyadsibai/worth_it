/**
 * Utility functions for managing founder scenarios in localStorage
 */

import { v4 as uuidv4 } from "uuid";
import {
  FounderScenarioSchema,
  type FounderScenario,
  type CapTable,
  type FundingInstrument,
  type PreferenceTier,
} from "@/lib/schemas";

const STORAGE_KEY = "worth_it_founder_scenarios";

/**
 * Create a new founder scenario with generated ID and timestamps
 */
export function createFounderScenario(
  name: string,
  capTable: CapTable,
  instruments: FundingInstrument[],
  preferenceTiers: PreferenceTier[],
  description?: string
): FounderScenario {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name,
    description,
    capTable,
    instruments,
    preferenceTiers,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Save a founder scenario to localStorage
 * Updates existing scenario if ID matches, otherwise adds new
 */
export function saveFounderScenario(scenario: FounderScenario): void {
  try {
    const scenarios = loadFounderScenarios();
    const existingIndex = scenarios.findIndex((s) => s.id === scenario.id);

    if (existingIndex >= 0) {
      scenarios[existingIndex] = {
        ...scenario,
        updatedAt: new Date().toISOString(),
      };
    } else {
      scenarios.push(scenario);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
  } catch (error) {
    console.error("Failed to save founder scenario:", error);
    throw new Error("Failed to save scenario. Storage may be full or unavailable.");
  }
}

/**
 * Load all founder scenarios from localStorage, sorted by updatedAt descending
 */
export function loadFounderScenarios(): FounderScenario[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const scenarios = JSON.parse(stored) as FounderScenario[];
    return scenarios.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  } catch (error) {
    console.error("Failed to load founder scenarios:", error);
    return [];
  }
}

/**
 * Load a single founder scenario by ID
 */
export function loadFounderScenarioById(id: string): FounderScenario | null {
  const scenarios = loadFounderScenarios();
  return scenarios.find((s) => s.id === id) || null;
}

/**
 * Delete a founder scenario by ID
 */
export function deleteFounderScenario(id: string): void {
  try {
    const scenarios = loadFounderScenarios();
    const filtered = scenarios.filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete founder scenario:", error);
    throw new Error("Failed to delete scenario. Storage may be unavailable.");
  }
}

/**
 * Clear all founder scenarios from localStorage
 */
export function clearAllFounderScenarios(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear founder scenarios:", error);
    throw new Error("Failed to clear scenarios. Storage may be unavailable.");
  }
}

/**
 * Sanitize a string for use as a filename
 * Removes/replaces characters that are unsafe for filesystems
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "") // Remove filesystem-unsafe characters
    .replace(/\.\./g, "") // Prevent directory traversal
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .substring(0, 100); // Limit length
}

/**
 * Export a founder scenario as a downloadable JSON file
 */
export function exportFounderScenario(scenario: FounderScenario): void {
  const jsonString = JSON.stringify(scenario, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const safeName = sanitizeFilename(scenario.name);
  link.download = `${safeName}_${scenario.id.slice(0, 8)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import a founder scenario from a JSON file
 * Validates the imported data against FounderScenarioSchema for type safety
 */
export function importFounderScenario(file: File): Promise<FounderScenario> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // Validate with Zod schema for type safety and data integrity
        const result = FounderScenarioSchema.safeParse(parsed);
        if (!result.success) {
          const errorMessages = result.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join(", ");
          throw new Error(`Invalid scenario format: ${errorMessages}`);
        }

        resolve(result.data);
      } catch (error) {
        if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error("Failed to parse scenario file"));
        }
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read scenario file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Calculate comparison metrics for a scenario
 */
export function getScenarioMetrics(scenario: FounderScenario) {
  const { capTable, instruments } = scenario;

  const totalStakeholders = capTable.stakeholders.length;
  const totalShares = capTable.total_shares;
  const optionPoolPct = capTable.option_pool_pct;

  const founderStakeholders = capTable.stakeholders.filter((s) => s.type === "founder");
  const investorStakeholders = capTable.stakeholders.filter((s) => s.type === "investor");

  const totalFundingRaised = instruments.reduce((sum, inst) => {
    if (inst.type === "SAFE") return sum + inst.investment_amount;
    if (inst.type === "CONVERTIBLE_NOTE") return sum + inst.principal_amount;
    if (inst.type === "PRICED_ROUND") return sum + inst.amount_raised;
    return sum;
  }, 0);

  const founderOwnership = founderStakeholders.reduce((sum, s) => sum + s.ownership_pct, 0);
  const investorOwnership = investorStakeholders.reduce((sum, s) => sum + s.ownership_pct, 0);

  const outstandingSAFEs = instruments.filter(
    (i) => i.type === "SAFE" && i.status === "outstanding"
  ).length;

  const outstandingNotes = instruments.filter(
    (i) => i.type === "CONVERTIBLE_NOTE" && i.status === "outstanding"
  ).length;

  const pricedRounds = instruments.filter((i) => i.type === "PRICED_ROUND").length;

  return {
    totalStakeholders,
    totalShares,
    optionPoolPct,
    totalFundingRaised,
    founderOwnership,
    investorOwnership,
    founderCount: founderStakeholders.length,
    investorCount: investorStakeholders.length,
    outstandingSAFEs,
    outstandingNotes,
    pricedRounds,
    totalInstruments: instruments.length,
  };
}
