/**
 * Tests for ScenarioComparison component
 * Following TDD - tests written first
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScenarioComparison } from "@/components/cap-table/scenario-comparison";
import type { FounderScenario, CapTable } from "@/lib/schemas";

// Test data
const mockCapTable1: CapTable = {
  stakeholders: [
    {
      id: "1",
      name: "Alice Founder",
      type: "founder",
      shares: 4000000,
      ownership_pct: 40,
      share_class: "common",
    },
  ],
  total_shares: 10000000,
  option_pool_pct: 10,
};

const mockCapTable2: CapTable = {
  stakeholders: [
    {
      id: "1",
      name: "Alice Founder",
      type: "founder",
      shares: 4000000,
      ownership_pct: 30,
      share_class: "common",
    },
    {
      id: "2",
      name: "Series A Investor",
      type: "investor",
      shares: 2000000,
      ownership_pct: 15,
      share_class: "preferred",
    },
  ],
  total_shares: 13000000,
  option_pool_pct: 10,
};

const mockScenario1: FounderScenario = {
  id: "scenario-1",
  name: "Pre-Seed",
  capTable: mockCapTable1,
  instruments: [
    {
      id: "safe1",
      type: "SAFE",
      investor_name: "Y Combinator",
      investment_amount: 500000,
      valuation_cap: 5000000,
      pro_rata_rights: true,
      mfn_clause: false,
      status: "outstanding",
    },
  ],
  preferenceTiers: [],
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const mockScenario2: FounderScenario = {
  id: "scenario-2",
  name: "Post Series A",
  capTable: mockCapTable2,
  instruments: [
    {
      id: "round1",
      type: "PRICED_ROUND",
      round_name: "Series A",
      lead_investor: "Sequoia",
      pre_money_valuation: 10000000,
      amount_raised: 3000000,
      price_per_share: 1.5,
      liquidation_multiplier: 1,
      participating: false,
      new_shares_issued: 2000000,
      date: "2024-06-01",
    },
  ],
  preferenceTiers: [],
  createdAt: "2024-06-01T00:00:00.000Z",
  updatedAt: "2024-06-01T00:00:00.000Z",
};

describe("ScenarioComparison", () => {
  it("renders scenario names as headers", () => {
    render(
      <ScenarioComparison scenarios={[mockScenario1, mockScenario2]} />
    );

    expect(screen.getByText("Pre-Seed")).toBeInTheDocument();
    expect(screen.getByText("Post Series A")).toBeInTheDocument();
  });

  it("shows founder ownership for each scenario", () => {
    render(
      <ScenarioComparison scenarios={[mockScenario1, mockScenario2]} />
    );

    // Label should exist
    expect(screen.getByText(/founder ownership/i)).toBeInTheDocument();
    // Values should be shown (40.0% for scenario 1, 30.0% for scenario 2)
    expect(screen.getByText(/40\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/30\.0%/)).toBeInTheDocument();
  });

  it("shows total funding raised for each scenario", () => {
    render(
      <ScenarioComparison scenarios={[mockScenario1, mockScenario2]} />
    );

    expect(screen.getByText(/total.*raised/i)).toBeInTheDocument();
  });

  it("shows number of stakeholders for each scenario", () => {
    render(
      <ScenarioComparison scenarios={[mockScenario1, mockScenario2]} />
    );

    expect(screen.getByText(/stakeholders/i)).toBeInTheDocument();
  });

  it("shows empty state when no scenarios provided", () => {
    render(
      <ScenarioComparison scenarios={[]} />
    );

    expect(screen.getByText(/select.*scenario/i)).toBeInTheDocument();
  });

  it("shows single scenario message when only one provided", () => {
    render(
      <ScenarioComparison scenarios={[mockScenario1]} />
    );

    expect(screen.getByText(/add.*scenario.*compare/i)).toBeInTheDocument();
  });

  it("allows removing a scenario from comparison", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();

    render(
      <ScenarioComparison
        scenarios={[mockScenario1, mockScenario2]}
        onRemoveScenario={onRemove}
      />
    );

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    await user.click(removeButtons[0]);

    expect(onRemove).toHaveBeenCalledWith(mockScenario1.id);
  });

  it("highlights better metrics in green", () => {
    render(
      <ScenarioComparison scenarios={[mockScenario1, mockScenario2]} />
    );

    // The higher founder ownership (40.0%) should be highlighted with green
    const founderOwnership = screen.getByText(/40\.0%/);
    expect(founderOwnership).toHaveClass("text-green-600");
  });
});
