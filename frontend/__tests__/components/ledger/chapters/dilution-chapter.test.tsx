import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { DilutionChapter } from "@/components/ledger/chapters/dilution-chapter";
import type { DilutionRoundForm } from "@/lib/schemas";
import en from "@/messages/en.json";

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

const rounds: DilutionRoundForm[] = [
  {
    round_name: "Seed",
    round_type: "SAFE_NOTE",
    year: 1,
    dilution_pct: 10,
    pre_money_valuation: 9_000_000,
    amount_raised: 1_000_000,
    salary_change: 0,
    enabled: true,
    status: "completed",
    dilution_method: "percentage",
  },
  {
    round_name: "Series A",
    round_type: "PRICED_ROUND",
    year: 2,
    dilution_pct: 20,
    pre_money_valuation: 40_000_000,
    amount_raised: 10_000_000,
    salary_change: 0,
    enabled: true,
    status: "upcoming",
    dilution_method: "percentage",
  },
];

const roundsWithDisabled: DilutionRoundForm[] = [
  {
    round_name: "Seed",
    round_type: "SAFE_NOTE",
    year: 1,
    dilution_pct: 10,
    pre_money_valuation: 9_000_000,
    amount_raised: 1_000_000,
    salary_change: 0,
    enabled: true,
    status: "completed",
    dilution_method: "percentage",
  },
  {
    round_name: "Skipped Bridge",
    round_type: "SAFE_NOTE",
    year: 2,
    dilution_pct: 50,
    pre_money_valuation: 20_000_000,
    amount_raised: 5_000_000,
    salary_change: 0,
    enabled: false,
    status: "upcoming",
    dilution_method: "percentage",
  },
  {
    round_name: "Series A",
    round_type: "PRICED_ROUND",
    year: 3,
    dilution_pct: 20,
    pre_money_valuation: 40_000_000,
    amount_raised: 10_000_000,
    salary_change: 0,
    enabled: true,
    status: "upcoming",
    dilution_method: "percentage",
  },
];

describe("DilutionChapter", () => {
  it("renders the Chapter heading with the translated title", () => {
    wrap(
      <DilutionChapter index="03" rounds={rounds} totalDilution={0.28} dilutedEquityPct={0.72} />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: en.chapters.dilution.title })
    ).toBeInTheDocument();
  });

  it("renders one row per round plus a resulting-stake column, with each round's status badge", () => {
    wrap(
      <DilutionChapter index="03" rounds={rounds} totalDilution={0.28} dilutedEquityPct={0.72} />
    );

    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: en.chapters.dilution.resultingStake })
    ).toBeInTheDocument();

    const rows = within(table).getAllByRole("row");
    // Header row + one row per round
    expect(rows).toHaveLength(rounds.length + 1);

    expect(within(table).getByText("Seed")).toBeInTheDocument();
    expect(within(table).getByText("Series A")).toBeInTheDocument();
    // Seed: 10% dilution -> 90% resulting stake
    expect(within(table).getByText("90.0%")).toBeInTheDocument();
    // Series A: 90% * (1 - 20%) = 72% resulting stake
    expect(within(table).getByText("72.0%")).toBeInTheDocument();

    // Seed is completed, Series A is upcoming — each row's own badge, not just one shared label
    expect(within(rows[1]).getByText(en.chapters.dilution.statusCompleted)).toBeInTheDocument();
    expect(within(rows[2]).getByText(en.chapters.dilution.statusUpcoming)).toBeInTheDocument();
  });

  it("skips a disabled round's own dilution but keeps compounding later enabled rounds from the stake it left unchanged", () => {
    wrap(
      <DilutionChapter
        index="03"
        rounds={roundsWithDisabled}
        totalDilution={0.28}
        dilutedEquityPct={0.72}
      />
    );

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // Header + Seed + Skipped Bridge + Series A
    expect(rows).toHaveLength(4);

    // Seed (enabled, 10%): 100% -> 90%
    expect(within(rows[1]).getByText("90.0%")).toBeInTheDocument();
    // Skipped Bridge (disabled, 50%): stake passes through unchanged at 90%,
    // not the 45% it would be if the disabled round's dilution applied
    expect(within(rows[2]).getByText("90.0%")).toBeInTheDocument();
    // Series A (enabled, 20%) compounds from the unchanged 90%, not from 45%: 90% * (1 - 20%) = 72%
    expect(within(rows[3]).getByText("72.0%")).toBeInTheDocument();
  });

  it("renders nothing for the resulting-stake summary when dilutedEquityPct is null", () => {
    wrap(
      <DilutionChapter index="03" rounds={rounds} totalDilution={null} dilutedEquityPct={null} />
    );

    expect(screen.queryByText(/diluted to/i)).not.toBeInTheDocument();
  });
});
