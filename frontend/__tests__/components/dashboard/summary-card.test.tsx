import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SummaryCard } from "@/components/dashboard/summary-card";

describe("SummaryCard", () => {
  const emptyStats = {
    totalScenarios: 0,
    employeeScenarios: 0,
    founderScenarios: 0,
    worthItCount: 0,
    notWorthItCount: 0,
    averageNetBenefit: 0,
    bestOpportunity: null,
  };

  const populatedStats = {
    totalScenarios: 5,
    employeeScenarios: 3,
    founderScenarios: 2,
    worthItCount: 2,
    notWorthItCount: 1,
    averageNetBenefit: 50000,
    bestOpportunity: {
      name: "Startup X",
      netBenefit: 150000,
    },
  };

  it("renders summary title", () => {
    render(<SummaryCard stats={emptyStats} />);
    expect(screen.getByText("Your Analysis Summary")).toBeInTheDocument();
  });

  it("displays empty state when no scenarios", () => {
    render(<SummaryCard stats={emptyStats} />);
    expect(screen.getByText("No scenarios saved yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first analysis to see insights here.")
    ).toBeInTheDocument();
  });

  it("displays scenario counts", () => {
    render(<SummaryCard stats={populatedStats} />);
    expect(screen.getByText("5")).toBeInTheDocument(); // Total
    expect(screen.getByText("3")).toBeInTheDocument(); // Employee
    expect(screen.getByText("2")).toBeInTheDocument(); // Founder
  });

  it("displays worth it rate progress bar", () => {
    render(<SummaryCard stats={populatedStats} />);
    expect(screen.getByText("Worth It Rate")).toBeInTheDocument();
    expect(screen.getByText("67%")).toBeInTheDocument(); // 2/3 = 67%
  });

  it("displays worth it and not worth it counts", () => {
    render(<SummaryCard stats={populatedStats} />);
    expect(screen.getByText("2 worth it")).toBeInTheDocument();
    expect(screen.getByText("1 not worth it")).toBeInTheDocument();
  });

  it("displays best opportunity", () => {
    render(<SummaryCard stats={populatedStats} />);
    expect(screen.getByText("Best Opportunity")).toBeInTheDocument();
    expect(screen.getByText("Startup X")).toBeInTheDocument();
    expect(screen.getByText("+$150,000")).toBeInTheDocument();
  });

  it("displays average net benefit", () => {
    render(<SummaryCard stats={populatedStats} />);
    expect(screen.getByText("Average Net Benefit")).toBeInTheDocument();
    expect(screen.getByText("+$50,000")).toBeInTheDocument();
  });

  it("handles negative net benefits", () => {
    const negativeStats = {
      ...populatedStats,
      bestOpportunity: {
        name: "Bad Deal",
        netBenefit: -25000,
      },
      averageNetBenefit: -10000,
    };
    render(<SummaryCard stats={negativeStats} />);
    expect(screen.getByText("-$25,000")).toBeInTheDocument();
    expect(screen.getByText("-$10,000")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<SummaryCard stats={emptyStats} className="custom-class" />);
    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("handles zero employee scenarios (no worth it section)", () => {
    const founderOnlyStats = {
      ...emptyStats,
      totalScenarios: 2,
      founderScenarios: 2,
    };
    render(<SummaryCard stats={founderOnlyStats} />);
    expect(screen.queryByText("Worth It Rate")).not.toBeInTheDocument();
  });
});
