import * as React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { OfferColumn } from "@/components/ledger/offer-column";
import { useAppStore } from "@/lib/store";
import type { ScenarioCalculationResult } from "@/lib/hooks";
import en from "@/messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/hooks", () => ({
  useScenarioCalculation: vi.fn(),
}));

import { useScenarioCalculation } from "@/lib/hooks";
const mockUseScenarioCalculation = useScenarioCalculation as unknown as ReturnType<typeof vi.fn>;

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

const emptyCalculation: ScenarioCalculationResult = {
  hasValidData: false,
  isPending: false,
  isFetching: false,
  isCalculating: false,
  result: undefined,
  error: null,
  errorType: "generic",
  retry: vi.fn(),
  monthlyData: undefined,
  opportunityCost: undefined,
};

const OFFER_ID = "offer-1";

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({
    offers: [{ id: OFFER_ID, name: "", equityDetails: null }],
    currentJob: {
      monthly_salary: 10000,
      annual_salary_growth_rate: 3,
      assumed_annual_roi: 5.4,
      investment_frequency: "Monthly",
    },
    globalSettings: { exit_year: 5 },
  });
  mockUseScenarioCalculation.mockReturnValue(emptyCalculation);
});

describe("OfferColumn", () => {
  it("renders the editable offer name input", () => {
    wrap(<OfferColumn offerId={OFFER_ID} onOutcome={vi.fn()} onScenarioData={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: "Offer name" })).toBeInTheDocument();
  });

  it("shows the RSU field set by default and swaps to the options field set when toggled", async () => {
    const user = userEvent.setup();
    wrap(<OfferColumn offerId={OFFER_ID} onOutcome={vi.fn()} onScenarioData={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: /Equity grant/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /Strike price/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Options" }));

    expect(screen.getByRole("textbox", { name: /Strike price/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /Equity grant/i })).not.toBeInTheDocument();
  });

  it("reports complete:false and missingField:equity when the offer has no equity details yet", () => {
    const onOutcome = vi.fn();
    wrap(<OfferColumn offerId={OFFER_ID} onOutcome={onOutcome} onScenarioData={vi.fn()} />);

    expect(onOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ id: OFFER_ID, complete: false, missingField: "equity" })
    );
  });

  it("reports the full scenario calculation result upward via onScenarioData", () => {
    const onScenarioData = vi.fn();
    wrap(<OfferColumn offerId={OFFER_ID} onOutcome={vi.fn()} onScenarioData={onScenarioData} />);

    expect(onScenarioData).toHaveBeenCalledWith(OFFER_ID, emptyCalculation);
  });

  it("derives medianNet from the NPV fields by default once the offer is complete and calculated", () => {
    useAppStore.setState({
      offers: [
        {
          id: OFFER_ID,
          name: "Atlas",
          equityDetails: {
            equity_type: "RSU" as const,
            monthly_salary: 12000,
            total_equity_grant_pct: 1,
            vesting_period: 4,
            cliff_period: 1,
            simulate_dilution: false,
            dilution_rounds: [],
            exit_valuation: 100_000_000,
          },
        },
      ],
    });
    mockUseScenarioCalculation.mockReturnValue({
      ...emptyCalculation,
      hasValidData: true,
      result: {
        results_df: [],
        final_payout_value: 500000,
        final_payout_value_npv: 400000,
        final_opportunity_cost: 100000,
        final_opportunity_cost_npv: 80000,
        payout_label: "",
        breakeven_label: "",
        total_dilution: null,
        diluted_equity_pct: null,
      },
    });
    const onOutcome = vi.fn();
    wrap(<OfferColumn offerId={OFFER_ID} onOutcome={onOutcome} onScenarioData={vi.fn()} />);

    expect(onOutcome).toHaveBeenCalledWith(
      expect.objectContaining({ complete: true, missingField: null, medianNet: 320000 })
    );
  });

  it("uses the non-NPV fields when useNpv is false", () => {
    useAppStore.setState({
      offers: [
        {
          id: OFFER_ID,
          name: "Atlas",
          equityDetails: {
            equity_type: "RSU" as const,
            monthly_salary: 12000,
            total_equity_grant_pct: 1,
            vesting_period: 4,
            cliff_period: 1,
            simulate_dilution: false,
            dilution_rounds: [],
            exit_valuation: 100_000_000,
          },
        },
      ],
    });
    mockUseScenarioCalculation.mockReturnValue({
      ...emptyCalculation,
      hasValidData: true,
      result: {
        results_df: [],
        final_payout_value: 500000,
        final_payout_value_npv: 400000,
        final_opportunity_cost: 100000,
        final_opportunity_cost_npv: 80000,
        payout_label: "",
        breakeven_label: "",
        total_dilution: null,
        diluted_equity_pct: null,
      },
    });
    const onOutcome = vi.fn();
    wrap(
      <OfferColumn
        offerId={OFFER_ID}
        onOutcome={onOutcome}
        onScenarioData={vi.fn()}
        useNpv={false}
      />
    );

    expect(onOutcome).toHaveBeenCalledWith(expect.objectContaining({ medianNet: 400000 }));
  });

  it("shows a non-zero diluted-stake summary for the real sample's sub-1% grant, instead of a rounded-away 0%", () => {
    // 0.002601 is the early-stage sample's real diluted_equity_pct: a 0.5%
    // total_equity_grant_pct (lib/constants/examples.ts) diluted by the
    // sample's round schedule (cumulative factor ~0.5202) leaves a stake of
    // 0.2601%. This used to render as "Diluted to 0% by exit".
    useAppStore.setState({
      offers: [
        {
          id: OFFER_ID,
          name: "Atlas",
          equityDetails: {
            equity_type: "RSU" as const,
            monthly_salary: 8000,
            total_equity_grant_pct: 0.5,
            vesting_period: 4,
            cliff_period: 1,
            simulate_dilution: true,
            dilution_rounds: [],
            exit_valuation: 100_000_000,
          },
        },
      ],
    });
    mockUseScenarioCalculation.mockReturnValue({
      ...emptyCalculation,
      hasValidData: true,
      result: {
        results_df: [],
        final_payout_value: 260100,
        final_payout_value_npv: 260100,
        final_opportunity_cost: 0,
        final_opportunity_cost_npv: 0,
        payout_label: "",
        breakeven_label: "",
        total_dilution: 0.48,
        diluted_equity_pct: 0.002601,
      },
    });
    wrap(<OfferColumn offerId={OFFER_ID} onOutcome={vi.fn()} onScenarioData={vi.fn()} />);

    expect(screen.getByText("Diluted to 0.3% by exit")).toBeInTheDocument();
    expect(screen.queryByText("Diluted to 0% by exit")).not.toBeInTheDocument();
  });
});
