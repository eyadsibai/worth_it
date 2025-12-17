/**
 * Tests for SensitivityAnalysis component
 * Following TDD for Issue #155
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SensitivityAnalysis } from "@/components/charts/sensitivity-analysis";
import type { SensitivityDataPoint, BreakevenThreshold } from "@/lib/sensitivity-utils";

// Test data
const mockSensitivityData: SensitivityDataPoint[] = [
  {
    variable: "Exit Valuation",
    low: 250000,
    high: 1200000,
    impact: 950000,
    lowDelta: -475000,
    highDelta: 475000,
  },
  {
    variable: "Salary Growth",
    low: 150000,
    high: 320000,
    impact: 170000,
    lowDelta: -85000,
    highDelta: 85000,
  },
  {
    variable: "Investment ROI",
    low: 180000,
    high: 280000,
    impact: 100000,
    lowDelta: -50000,
    highDelta: 50000,
  },
];

const mockBreakevenThresholds: BreakevenThreshold[] = [
  {
    variable: "Exit Valuation",
    threshold: 350000000,
    direction: "minimum",
    unit: "$",
    description: "Exit Valuation must be at least this value for the offer to be worth it",
  },
];

describe("SensitivityAnalysis", () => {
  it("renders the tornado chart section", () => {
    render(
      <SensitivityAnalysis
        data={mockSensitivityData}
        breakeven={[]}
        currentOutcome={500000}
      />
    );

    // Should have a heading for sensitivity analysis
    expect(screen.getByText(/sensitivity analysis/i)).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(
      <SensitivityAnalysis
        data={[]}
        breakeven={[]}
        currentOutcome={0}
      />
    );

    expect(screen.getByText(/no sensitivity data/i)).toBeInTheDocument();
  });

  it("displays breakeven thresholds when present", () => {
    render(
      <SensitivityAnalysis
        data={mockSensitivityData}
        breakeven={mockBreakevenThresholds}
        currentOutcome={500000}
      />
    );

    // Should show breakeven warning section heading
    expect(screen.getByText(/Breakeven Thresholds/)).toBeInTheDocument();
    // Should include the threshold description
    expect(screen.getByText(/must be at least this value/i)).toBeInTheDocument();
  });

  it("shows insight about most impactful variable", () => {
    render(
      <SensitivityAnalysis
        data={mockSensitivityData}
        breakeven={[]}
        currentOutcome={500000}
      />
    );

    // Should show the "Most Impactful Variable" alert title
    expect(screen.getByText(/Most Impactful Variable/)).toBeInTheDocument();
    // Should describe the impact - value appears multiple times (insight + table)
    expect(screen.getAllByText(/\$950K/).length).toBeGreaterThanOrEqual(1);
  });

  it("displays current outcome context", () => {
    render(
      <SensitivityAnalysis
        data={mockSensitivityData}
        breakeven={[]}
        currentOutcome={500000}
      />
    );

    // Should show current baseline outcome
    expect(screen.getByText(/baseline/i)).toBeInTheDocument();
  });
});

describe("SensitivityAnalysis - Accessibility", () => {
  it("has accessible chart section", () => {
    render(
      <SensitivityAnalysis
        data={mockSensitivityData}
        breakeven={[]}
        currentOutcome={500000}
      />
    );

    // Should have chart with accessible role
    expect(screen.getByRole("img")).toBeInTheDocument();
  });
});
