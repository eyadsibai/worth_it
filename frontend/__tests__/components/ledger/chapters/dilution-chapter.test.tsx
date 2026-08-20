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

describe("DilutionChapter", () => {
  it("renders the Chapter heading with the translated title", () => {
    wrap(
      <DilutionChapter index="03" rounds={rounds} totalDilution={0.28} dilutedEquityPct={0.72} />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: en.chapters.dilution.title })
    ).toBeInTheDocument();
  });

  it("renders one row per round plus a resulting-stake column", () => {
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
  });

  it("renders nothing for the resulting-stake summary when dilutedEquityPct is null", () => {
    wrap(
      <DilutionChapter index="03" rounds={rounds} totalDilution={null} dilutedEquityPct={null} />
    );

    expect(screen.queryByText(/diluted to/i)).not.toBeInTheDocument();
  });
});
