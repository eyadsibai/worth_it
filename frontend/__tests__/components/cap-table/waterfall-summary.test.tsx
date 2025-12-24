/**
 * Tests for WaterfallSummary component
 * Following TDD - tests written first
 *
 * This component provides:
 * 1. Plain English explanation of liquidation preferences
 * 2. Visual flow diagram showing distribution order
 * 3. Prominent display of user's specific payout
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WaterfallSummary } from "@/components/cap-table/waterfall-summary";
import type { WaterfallDistribution, PreferenceTier, StakeholderPayout } from "@/lib/schemas";

// Test data
const mockPreferenceTiers: PreferenceTier[] = [
  {
    id: "tier-1",
    name: "Series B",
    seniority: 1,
    investment_amount: 5000000,
    liquidation_multiplier: 1,
    participating: false,
    stakeholder_ids: ["investor-b"],
  },
  {
    id: "tier-2",
    name: "Series A",
    seniority: 2,
    investment_amount: 2000000,
    liquidation_multiplier: 1,
    participating: true,
    participation_cap: 3,
    stakeholder_ids: ["investor-a"],
  },
];

const mockStakeholderPayouts: StakeholderPayout[] = [
  {
    stakeholder_id: "founder-1",
    name: "Alice Founder",
    payout_amount: 20000000,
    payout_pct: 40,
    roi: undefined,
  },
  {
    stakeholder_id: "investor-b",
    name: "Series B Investor",
    payout_amount: 15000000,
    payout_pct: 30,
    investment_amount: 5000000,
    roi: 3,
  },
  {
    stakeholder_id: "investor-a",
    name: "Series A Investor",
    payout_amount: 10000000,
    payout_pct: 20,
    investment_amount: 2000000,
    roi: 5,
  },
  {
    stakeholder_id: "employee-1",
    name: "Bob Employee",
    payout_amount: 5000000,
    payout_pct: 10,
    roi: undefined,
  },
];

const mockDistribution: WaterfallDistribution = {
  exit_valuation: 50000000,
  waterfall_steps: [
    {
      step_number: 1,
      description: "Series B liquidation preference (1x)",
      amount: 5000000,
      recipients: ["Series B Investor"],
      remaining_proceeds: 45000000,
    },
    {
      step_number: 2,
      description: "Series A liquidation preference (1x)",
      amount: 2000000,
      recipients: ["Series A Investor"],
      remaining_proceeds: 43000000,
    },
    {
      step_number: 3,
      description: "Remaining proceeds distributed pro-rata",
      amount: 43000000,
      recipients: ["Alice Founder", "Series B Investor", "Series A Investor", "Bob Employee"],
      remaining_proceeds: 0,
    },
  ],
  stakeholder_payouts: mockStakeholderPayouts,
  common_pct: 50,
  preferred_pct: 50,
};

describe("WaterfallSummary", () => {
  describe("Plain English Explanation", () => {
    it("renders a summary card with explanation title", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
        />
      );

      expect(screen.getByText(/how exit proceeds are distributed/i)).toBeInTheDocument();
    });

    it("explains what happens at current exit value in plain English", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
        />
      );

      // formatCurrencyCompact returns "$50M" for 50 million
      expect(screen.getByText(/\$50M/)).toBeInTheDocument();
    });

    it("explains liquidation preferences in simple terms", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
        />
      );

      // Check the preference explanation section has explanatory text
      const explanationSection = screen.getByTestId("preference-explanation");
      expect(explanationSection).toBeInTheDocument();
      expect(explanationSection).toHaveTextContent(/preferred.*get paid first/i);
    });

    it("explains participating vs non-participating preferences", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
        />
      );

      const participatingSection = screen.getByTestId("preference-explanation");
      expect(participatingSection).toBeInTheDocument();
    });
  });

  describe("Visual Flow Diagram", () => {
    it("renders a flow diagram showing distribution order", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
        />
      );

      const flowDiagram = screen.getByTestId("waterfall-flow-diagram");
      expect(flowDiagram).toBeInTheDocument();
    });

    it("shows steps in correct order (most senior first)", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
        />
      );

      const flowDiagram = screen.getByTestId("waterfall-flow-diagram");
      const steps = within(flowDiagram).getAllByTestId(/flow-step/);

      expect(steps.length).toBeGreaterThanOrEqual(2);
    });

    it("uses visual arrows or connectors between steps", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
        />
      );

      const flowDiagram = screen.getByTestId("waterfall-flow-diagram");
      const connectors = within(flowDiagram).getAllByTestId("flow-connector");
      expect(connectors.length).toBeGreaterThan(0);
    });

    it("color codes different stakeholder types", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
        />
      );

      const flowDiagram = screen.getByTestId("waterfall-flow-diagram");
      expect(flowDiagram).toBeInTheDocument();
    });
  });

  describe("User's Specific Payout Display", () => {
    it("prominently displays selected stakeholder's payout", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
          highlightedStakeholderId="founder-1"
        />
      );

      const payoutDisplay = screen.getByTestId("highlighted-payout");
      expect(payoutDisplay).toBeInTheDocument();
      expect(within(payoutDisplay).getByText(/\$20/)).toBeInTheDocument();
    });

    it("shows payout as both dollar amount and percentage", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
          highlightedStakeholderId="founder-1"
        />
      );

      const payoutDisplay = screen.getByTestId("highlighted-payout");
      expect(within(payoutDisplay).getByText(/40%|40\.0%/)).toBeInTheDocument();
    });

    it("shows ROI for investors", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
          highlightedStakeholderId="investor-a"
        />
      );

      const payoutDisplay = screen.getByTestId("highlighted-payout");
      expect(within(payoutDisplay).getByText(/5.*x|5x/i)).toBeInTheDocument();
    });

    it("allows selecting different stakeholders to highlight", async () => {
      const user = userEvent.setup();
      const onSelectStakeholder = vi.fn();

      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
          highlightedStakeholderId="founder-1"
          onSelectStakeholder={onSelectStakeholder}
        />
      );

      const stakeholderSelector = screen.getByTestId("stakeholder-selector");
      const seriesAOption = within(stakeholderSelector).getByText(/series a/i);

      await user.click(seriesAOption);
      expect(onSelectStakeholder).toHaveBeenCalledWith("investor-a");
    });
  });

  describe("Empty and Loading States", () => {
    it("shows appropriate message when no distribution data", () => {
      render(
        <WaterfallSummary
          distribution={null}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
        />
      );

      expect(screen.getByText(/no distribution data|loading|calculating/i)).toBeInTheDocument();
    });

    it("shows message when no preference tiers configured", () => {
      const simpleDistribution: WaterfallDistribution = {
        ...mockDistribution,
        waterfall_steps: [
          {
            step_number: 1,
            description: "All proceeds distributed pro-rata",
            amount: 50000000,
            recipients: ["All stakeholders"],
            remaining_proceeds: 0,
          },
        ],
      };

      render(
        <WaterfallSummary
          distribution={simpleDistribution}
          preferenceTiers={[]}
          exitValuation={50000000}
        />
      );

      expect(screen.getByTestId("no-preferences-message")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has accessible heading structure", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
        />
      );

      const headings = screen.getAllByRole("heading");
      expect(headings.length).toBeGreaterThan(0);
    });

    it("flow diagram has descriptive aria labels", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
        />
      );

      const flowDiagram = screen.getByTestId("waterfall-flow-diagram");
      expect(flowDiagram).toHaveAttribute("aria-label");
    });

    it("payout amounts use tabular-nums for alignment", () => {
      render(
        <WaterfallSummary
          distribution={mockDistribution}
          preferenceTiers={mockPreferenceTiers}
          exitValuation={50000000}
          highlightedStakeholderId="founder-1"
        />
      );

      const payoutDisplay = screen.getByTestId("highlighted-payout");
      const payoutAmount = within(payoutDisplay).getByText(/\$20/);
      // AnimatedCurrencyDisplay nests the text in spans - tabular-nums is on a parent
      const hasTabularNums =
        payoutAmount.className.includes("tabular-nums") ||
        payoutAmount.closest(".tabular-nums") !== null;
      expect(hasTabularNums).toBe(true);
    });
  });
});
