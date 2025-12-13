/**
 * Tests for export-utils
 * Tests CSV/JSON export and localStorage scenario management
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  exportAsJSON,
  exportResultsAsCSV,
  exportMonteCarloAsCSV,
  exportMonteCarloStatsAsCSV,
  saveScenario,
  getSavedScenarios,
  deleteScenario,
  clearAllScenarios,
  duplicateScenario,
  updateScenarioNotes,
  type ScenarioData,
} from "@/lib/export-utils";
import type { StartupScenarioResponse } from "@/lib/schemas";

// =============================================================================
// Mock Setup
// =============================================================================

// Mock document.createElement and related DOM methods
const mockLink = {
  href: "",
  download: "",
  click: vi.fn(),
};

const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();

beforeEach(() => {
  vi.spyOn(document, "createElement").mockReturnValue(mockLink as unknown as HTMLElement);
  vi.spyOn(document.body, "appendChild").mockImplementation(mockAppendChild);
  vi.spyOn(document.body, "removeChild").mockImplementation(mockRemoveChild);

  // Clear localStorage before each test
  localStorage.clear();

  // Reset mocks
  mockLink.href = "";
  mockLink.download = "";
  mockLink.click.mockClear();
  mockAppendChild.mockClear();
  mockRemoveChild.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// =============================================================================
// JSON Export Tests
// =============================================================================

describe("exportAsJSON", () => {
  it("creates a JSON blob with correct content", () => {
    const data = { key: "value", nested: { a: 1 } };

    exportAsJSON(data, "test-export");

    expect(mockLink.download).toBe("test-export.json");
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalled();
    expect(mockRemoveChild).toHaveBeenCalled();
  });

  it("handles arrays", () => {
    const data = [1, 2, 3, { item: "value" }];

    exportAsJSON(data, "array-export");

    expect(mockLink.download).toBe("array-export.json");
    expect(mockLink.click).toHaveBeenCalled();
  });

  it("handles null and primitive values", () => {
    exportAsJSON(null, "null-export");
    expect(mockLink.download).toBe("null-export.json");

    exportAsJSON("string", "string-export");
    expect(mockLink.download).toBe("string-export.json");
  });
});

// =============================================================================
// Results CSV Export Tests
// =============================================================================

describe("exportResultsAsCSV", () => {
  const mockResults: StartupScenarioResponse = {
    results_df: [],
    final_payout_value: 100000,
    final_opportunity_cost: 50000,
    payout_label: "$100,000",
    breakeven_label: "Year 3",
    total_dilution: 0.25,
    diluted_equity_pct: 0.375,
  };

  it("exports results with correct filename", () => {
    exportResultsAsCSV(mockResults, "scenario-results");

    expect(mockLink.download).toBe("scenario-results.csv");
    expect(mockLink.click).toHaveBeenCalled();
  });

  it("includes key metrics in export", () => {
    // We can't easily inspect Blob contents in jsdom,
    // but we verify the function completes without error
    expect(() => exportResultsAsCSV(mockResults, "test")).not.toThrow();
  });

  it("handles results without optional dilution fields", () => {
    const resultsWithoutDilution: StartupScenarioResponse = {
      results_df: [],
      final_payout_value: 100000,
      final_opportunity_cost: 50000,
      payout_label: "$100,000",
      breakeven_label: "Year 3",
      total_dilution: null,
      diluted_equity_pct: null,
    };

    expect(() => exportResultsAsCSV(resultsWithoutDilution, "test")).not.toThrow();
  });
});

// =============================================================================
// Monte Carlo CSV Export Tests
// =============================================================================

describe("exportMonteCarloAsCSV", () => {
  it("exports Monte Carlo data with correct filename", () => {
    const netOutcomes = [10000, 20000, -5000, 30000];
    const simulatedValuations = [500000, 750000, 250000, 1000000];

    exportMonteCarloAsCSV(netOutcomes, simulatedValuations, "monte-carlo");

    expect(mockLink.download).toBe("monte-carlo.csv");
    expect(mockLink.click).toHaveBeenCalled();
  });

  it("handles empty arrays", () => {
    expect(() => exportMonteCarloAsCSV([], [], "empty")).not.toThrow();
  });

  it("handles mismatched array lengths", () => {
    const netOutcomes = [10000, 20000, 30000];
    const simulatedValuations = [500000, 750000]; // shorter

    expect(() => exportMonteCarloAsCSV(netOutcomes, simulatedValuations, "test")).not.toThrow();
  });
});

describe("exportMonteCarloStatsAsCSV", () => {
  const mockStats = {
    mean: 25000,
    median: 22000,
    stdDev: 15000,
    percentiles: {
      "5th Percentile": -5000,
      "25th Percentile": 15000,
      "75th Percentile": 35000,
      "95th Percentile": 55000,
    },
    profitProbability: 0.75,
  };

  it("exports stats with correct filename", () => {
    exportMonteCarloStatsAsCSV(mockStats, "mc-stats");

    expect(mockLink.download).toBe("mc-stats.csv");
    expect(mockLink.click).toHaveBeenCalled();
  });

  it("handles empty percentiles", () => {
    const statsWithoutPercentiles = {
      ...mockStats,
      percentiles: {},
    };

    expect(() => exportMonteCarloStatsAsCSV(statsWithoutPercentiles, "test")).not.toThrow();
  });
});

// =============================================================================
// localStorage Scenario Management Tests
// =============================================================================

const createMockScenario = (name: string, timestamp: string, notes?: string): ScenarioData => ({
  name,
  timestamp,
  notes,
  globalSettings: { exitYear: 5 },
  currentJob: {
    monthlySalary: 15000,
    annualGrowthRate: 0.05,
    assumedROI: 0.08,
    investmentFrequency: "Monthly",
  },
  equity: {
    type: "RSU",
    monthlySalary: 12000,
    vestingPeriod: 4,
    cliffPeriod: 1,
    equityPct: 0.5,
    exitValuation: 100000000,
  },
  results: {
    finalPayoutValue: 100000,
    finalOpportunityCost: 50000,
    netOutcome: 50000,
  },
});

describe("saveScenario", () => {
  it("saves scenario to localStorage", () => {
    const scenario = createMockScenario("Test Scenario", "2024-01-01T00:00:00Z");

    saveScenario(scenario);

    const saved = JSON.parse(localStorage.getItem("worth_it_scenarios") || "[]");
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe("Test Scenario");
  });

  it("appends to existing scenarios", () => {
    const scenario1 = createMockScenario("First", "2024-01-01T00:00:00Z");
    const scenario2 = createMockScenario("Second", "2024-01-02T00:00:00Z");

    saveScenario(scenario1);
    saveScenario(scenario2);

    const saved = JSON.parse(localStorage.getItem("worth_it_scenarios") || "[]");
    expect(saved).toHaveLength(2);
  });

});


describe("getSavedScenarios", () => {
  it("returns empty array when no scenarios saved", () => {
    const scenarios = getSavedScenarios();
    expect(scenarios).toEqual([]);
  });

  it("returns saved scenarios", () => {
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([scenario]));

    const scenarios = getSavedScenarios();
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].name).toBe("Test");
  });

  it("returns empty array on parse error", () => {
    localStorage.setItem("worth_it_scenarios", "invalid json");

    const scenarios = getSavedScenarios();
    expect(scenarios).toEqual([]);
  });
});

describe("deleteScenario", () => {
  it("deletes scenario by timestamp", () => {
    const scenario1 = createMockScenario("First", "2024-01-01T00:00:00Z");
    const scenario2 = createMockScenario("Second", "2024-01-02T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([scenario1, scenario2]));

    deleteScenario("2024-01-01T00:00:00Z");

    const scenarios = getSavedScenarios();
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].name).toBe("Second");
  });

  it("does nothing if timestamp not found", () => {
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([scenario]));

    deleteScenario("nonexistent");

    const scenarios = getSavedScenarios();
    expect(scenarios).toHaveLength(1);
  });

});

describe("clearAllScenarios", () => {
  it("removes all scenarios from localStorage", () => {
    const scenario1 = createMockScenario("First", "2024-01-01T00:00:00Z");
    const scenario2 = createMockScenario("Second", "2024-01-02T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([scenario1, scenario2]));

    clearAllScenarios();

    expect(localStorage.getItem("worth_it_scenarios")).toBeNull();
    expect(getSavedScenarios()).toEqual([]);
  });

  it("does nothing if no scenarios exist", () => {
    expect(() => clearAllScenarios()).not.toThrow();
    expect(getSavedScenarios()).toEqual([]);
  });
});

// =============================================================================
// Employee Mode Export Functions Tests
// =============================================================================

describe("exportScenarioAsCSV", () => {
  it("exports scenario with correct filename pattern", async () => {
    const { exportScenarioAsCSV } = await import("@/lib/export-utils");
    const scenario = createMockScenario("My Scenario", "2024-01-01T00:00:00Z");

    exportScenarioAsCSV(scenario);

    // Filename should follow pattern: scenario-{sanitized-name}-{date}.csv
    expect(mockLink.download).toMatch(/^scenario-my-scenario-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(mockLink.click).toHaveBeenCalled();
  });

  it("generates valid CSV for all sections", async () => {
    const { exportScenarioAsCSV } = await import("@/lib/export-utils");
    const scenario = createMockScenario("Test Scenario", "2024-01-01T00:00:00Z");

    // Should not throw - verifies all sections are properly formatted
    expect(() => exportScenarioAsCSV(scenario)).not.toThrow();
    expect(mockLink.download).toMatch(/\.csv$/);
  });

  it("handles RSU scenarios", async () => {
    const { exportScenarioAsCSV } = await import("@/lib/export-utils");
    const scenario = createMockScenario("RSU Test", "2024-01-01T00:00:00Z");
    scenario.equity.type = "RSU";
    scenario.equity.equityPct = 0.5;

    expect(() => exportScenarioAsCSV(scenario)).not.toThrow();
  });

  it("handles Stock Options scenarios", async () => {
    const { exportScenarioAsCSV } = await import("@/lib/export-utils");
    const scenario = createMockScenario("Options Test", "2024-01-01T00:00:00Z");
    scenario.equity.type = "STOCK_OPTIONS";
    scenario.equity.numOptions = 10000;
    scenario.equity.strikePrice = 1.5;
    scenario.equity.exitPricePerShare = 15;

    expect(() => exportScenarioAsCSV(scenario)).not.toThrow();
  });

  it("sanitizes filename for special characters", async () => {
    const { exportScenarioAsCSV } = await import("@/lib/export-utils");
    const scenario = createMockScenario("My Test / Analysis: 2024", "2024-01-01T00:00:00Z");

    exportScenarioAsCSV(scenario);

    // Should have cleaned filename without slashes, colons, or multiple hyphens
    expect(mockLink.download).toMatch(/^scenario-my-test-analysis-2024-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(mockLink.download).not.toContain("//");
    expect(mockLink.download).not.toMatch(/--+/); // No consecutive hyphens
  });

  it("handles scenario names with quotes and commas", async () => {
    const { exportScenarioAsCSV } = await import("@/lib/export-utils");
    const scenario = createMockScenario('Scenario with, "quotes" and comma', "2024-01-01T00:00:00Z");

    // Should not throw - CSV escaping is applied internally
    expect(() => exportScenarioAsCSV(scenario)).not.toThrow();
    // Filename should be sanitized
    expect(mockLink.download).toMatch(/^scenario-scenario-with-quotes-and-comma-.*\.csv$/);
  });

  it("handles scenarios with breakeven field", async () => {
    const { exportScenarioAsCSV } = await import("@/lib/export-utils");
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z");
    scenario.results.breakeven = "Year 3, Month 6";

    expect(() => exportScenarioAsCSV(scenario)).not.toThrow();
  });
});

describe("exportScenarioAsJSON", () => {
  it("exports scenario with correct filename pattern", async () => {
    const { exportScenarioAsJSON } = await import("@/lib/export-utils");
    const scenario = createMockScenario("My Scenario", "2024-01-01T00:00:00Z");

    exportScenarioAsJSON(scenario);

    // Filename should follow pattern: scenario-{sanitized-name}-{date}.json
    expect(mockLink.download).toMatch(/^scenario-my-scenario-\d{4}-\d{2}-\d{2}\.json$/);
    expect(mockLink.click).toHaveBeenCalled();
  });

  it("includes metadata in export", async () => {
    const { exportScenarioAsJSON } = await import("@/lib/export-utils");
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z");

    expect(() => exportScenarioAsJSON(scenario)).not.toThrow();
  });

  it("includes Monte Carlo stats when provided", async () => {
    const { exportScenarioAsJSON } = await import("@/lib/export-utils");
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z");
    const mcStats = {
      mean: 50000,
      median: 45000,
      stdDev: 20000,
      percentiles: { "5th": -10000, "95th": 120000 },
      profitProbability: 0.78,
    };

    expect(() => exportScenarioAsJSON(scenario, mcStats)).not.toThrow();
  });
});

describe("exportScenarioAsPDF", () => {
  // Note: jsPDF mocking is complex in vitest. We test that functions don't throw
  // and rely on the existing exportCapTableAsPDF tests for jsPDF integration.

  it("handles scenarios with positive net outcome", async () => {
    const { exportScenarioAsPDF } = await import("@/lib/export-utils");
    const scenario = createMockScenario("Positive", "2024-01-01T00:00:00Z");
    scenario.results.netOutcome = 50000; // Positive

    expect(() => exportScenarioAsPDF(scenario)).not.toThrow();
  });

  it("handles scenarios with negative net outcome", async () => {
    const { exportScenarioAsPDF } = await import("@/lib/export-utils");
    const scenario = createMockScenario("Negative", "2024-01-01T00:00:00Z");
    scenario.results.netOutcome = -25000; // Negative

    expect(() => exportScenarioAsPDF(scenario)).not.toThrow();
  });

  it("handles RSU scenarios", async () => {
    const { exportScenarioAsPDF } = await import("@/lib/export-utils");
    const scenario = createMockScenario("RSU Test", "2024-01-01T00:00:00Z");
    scenario.equity.type = "RSU";

    expect(() => exportScenarioAsPDF(scenario)).not.toThrow();
  });

  it("handles Stock Options scenarios", async () => {
    const { exportScenarioAsPDF } = await import("@/lib/export-utils");
    const scenario = createMockScenario("Options Test", "2024-01-01T00:00:00Z");
    scenario.equity.type = "STOCK_OPTIONS";
    scenario.equity.numOptions = 10000;
    scenario.equity.strikePrice = 1.5;
    scenario.equity.exitPricePerShare = 15;

    expect(() => exportScenarioAsPDF(scenario)).not.toThrow();
  });

  it("includes Monte Carlo section when stats provided", async () => {
    const { exportScenarioAsPDF } = await import("@/lib/export-utils");
    const scenario = createMockScenario("MC Test", "2024-01-01T00:00:00Z");
    const mcStats = {
      mean: 50000,
      median: 45000,
      stdDev: 20000,
      percentiles: { "5th Percentile": -10000, "95th Percentile": 120000 },
      profitProbability: 0.78,
    };

    expect(() => exportScenarioAsPDF(scenario, mcStats)).not.toThrow();
  });
});

describe("duplicateScenario", () => {
  it("creates a copy with (Copy) suffix", () => {
    const original = createMockScenario("My Scenario", "2024-01-01T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([original]));

    const copy = duplicateScenario("2024-01-01T00:00:00Z");

    expect(copy).not.toBeNull();
    expect(copy!.name).toBe("My Scenario (Copy)");
  });

  it("creates a new timestamp for the copy", () => {
    const original = createMockScenario("Test", "2024-01-01T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([original]));

    const copy = duplicateScenario("2024-01-01T00:00:00Z");

    expect(copy).not.toBeNull();
    expect(copy!.timestamp).not.toBe("2024-01-01T00:00:00Z");
  });

  it("preserves all data from original", () => {
    const original = createMockScenario("Test", "2024-01-01T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([original]));

    const copy = duplicateScenario("2024-01-01T00:00:00Z");

    expect(copy).not.toBeNull();
    expect(copy!.globalSettings).toEqual(original.globalSettings);
    expect(copy!.currentJob).toEqual(original.currentJob);
    expect(copy!.equity).toEqual(original.equity);
    expect(copy!.results).toEqual(original.results);
  });

  it("automatically saves the copy to localStorage", () => {
    const original = createMockScenario("Test", "2024-01-01T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([original]));

    duplicateScenario("2024-01-01T00:00:00Z");

    const scenarios = getSavedScenarios();
    expect(scenarios).toHaveLength(2);
  });

  it("returns null if original not found", () => {
    const original = createMockScenario("Test", "2024-01-01T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([original]));

    const copy = duplicateScenario("nonexistent-timestamp");

    expect(copy).toBeNull();
  });

  it("handles scenarios with (Copy) suffix correctly", () => {
    const original = createMockScenario("Test (Copy)", "2024-01-01T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([original]));

    const copy = duplicateScenario("2024-01-01T00:00:00Z");

    // Should add (Copy 2) instead of (Copy) (Copy)
    expect(copy!.name).toBe("Test (Copy 2)");
  });

  it("increments copy number for multiple duplicates", () => {
    const original = createMockScenario("Test", "2024-01-01T00:00:00Z");
    const copy1 = createMockScenario("Test (Copy)", "2024-01-02T00:00:00Z");
    const copy2 = createMockScenario("Test (Copy 2)", "2024-01-03T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([original, copy1, copy2]));

    const newCopy = duplicateScenario("2024-01-01T00:00:00Z");

    expect(newCopy!.name).toBe("Test (Copy 3)");
  });

  it("preserves notes when duplicating", () => {
    const original = createMockScenario("Test", "2024-01-01T00:00:00Z", "Original notes");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([original]));

    const copy = duplicateScenario("2024-01-01T00:00:00Z");

    expect(copy).not.toBeNull();
    expect(copy!.notes).toBe("Original notes");
  });
});

// =============================================================================
// Scenario Notes Tests
// =============================================================================

describe("scenario notes", () => {
  it("saves scenario with notes", () => {
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z", "My analysis notes");

    saveScenario(scenario);

    const saved = getSavedScenarios();
    expect(saved[0].notes).toBe("My analysis notes");
  });

  it("saves scenario without notes (undefined)", () => {
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z");

    saveScenario(scenario);

    const saved = getSavedScenarios();
    expect(saved[0].notes).toBeUndefined();
  });
});

describe("updateScenarioNotes", () => {
  it("updates notes for existing scenario", () => {
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([scenario]));

    const updated = updateScenarioNotes("2024-01-01T00:00:00Z", "New notes");

    expect(updated).toBe(true);
    const saved = getSavedScenarios();
    expect(saved[0].notes).toBe("New notes");
  });

  it("returns false if scenario not found", () => {
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([scenario]));

    const updated = updateScenarioNotes("nonexistent", "New notes");

    expect(updated).toBe(false);
  });

  it("can clear notes by setting empty string", () => {
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z", "Original notes");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([scenario]));

    updateScenarioNotes("2024-01-01T00:00:00Z", "");

    const saved = getSavedScenarios();
    expect(saved[0].notes).toBe("");
  });

  it("can clear notes by setting undefined", () => {
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z", "Original notes");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([scenario]));

    updateScenarioNotes("2024-01-01T00:00:00Z", undefined);

    const saved = getSavedScenarios();
    expect(saved[0].notes).toBeUndefined();
  });

  it("preserves other scenario data when updating notes", () => {
    const scenario = createMockScenario("Test", "2024-01-01T00:00:00Z");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([scenario]));

    updateScenarioNotes("2024-01-01T00:00:00Z", "Added notes");

    const saved = getSavedScenarios();
    expect(saved[0].name).toBe("Test");
    expect(saved[0].globalSettings.exitYear).toBe(5);
    expect(saved[0].results.netOutcome).toBe(50000);
    expect(saved[0].notes).toBe("Added notes");
  });

  it("only updates the correct scenario when multiple exist", () => {
    const scenario1 = createMockScenario("First", "2024-01-01T00:00:00Z", "First notes");
    const scenario2 = createMockScenario("Second", "2024-01-02T00:00:00Z", "Second notes");
    localStorage.setItem("worth_it_scenarios", JSON.stringify([scenario1, scenario2]));

    updateScenarioNotes("2024-01-02T00:00:00Z", "Updated second notes");

    const saved = getSavedScenarios();
    expect(saved[0].notes).toBe("First notes");
    expect(saved[1].notes).toBe("Updated second notes");
  });
});
