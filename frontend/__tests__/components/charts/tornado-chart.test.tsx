/**
 * Tests for TornadoChart component
 * Following TDD for Issue #155
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TornadoChart } from "@/components/charts/tornado-chart";
import type { SensitivityDataPoint } from "@/lib/sensitivity-utils";

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

describe("TornadoChart", () => {
  it("renders variable names in impact labels", () => {
    // Note: Recharts YAxis doesn't render in JSDOM, so we test via impact labels
    render(<TornadoChart data={mockSensitivityData} showImpactLabels />);

    expect(screen.getByText("Exit Valuation")).toBeInTheDocument();
    expect(screen.getByText("Salary Growth")).toBeInTheDocument();
    expect(screen.getByText("Investment ROI")).toBeInTheDocument();
  });

  it("renders chart container with proper role", () => {
    render(<TornadoChart data={mockSensitivityData} />);

    // Recharts should be wrapped in role="img" for accessibility
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(<TornadoChart data={[]} />);

    expect(screen.getByText(/no sensitivity data/i)).toBeInTheDocument();
  });

  it("displays title when provided", () => {
    render(<TornadoChart data={mockSensitivityData} title="Impact Analysis" />);

    expect(screen.getByText("Impact Analysis")).toBeInTheDocument();
  });

  it("shows impact values in legend or labels", () => {
    render(<TornadoChart data={mockSensitivityData} showImpactLabels />);

    // Should show impact values formatted as compact currency (e.g., $950K)
    expect(screen.getByText(/\$950K/)).toBeInTheDocument();
  });
});

describe("TornadoChart - Accessibility", () => {
  it("provides accessible description of chart data", () => {
    render(<TornadoChart data={mockSensitivityData} />);

    // Should have aria-label describing the chart
    const chart = screen.getByRole("img");
    expect(chart).toHaveAttribute("aria-label");
  });
});
