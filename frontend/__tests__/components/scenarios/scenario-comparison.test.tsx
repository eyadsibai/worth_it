/**
 * Tests for Employee mode ScenarioComparison component
 * Following TDD for Issue #143 enhancements
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScenarioComparison } from "@/components/scenarios/scenario-comparison";
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

describe("ScenarioComparison - Basic", () => {
  it("renders scenario names as headers", () => {
    const scenarios = [
      createScenario({ name: "Scenario A" }),
      createScenario({ name: "Scenario B" }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />);

    expect(screen.getByText("Scenario A")).toBeInTheDocument();
    expect(screen.getByText("Scenario B")).toBeInTheDocument();
  });

  it("returns null when no scenarios provided", () => {
    const { container } = render(<ScenarioComparison scenarios={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows close button when onClose provided", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ScenarioComparison scenarios={[createScenario()]} onClose={onClose} />
    );

    const closeButton = screen.getByRole("button");
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });
});

describe("ScenarioComparison - Winner Badge", () => {
  it("displays winner badge for scenario with highest net outcome", () => {
    const scenarios = [
      createScenario({
        name: "Low Value",
        results: { finalPayoutValue: 200000, finalOpportunityCost: 100000, netOutcome: 100000 },
      }),
      createScenario({
        name: "High Value",
        results: { finalPayoutValue: 600000, finalOpportunityCost: 200000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />);

    // Winner badge should appear for "High Value" scenario
    expect(screen.getByText(/best.*choice/i)).toBeInTheDocument();
  });

  it("shows trophy icon for winner", () => {
    const scenarios = [
      createScenario({
        name: "A",
        results: { finalPayoutValue: 100000, finalOpportunityCost: 50000, netOutcome: 50000 },
      }),
      createScenario({
        name: "B",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 100000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />);

    // Should have a trophy icon (test by aria-label or class)
    expect(screen.getByTestId("trophy-icon")).toBeInTheDocument();
  });

  it("does not show winner badge when scenarios are tied", () => {
    const scenarios = [
      createScenario({
        name: "A",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 200000, netOutcome: 300000 },
      }),
      createScenario({
        name: "B",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 200000, netOutcome: 300000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />);

    expect(screen.queryByText(/best.*choice/i)).not.toBeInTheDocument();
  });
});

describe("ScenarioComparison - Visual Diff", () => {
  it("shows percentage difference for net outcome", () => {
    const scenarios = [
      createScenario({
        name: "Baseline",
        results: { finalPayoutValue: 400000, finalOpportunityCost: 200000, netOutcome: 200000 },
      }),
      createScenario({
        name: "Better",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 200000, netOutcome: 300000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />);

    // Should show +50% difference (may appear in multiple places: winner badge and table)
    const percentageElements = screen.getAllByText(/\+50%/);
    expect(percentageElements.length).toBeGreaterThan(0);
  });

  it("shows up arrow for better values", () => {
    const scenarios = [
      createScenario({
        name: "Baseline",
        results: { finalPayoutValue: 300000, finalOpportunityCost: 200000, netOutcome: 100000 },
      }),
      createScenario({
        name: "Better",
        results: { finalPayoutValue: 600000, finalOpportunityCost: 200000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />);

    // Should show up trending icon for better scenario
    expect(screen.getAllByTestId("trend-up").length).toBeGreaterThan(0);
  });

  it("uses green color for better metrics", () => {
    const scenarios = [
      createScenario({
        name: "A",
        results: { finalPayoutValue: 200000, finalOpportunityCost: 100000, netOutcome: 100000 },
      }),
      createScenario({
        name: "B",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 100000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />);

    // The better value should have green styling
    const betterValue = screen.getByTestId("best-net-outcome");
    expect(betterValue).toHaveClass("text-terminal");
  });
});

describe("ScenarioComparison - Insights", () => {
  it("displays comparison insights section", () => {
    const scenarios = [
      createScenario({
        name: "Low Risk",
        results: { finalPayoutValue: 300000, finalOpportunityCost: 100000, netOutcome: 200000 },
      }),
      createScenario({
        name: "High Risk",
        results: { finalPayoutValue: 600000, finalOpportunityCost: 200000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />);

    expect(screen.getByText(/insights/i)).toBeInTheDocument();
  });

  it("shows winner insight with advantage amount", () => {
    const scenarios = [
      createScenario({
        name: "Option A",
        results: { finalPayoutValue: 300000, finalOpportunityCost: 100000, netOutcome: 200000 },
      }),
      createScenario({
        name: "Option B",
        results: { finalPayoutValue: 600000, finalOpportunityCost: 200000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />);

    // Should mention the advantage amount (200,000 difference) in the winner badge or insights
    // The amount appears in multiple places, so use getAllByText
    const advantageElements = screen.getAllByText(/\$200,000/);
    expect(advantageElements.length).toBeGreaterThan(0);
  });
});
