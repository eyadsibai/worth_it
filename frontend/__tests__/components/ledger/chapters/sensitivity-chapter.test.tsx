import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { SensitivityChapter } from "@/components/ledger/chapters/sensitivity-chapter";
import type { CurrentJobForm, RSUForm, StartupScenarioResponse } from "@/lib/schemas";
import en from "@/messages/en.json";

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

const currentJob: CurrentJobForm = {
  monthly_salary: 10_000,
  annual_salary_growth_rate: 3,
  assumed_annual_roi: 5.4,
  investment_frequency: "Monthly",
};

const equityDetails: RSUForm = {
  equity_type: "RSU",
  monthly_salary: 8_000,
  total_equity_grant_pct: 1,
  vesting_period: 4,
  cliff_period: 1,
  simulate_dilution: false,
  dilution_rounds: [],
  exit_valuation: 10_000_000,
};

const result: StartupScenarioResponse = {
  results_df: [],
  final_payout_value: 50_000,
  final_payout_value_npv: null,
  final_opportunity_cost: 40_000,
  final_opportunity_cost_npv: null,
  payout_label: "",
  breakeven_label: "",
  total_dilution: null,
  diluted_equity_pct: null,
};

describe("SensitivityChapter", () => {
  it("renders the Chapter heading with the translated title", () => {
    wrap(
      <SensitivityChapter
        index="04"
        result={result}
        currentJob={currentJob}
        equityDetails={equityDetails}
      />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: en.chapters.sensitivity.title })
    ).toBeInTheDocument();
  });

  it("renders the linear-approximation label", () => {
    wrap(
      <SensitivityChapter
        index="04"
        result={result}
        currentJob={currentJob}
        equityDetails={equityDetails}
      />
    );

    expect(screen.getByText(en.chapters.sensitivity.approximation)).toBeInTheDocument();
  });

  it("still renders the approximation label when there isn't enough data for a threshold", () => {
    wrap(
      <SensitivityChapter
        index="04"
        result={result}
        currentJob={currentJob}
        equityDetails={{ ...equityDetails, exit_valuation: 0 }}
      />
    );

    expect(screen.getByText(en.chapters.sensitivity.approximation)).toBeInTheDocument();
  });
});
