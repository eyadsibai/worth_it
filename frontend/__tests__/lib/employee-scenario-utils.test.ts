"use client";

import { describe, it, expect } from "vitest";
import {
  filterScenarios,
  sortScenarios,
  searchScenarios,
  type SortOption,
  type FilterOption,
} from "@/lib/employee-scenario-utils";
import type { ScenarioData } from "@/lib/export-utils";

// Test fixtures
const createScenario = (overrides: Partial<ScenarioData> & { name: string }): ScenarioData => ({
  name: overrides.name,
  timestamp: overrides.timestamp || new Date().toISOString(),
  globalSettings: {
    exitYear: overrides.globalSettings?.exitYear || 5,
  },
  currentJob: {
    monthlySalary: 10000,
    annualGrowthRate: 5,
    assumedROI: 7,
    investmentFrequency: "monthly",
  },
  equity: {
    type: overrides.equity?.type || "RSU",
    monthlySalary: 8000,
    vestingPeriod: 48,
    cliffPeriod: 12,
    equityPct: 0.5,
    exitValuation: 100000000,
  },
  results: {
    finalPayoutValue: overrides.results?.finalPayoutValue || 100000,
    finalOpportunityCost: overrides.results?.finalOpportunityCost || 50000,
    netOutcome: overrides.results?.netOutcome || 50000,
  },
});

const mockScenarios: ScenarioData[] = [
  createScenario({
    name: "Company Alpha",
    timestamp: "2025-01-01T10:00:00Z",
    equity: { type: "RSU", monthlySalary: 8000, vestingPeriod: 48, cliffPeriod: 12 },
    results: { finalPayoutValue: 200000, finalOpportunityCost: 100000, netOutcome: 100000 },
  }),
  createScenario({
    name: "Startup Beta",
    timestamp: "2025-01-15T10:00:00Z",
    equity: { type: "STOCK_OPTIONS", monthlySalary: 7000, vestingPeriod: 48, cliffPeriod: 12, numOptions: 10000, strikePrice: 1, exitPricePerShare: 10 },
    results: { finalPayoutValue: 90000, finalOpportunityCost: 120000, netOutcome: -30000 },
  }),
  createScenario({
    name: "TechCorp Gamma",
    timestamp: "2025-02-01T10:00:00Z",
    equity: { type: "RSU", monthlySalary: 9000, vestingPeriod: 48, cliffPeriod: 12 },
    results: { finalPayoutValue: 150000, finalOpportunityCost: 80000, netOutcome: 70000 },
  }),
  createScenario({
    name: "Options Delta",
    timestamp: "2025-01-20T10:00:00Z",
    equity: { type: "STOCK_OPTIONS", monthlySalary: 6000, vestingPeriod: 48, cliffPeriod: 12, numOptions: 5000, strikePrice: 2, exitPricePerShare: 15 },
    results: { finalPayoutValue: 65000, finalOpportunityCost: 60000, netOutcome: 5000 },
  }),
];

describe("searchScenarios", () => {
  it("returns all scenarios when search query is empty", () => {
    const result = searchScenarios(mockScenarios, "");
    expect(result).toHaveLength(4);
  });

  it("returns all scenarios when search query is whitespace", () => {
    const result = searchScenarios(mockScenarios, "   ");
    expect(result).toHaveLength(4);
  });

  it("filters by scenario name (case insensitive)", () => {
    const result = searchScenarios(mockScenarios, "alpha");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Company Alpha");
  });

  it("filters by partial name match", () => {
    const result = searchScenarios(mockScenarios, "Corp");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("TechCorp Gamma");
  });

  it("filters by multiple word match", () => {
    const result = searchScenarios(mockScenarios, "startup beta");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Startup Beta");
  });

  it("returns empty array when no matches found", () => {
    const result = searchScenarios(mockScenarios, "nonexistent");
    expect(result).toHaveLength(0);
  });

  it("returns multiple matches when applicable", () => {
    // Both "Options Delta" and "Startup Beta" have STOCK_OPTIONS, but searching by name
    const result = searchScenarios(mockScenarios, "a"); // Alpha, Beta, Gamma, Delta all have 'a'
    expect(result.length).toBeGreaterThan(1);
  });
});

describe("filterScenarios", () => {
  it('returns all scenarios when filter is "all"', () => {
    const result = filterScenarios(mockScenarios, "all");
    expect(result).toHaveLength(4);
  });

  it('filters to only RSU scenarios when filter is "RSU"', () => {
    const result = filterScenarios(mockScenarios, "RSU");
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.equity.type === "RSU")).toBe(true);
  });

  it('filters to only Options scenarios when filter is "STOCK_OPTIONS"', () => {
    const result = filterScenarios(mockScenarios, "STOCK_OPTIONS");
    expect(result).toHaveLength(2);
    expect(result.every((s) => s.equity.type === "STOCK_OPTIONS")).toBe(true);
  });

  it("returns empty array when no scenarios match filter", () => {
    const rsuOnlyScenarios = mockScenarios.filter((s) => s.equity.type === "RSU");
    const result = filterScenarios(rsuOnlyScenarios, "STOCK_OPTIONS");
    expect(result).toHaveLength(0);
  });
});

describe("sortScenarios", () => {
  it('sorts by newest first when sort is "newest"', () => {
    const result = sortScenarios(mockScenarios, "newest");
    expect(result[0].name).toBe("TechCorp Gamma"); // 2025-02-01
    expect(result[result.length - 1].name).toBe("Company Alpha"); // 2025-01-01
  });

  it('sorts by oldest first when sort is "oldest"', () => {
    const result = sortScenarios(mockScenarios, "oldest");
    expect(result[0].name).toBe("Company Alpha"); // 2025-01-01
    expect(result[result.length - 1].name).toBe("TechCorp Gamma"); // 2025-02-01
  });

  it('sorts by name A-Z when sort is "name-asc"', () => {
    const result = sortScenarios(mockScenarios, "name-asc");
    expect(result[0].name).toBe("Company Alpha");
    expect(result[1].name).toBe("Options Delta");
    expect(result[2].name).toBe("Startup Beta");
    expect(result[3].name).toBe("TechCorp Gamma");
  });

  it('sorts by name Z-A when sort is "name-desc"', () => {
    const result = sortScenarios(mockScenarios, "name-desc");
    expect(result[0].name).toBe("TechCorp Gamma");
    expect(result[result.length - 1].name).toBe("Company Alpha");
  });

  it('sorts by best outcome first when sort is "outcome-best"', () => {
    const result = sortScenarios(mockScenarios, "outcome-best");
    expect(result[0].name).toBe("Company Alpha"); // +100000
    expect(result[1].name).toBe("TechCorp Gamma"); // +70000
    expect(result[result.length - 1].name).toBe("Startup Beta"); // -30000
  });

  it('sorts by worst outcome first when sort is "outcome-worst"', () => {
    const result = sortScenarios(mockScenarios, "outcome-worst");
    expect(result[0].name).toBe("Startup Beta"); // -30000
    expect(result[result.length - 1].name).toBe("Company Alpha"); // +100000
  });

  it("does not mutate the original array", () => {
    const originalFirst = mockScenarios[0].name;
    sortScenarios(mockScenarios, "name-asc");
    expect(mockScenarios[0].name).toBe(originalFirst);
  });
});

describe("combined search, filter, and sort", () => {
  it("applies search, filter, and sort together correctly", () => {
    // First search for scenarios with 'a' in name
    let result = searchScenarios(mockScenarios, "a");
    // Then filter to only RSU
    result = filterScenarios(result, "RSU");
    // Then sort by outcome best
    result = sortScenarios(result, "outcome-best");

    // Should have 2 RSU scenarios (Alpha, Gamma), sorted by outcome
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Company Alpha"); // +100000
    expect(result[1].name).toBe("TechCorp Gamma"); // +70000
  });

  it("handles empty results at each stage", () => {
    let result = searchScenarios(mockScenarios, "nonexistent");
    result = filterScenarios(result, "RSU");
    result = sortScenarios(result, "newest");

    expect(result).toHaveLength(0);
  });
});
