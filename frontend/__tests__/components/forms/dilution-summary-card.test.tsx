import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { DilutionSummaryCard } from "@/components/forms/dilution-summary-card";
import type { DilutionRoundForm } from "@/lib/schemas";

describe("DilutionSummaryCard", () => {
  const createRound = (
    overrides: Partial<DilutionRoundForm>
  ): DilutionRoundForm => ({
    round_name: "Test Round",
    round_type: "PRICED_ROUND",
    year: 1,
    enabled: true,
    dilution_pct: 20,
    pre_money_valuation: 10_000_000,
    amount_raised: 2_000_000,
    salary_change: 0,
    status: "upcoming",
    ...overrides,
  });

  describe("rendering", () => {
    it("renders nothing when no rounds are provided", () => {
      const { container } = render(
        <DilutionSummaryCard completedRounds={[]} upcomingRounds={[]} />
      );
      expect(container.firstChild).toBeNull();
    });

    it("renders the card title", () => {
      render(
        <DilutionSummaryCard
          completedRounds={[createRound({ status: "completed", year: -1 })]}
          upcomingRounds={[]}
        />
      );
      expect(screen.getByText("Dilution Overview")).toBeInTheDocument();
    });
  });

  describe("historical dilution calculation", () => {
    it("calculates historical dilution from completed rounds", () => {
      const completedRounds = [
        createRound({ status: "completed", year: -2, dilution_pct: 15 }),
        createRound({ status: "completed", year: -1, dilution_pct: 20 }),
      ];

      render(
        <DilutionSummaryCard completedRounds={completedRounds} upcomingRounds={[]} />
      );

      // Historical dilution: 1 - (0.85 * 0.80) = 1 - 0.68 = 0.32 = 32%
      expect(screen.getByTestId("historical-dilution")).toHaveTextContent("32.0%");
    });

    it("only includes enabled completed rounds in calculation", () => {
      const completedRounds = [
        createRound({ status: "completed", year: -2, dilution_pct: 15, enabled: true }),
        createRound({ status: "completed", year: -1, dilution_pct: 20, enabled: false }),
      ];

      render(
        <DilutionSummaryCard completedRounds={completedRounds} upcomingRounds={[]} />
      );

      // Only 15% dilution counts (enabled round)
      expect(screen.getByTestId("historical-dilution")).toHaveTextContent("15.0%");
    });
  });

  describe("projected dilution calculation", () => {
    it("calculates projected dilution from enabled upcoming rounds", () => {
      const upcomingRounds = [
        createRound({ status: "upcoming", year: 2, dilution_pct: 18, enabled: true }),
        createRound({ status: "upcoming", year: 3, dilution_pct: 15, enabled: true }),
      ];

      render(
        <DilutionSummaryCard completedRounds={[]} upcomingRounds={upcomingRounds} />
      );

      // Projected dilution: 1 - (0.82 * 0.85) = 1 - 0.697 = 0.303 = 30.3%
      expect(screen.getByTestId("projected-dilution")).toHaveTextContent("30.3%");
    });

    it("only includes enabled upcoming rounds in calculation", () => {
      const upcomingRounds = [
        createRound({ status: "upcoming", year: 2, dilution_pct: 18, enabled: true }),
        createRound({ status: "upcoming", year: 3, dilution_pct: 15, enabled: false }),
      ];

      render(
        <DilutionSummaryCard completedRounds={[]} upcomingRounds={upcomingRounds} />
      );

      // Only 18% dilution counts (enabled round)
      expect(screen.getByTestId("projected-dilution")).toHaveTextContent("18.0%");
    });

    it("shows 0% when no upcoming rounds are enabled", () => {
      const upcomingRounds = [
        createRound({ status: "upcoming", year: 2, dilution_pct: 18, enabled: false }),
      ];

      render(
        <DilutionSummaryCard
          completedRounds={[createRound({ status: "completed", year: -1 })]}
          upcomingRounds={upcomingRounds}
        />
      );

      expect(screen.getByTestId("projected-dilution")).toHaveTextContent("0.0%");
    });
  });

  describe("total dilution calculation", () => {
    it("calculates total dilution from both completed and upcoming rounds", () => {
      const completedRounds = [
        createRound({ status: "completed", year: -1, dilution_pct: 20 }),
      ];
      const upcomingRounds = [
        createRound({ status: "upcoming", year: 2, dilution_pct: 15, enabled: true }),
      ];

      render(
        <DilutionSummaryCard
          completedRounds={completedRounds}
          upcomingRounds={upcomingRounds}
        />
      );

      // Total: 1 - (0.80 * 0.85) = 1 - 0.68 = 0.32 = 32%
      expect(screen.getByTestId("total-dilution")).toHaveTextContent("32.0%");
    });
  });

  describe("equity remaining display", () => {
    it("displays the correct equity remaining percentage", () => {
      const completedRounds = [
        createRound({ status: "completed", year: -1, dilution_pct: 20 }),
      ];
      const upcomingRounds = [
        createRound({ status: "upcoming", year: 2, dilution_pct: 15, enabled: true }),
      ];

      render(
        <DilutionSummaryCard
          completedRounds={completedRounds}
          upcomingRounds={upcomingRounds}
        />
      );

      // Equity remaining: 0.80 * 0.85 = 0.68 = 68%
      expect(screen.getByTestId("equity-remaining")).toHaveTextContent("68%");
    });
  });

  describe("visual progress bar", () => {
    it("renders the equity remaining progress bar", () => {
      const completedRounds = [
        createRound({ status: "completed", year: -1, dilution_pct: 30 }),
      ];

      render(
        <DilutionSummaryCard completedRounds={completedRounds} upcomingRounds={[]} />
      );

      const progressBar = screen.getByTestId("dilution-progress-bar");
      expect(progressBar).toBeInTheDocument();
    });
  });
});
