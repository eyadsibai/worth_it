/**
 * Tests for ProFormaCapTable component
 * Following TDD - tests written first
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProFormaCapTable } from "@/components/cap-table/pro-forma-cap-table";
import type { CapTable, ConversionResult } from "@/lib/schemas";

// Test data
const mockCapTable: CapTable = {
  stakeholders: [
    {
      id: "1",
      name: "Alice Founder",
      type: "founder",
      shares: 4000000,
      ownership_pct: 40,
      share_class: "common",
    },
    {
      id: "2",
      name: "Bob Founder",
      type: "founder",
      shares: 4000000,
      ownership_pct: 40,
      share_class: "common",
    },
  ],
  total_shares: 10000000,
  option_pool_pct: 20,
};

const mockConversions: ConversionResult[] = [
  {
    investor_name: "Y Combinator",
    investment_amount: 500000,
    conversion_price: 0.5,
    shares_issued: 1000000,
    ownership_pct: 9.09,
    conversion_method: "cap",
    effective_valuation: 5000000,
  },
];

describe("ProFormaCapTable", () => {
  it("renders table headers", () => {
    render(
      <ProFormaCapTable capTable={mockCapTable} conversions={mockConversions} isLoading={false} />
    );

    expect(screen.getByRole("columnheader", { name: /stakeholder/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /shares/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /ownership/i })).toBeInTheDocument();
  });

  it("displays existing stakeholders", () => {
    render(<ProFormaCapTable capTable={mockCapTable} conversions={[]} isLoading={false} />);

    expect(screen.getByText("Alice Founder")).toBeInTheDocument();
    expect(screen.getByText("Bob Founder")).toBeInTheDocument();
  });

  it("displays converted investors", () => {
    render(
      <ProFormaCapTable capTable={mockCapTable} conversions={mockConversions} isLoading={false} />
    );

    expect(screen.getByText("Y Combinator")).toBeInTheDocument();
  });

  it("shows shares issued from conversion", () => {
    render(
      <ProFormaCapTable capTable={mockCapTable} conversions={mockConversions} isLoading={false} />
    );

    // Conversion should show 1,000,000 shares (getAllByText since it appears in both table and summary)
    const sharesElements = screen.getAllByText(/1,000,000/);
    expect(sharesElements.length).toBeGreaterThanOrEqual(1);
  });

  it("shows loading state", () => {
    render(<ProFormaCapTable capTable={mockCapTable} conversions={[]} isLoading={true} />);

    expect(screen.getByText(/calculating/i)).toBeInTheDocument();
  });

  it("shows empty state when no stakeholders", () => {
    const emptyCapTable: CapTable = {
      stakeholders: [],
      total_shares: 0,
      option_pool_pct: 0,
    };

    render(<ProFormaCapTable capTable={emptyCapTable} conversions={[]} isLoading={false} />);

    expect(screen.getByText(/no stakeholders/i)).toBeInTheDocument();
  });

  it("calculates total shares including conversions", () => {
    render(
      <ProFormaCapTable capTable={mockCapTable} conversions={mockConversions} isLoading={false} />
    );

    // Total should be 10M + 1M = 11M
    expect(screen.getByText(/11,000,000/)).toBeInTheDocument();
  });

  it("displays conversion badge for converted investors", () => {
    render(
      <ProFormaCapTable capTable={mockCapTable} conversions={mockConversions} isLoading={false} />
    );

    // Should show some indicator that this is from SAFE conversion
    expect(screen.getByText(/safe/i)).toBeInTheDocument();
  });

  it("shows recalculated ownership percentages", () => {
    render(
      <ProFormaCapTable capTable={mockCapTable} conversions={mockConversions} isLoading={false} />
    );

    // The conversion result shows 9.09% for Y Combinator
    expect(screen.getByText(/9\.09%/)).toBeInTheDocument();
  });
});
