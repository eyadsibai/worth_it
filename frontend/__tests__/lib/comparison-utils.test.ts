/**
 * Tests for comparison utilities
 * Following TDD - tests written first for Issue #143
 */
import { describe, it, expect } from "vitest";
import {
  identifyWinner,
  calculateMetricDiffs,
  generateComparisonInsights,
} from "@/lib/comparison-utils";
import type { ScenarioData } from "@/lib/export-utils";

// Test data factory
function createScenario(overrides: Partial<ScenarioData> = {}): ScenarioData {
  return {
    name: "Test Scenario",
    timestamp: new Date().toISOString(),
    globalSettings: { exitYear: 5 },
    currentJob: {
      monthlySalary: 15000,
      annualGrowthRate: 5,
      assumedROI: 8,
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
      finalPayoutValue: 500000,
      finalOpportunityCost: 200000,
      netOutcome: 300000,
    },
    ...overrides,
  };
}

describe("identifyWinner", () => {
  it("identifies scenario with highest net outcome as winner", () => {
    const scenarios = [
      createScenario({ name: "Scenario A", results: { finalPayoutValue: 400000, finalOpportunityCost: 150000, netOutcome: 250000 } }),
      createScenario({ name: "Scenario B", results: { finalPayoutValue: 600000, finalOpportunityCost: 200000, netOutcome: 400000 } }),
    ];

    const result = identifyWinner(scenarios);

    expect(result.winnerName).toBe("Scenario B");
    expect(result.winnerIndex).toBe(1);
    expect(result.netOutcomeAdvantage).toBe(150000);
  });

  it("handles tie by returning first scenario", () => {
    const scenarios = [
      createScenario({ name: "Scenario A", results: { finalPayoutValue: 500000, finalOpportunityCost: 200000, netOutcome: 300000 } }),
      createScenario({ name: "Scenario B", results: { finalPayoutValue: 500000, finalOpportunityCost: 200000, netOutcome: 300000 } }),
    ];

    const result = identifyWinner(scenarios);

    expect(result.winnerName).toBe("Scenario A");
    expect(result.isTie).toBe(true);
  });

  it("handles negative outcomes correctly", () => {
    const scenarios = [
      createScenario({ name: "Scenario A", results: { finalPayoutValue: 100000, finalOpportunityCost: 200000, netOutcome: -100000 } }),
      createScenario({ name: "Scenario B", results: { finalPayoutValue: 150000, finalOpportunityCost: 200000, netOutcome: -50000 } }),
    ];

    const result = identifyWinner(scenarios);

    expect(result.winnerName).toBe("Scenario B");
    expect(result.netOutcomeAdvantage).toBe(50000);
  });

  it("works with more than two scenarios", () => {
    const scenarios = [
      createScenario({ name: "A", results: { finalPayoutValue: 300000, finalOpportunityCost: 100000, netOutcome: 200000 } }),
      createScenario({ name: "B", results: { finalPayoutValue: 500000, finalOpportunityCost: 100000, netOutcome: 400000 } }),
      createScenario({ name: "C", results: { finalPayoutValue: 400000, finalOpportunityCost: 100000, netOutcome: 300000 } }),
    ];

    const result = identifyWinner(scenarios);

    expect(result.winnerName).toBe("B");
    expect(result.winnerIndex).toBe(1);
  });
});

describe("calculateMetricDiffs", () => {
  it("calculates percentage differences for key metrics", () => {
    const scenarios = [
      createScenario({
        name: "Baseline",
        results: { finalPayoutValue: 400000, finalOpportunityCost: 200000, netOutcome: 200000 },
      }),
      createScenario({
        name: "Alternative",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 200000, netOutcome: 300000 },
      }),
    ];

    const diffs = calculateMetricDiffs(scenarios);

    // Net outcome diff: (300000 - 200000) / 200000 = 50%
    const netOutcomeDiff = diffs.find((d) => d.metric === "netOutcome");
    expect(netOutcomeDiff).toBeDefined();
    expect(netOutcomeDiff?.percentageDiff).toBeCloseTo(50);
    expect(netOutcomeDiff?.absoluteDiff).toBe(100000);
    expect(netOutcomeDiff?.betterScenario).toBe("Alternative");
  });

  it("marks metrics where higher is better", () => {
    const scenarios = [
      createScenario({ name: "A", results: { finalPayoutValue: 400000, finalOpportunityCost: 200000, netOutcome: 200000 } }),
      createScenario({ name: "B", results: { finalPayoutValue: 500000, finalOpportunityCost: 100000, netOutcome: 400000 } }),
    ];

    const diffs = calculateMetricDiffs(scenarios);

    const payoutDiff = diffs.find((d) => d.metric === "finalPayoutValue");
    expect(payoutDiff?.higherIsBetter).toBe(true);
    expect(payoutDiff?.betterScenario).toBe("B");

    // Lower opportunity cost is better
    const costDiff = diffs.find((d) => d.metric === "finalOpportunityCost");
    expect(costDiff?.higherIsBetter).toBe(false);
    expect(costDiff?.betterScenario).toBe("B");
  });

  it("handles zero baseline gracefully", () => {
    const scenarios = [
      createScenario({ name: "A", results: { finalPayoutValue: 0, finalOpportunityCost: 100000, netOutcome: -100000 } }),
      createScenario({ name: "B", results: { finalPayoutValue: 500000, finalOpportunityCost: 100000, netOutcome: 400000 } }),
    ];

    const diffs = calculateMetricDiffs(scenarios);

    // Should handle division by zero
    const payoutDiff = diffs.find((d) => d.metric === "finalPayoutValue");
    expect(payoutDiff?.percentageDiff).toBeDefined();
    expect(Number.isFinite(payoutDiff?.percentageDiff)).toBe(true);
  });
});

describe("generateComparisonInsights", () => {
  it("generates winner insight", () => {
    const scenarios = [
      createScenario({ name: "Low Risk", results: { finalPayoutValue: 300000, finalOpportunityCost: 100000, netOutcome: 200000 } }),
      createScenario({ name: "High Risk", results: { finalPayoutValue: 600000, finalOpportunityCost: 200000, netOutcome: 400000 } }),
    ];

    const insights = generateComparisonInsights(scenarios);

    const winnerInsight = insights.find((i) => i.type === "winner");
    expect(winnerInsight).toBeDefined();
    expect(winnerInsight?.scenarioName).toBe("High Risk");
    expect(winnerInsight?.description).toContain("200,000");
  });

  it("generates trade-off insight when salary differs", () => {
    const scenarios = [
      createScenario({
        name: "High Salary",
        equity: { type: "RSU", monthlySalary: 18000, vestingPeriod: 4, cliffPeriod: 1, equityPct: 0.3, exitValuation: 50000000 },
        results: { finalPayoutValue: 150000, finalOpportunityCost: 50000, netOutcome: 100000 },
      }),
      createScenario({
        name: "High Equity",
        equity: { type: "RSU", monthlySalary: 10000, vestingPeriod: 4, cliffPeriod: 1, equityPct: 1.0, exitValuation: 50000000 },
        results: { finalPayoutValue: 500000, finalOpportunityCost: 150000, netOutcome: 350000 },
      }),
    ];

    const insights = generateComparisonInsights(scenarios);

    const tradeoffInsight = insights.find((i) => i.type === "tradeoff");
    expect(tradeoffInsight).toBeDefined();
    expect(tradeoffInsight?.description).toMatch(/salary|equity/i);
  });

  it("generates breakeven insight when available", () => {
    const scenarios = [
      createScenario({
        name: "Scenario A",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 200000, netOutcome: 300000, breakeven: "Year 2" },
      }),
      createScenario({
        name: "Scenario B",
        results: { finalPayoutValue: 400000, finalOpportunityCost: 200000, netOutcome: 200000, breakeven: "Year 3" },
      }),
    ];

    const insights = generateComparisonInsights(scenarios);

    const breakevenInsight = insights.find((i) => i.type === "observation" && i.title.toLowerCase().includes("breakeven"));
    expect(breakevenInsight).toBeDefined();
  });

  it("returns empty array for single scenario", () => {
    const scenarios = [createScenario({ name: "Only One" })];

    const insights = generateComparisonInsights(scenarios);

    expect(insights).toHaveLength(0);
  });

  it("limits insights to most important ones", () => {
    const scenarios = [
      createScenario({ name: "A", results: { finalPayoutValue: 500000, finalOpportunityCost: 200000, netOutcome: 300000 } }),
      createScenario({ name: "B", results: { finalPayoutValue: 400000, finalOpportunityCost: 100000, netOutcome: 300000 } }),
    ];

    const insights = generateComparisonInsights(scenarios);

    // Should not overwhelm user with too many insights
    expect(insights.length).toBeLessThanOrEqual(5);
  });
});
