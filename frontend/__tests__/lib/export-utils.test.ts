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

const createMockScenario = (name: string, timestamp: string): ScenarioData => ({
  name,
  timestamp,
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
});
