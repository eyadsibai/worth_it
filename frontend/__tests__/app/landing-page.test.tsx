import * as React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import Page from "@/app/[locale]/page";
import { useAppStore } from "@/lib/store";
import { DRAFT_SCHEMA_VERSION } from "@/lib/hooks/use-draft-auto-save";
import type { ScenarioCalculationResult } from "@/lib/hooks";
import type { MonteCarloResponse } from "@/lib/schemas";
import en from "@/messages/en.json";

const DRAFT_STORAGE_KEY = "worth-it-draft-employee";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    locale: _locale,
    ...props
  }: React.ComponentProps<"a"> & { locale?: string }) => (
    <a href={typeof href === "string" ? href : String(href)} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/",
}));

vi.mock("@/lib/hooks", () => ({
  useScenarioCalculation: vi.fn(),
}));

let mockWsReturn: {
  isConnected: boolean;
  isRunning: boolean;
  progress: { current: number; total: number; percentage: number } | null;
  result: MonteCarloResponse | null;
  error: string | null;
  runSimulation: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
};

vi.mock("@/lib/api-client", () => ({
  useMonteCarloWebSocket: () => mockWsReturn,
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

const completeCalculation: ScenarioCalculationResult = {
  hasValidData: true,
  isPending: false,
  isFetching: false,
  isCalculating: false,
  result: {
    results_df: [],
    final_payout_value: 500_000,
    final_payout_value_npv: 400_000,
    final_opportunity_cost: 100_000,
    final_opportunity_cost_npv: 80_000,
    payout_label: "",
    breakeven_label: "$50/share",
    total_dilution: 0.2,
    diluted_equity_pct: 0.008,
  },
  error: null,
  errorType: "generic",
  retry: vi.fn(),
  monthlyData: { data: [{ month: 1 }, { month: 2 }] },
  opportunityCost: { data: [{ cumulative_opportunity_cost: 12_000 }] },
};

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

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  useAppStore.setState({
    appMode: "employee",
    globalSettings: null,
    currentJob: null,
    equityDetails: null,
    offers: [{ id: "test-offer-0", name: "", equityDetails: null }],
    commandPaletteOpen: false,
    monteCarloResults: null,
    preferenceTiers: [],
    displayCurrency: "USD",
  });
  mockUseScenarioCalculation.mockReturnValue(completeCalculation);
  mockWsReturn = {
    isConnected: false,
    isRunning: false,
    progress: null,
    result: null,
    error: null,
    runSimulation: vi.fn(),
    cancel: vi.fn(),
  };
});

describe("Landing page", () => {
  it("renders the Stay column and the offer column", () => {
    wrap(<Page />);

    expect(screen.getByRole("heading", { name: en.duel.stay })).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(en.duel.offerDefaultName.replace("{letter}", "A"))
    ).toBeInTheDocument();
  });

  it("renders a non-empty verdict sentence in an aria-live region", () => {
    const { container } = wrap(<Page />);

    const live = container.querySelector('[aria-live="polite"]');
    expect(live).not.toBeNull();
    expect(live?.textContent?.length).toBeGreaterThan(0);
  });

  it("shows the sample notice on first visit", () => {
    wrap(<Page />);

    expect(screen.getByRole("note")).toHaveTextContent(en.landing.sampleNotice);
  });

  it("never renders a dialog (the onboarding modal is gone)", () => {
    wrap(<Page />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("hides the sample notice once it has already been dismissed", () => {
    window.localStorage.setItem("worth_it_onboarded", "true");

    wrap(<Page />);

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("renders the failure notice with a retry action when the leading offer errors", async () => {
    window.localStorage.setItem("worth_it_onboarded", "true");
    useAppStore.setState({
      globalSettings: { exit_year: 5 },
      currentJob: {
        monthly_salary: 10_000,
        annual_salary_growth_rate: 3,
        assumed_annual_roi: 5.4,
        investment_frequency: "Monthly",
      },
      offers: [
        {
          id: "test-offer-0",
          name: "Atlas",
          equityDetails: {
            equity_type: "RSU",
            monthly_salary: 8_000,
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
    const retry = vi.fn();
    mockUseScenarioCalculation.mockReturnValue({
      ...emptyCalculation,
      error: new Error("boom"),
      retry,
    });

    wrap(<Page />);

    const retryButton = await screen.findByRole("button", { name: en.states.failure.retry });
    retryButton.click();
    expect(retry).toHaveBeenCalled();
  });
});

describe("Incomplete verdict focuses the missing field", () => {
  it("focuses the Equity grant field on click, not an earlier empty field like Offer name", async () => {
    window.localStorage.setItem("worth_it_onboarded", "true");
    const user = userEvent.setup();
    wrap(<Page />);

    const verdictButton = screen.getByRole("button", { name: /enter the equity grant/i });
    await user.click(verdictButton);

    const equityGrantInput = screen.getByRole("textbox", { name: /equity grant/i });
    expect(equityGrantInput).toHaveFocus();
  });

  it("focuses the Monthly salary field for an RSU offer missing salary", async () => {
    window.localStorage.setItem("worth_it_onboarded", "true");
    useAppStore.setState({
      offers: [
        {
          id: "test-offer-0",
          name: "Atlas",
          equityDetails: {
            equity_type: "RSU",
            monthly_salary: 0,
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
    const user = userEvent.setup();
    wrap(<Page />);

    const verdictButton = screen.getByRole("button", { name: /enter the monthly salary/i });
    await user.click(verdictButton);

    // "Monthly salary" also labels the Stay column's own field, so scope by
    // `data-field` (the mechanism under test) to the offer column's input.
    const salaryInputs = screen.getAllByRole("textbox", { name: /monthly salary/i });
    const salaryInput = salaryInputs.find((input) => input.getAttribute("data-field") === "salary");
    expect(salaryInput).toHaveFocus();
  });

  it("focuses the Exit valuation field for an RSU offer missing the exit value", async () => {
    window.localStorage.setItem("worth_it_onboarded", "true");
    useAppStore.setState({
      offers: [
        {
          id: "test-offer-0",
          name: "Atlas",
          equityDetails: {
            equity_type: "RSU",
            monthly_salary: 8_000,
            total_equity_grant_pct: 1,
            vesting_period: 4,
            cliff_period: 1,
            simulate_dilution: false,
            dilution_rounds: [],
            exit_valuation: 0,
          },
        },
      ],
    });
    const user = userEvent.setup();
    wrap(<Page />);

    const verdictButton = screen.getByRole("button", { name: /enter the exit valuation/i });
    await user.click(verdictButton);

    const exitInput = screen.getByRole("textbox", { name: /exit valuation/i });
    expect(exitInput).toHaveFocus();
  });

  it("focuses the Number of options field for a stock-options offer missing the grant size", async () => {
    window.localStorage.setItem("worth_it_onboarded", "true");
    useAppStore.setState({
      offers: [
        {
          id: "test-offer-0",
          name: "Atlas",
          equityDetails: {
            equity_type: "STOCK_OPTIONS",
            monthly_salary: 8_000,
            num_options: 0,
            strike_price: 1,
            vesting_period: 4,
            cliff_period: 1,
            exercise_strategy: "AT_EXIT",
            exit_price_per_share: 50,
          },
        },
      ],
    });
    const user = userEvent.setup();
    wrap(<Page />);

    const verdictButton = screen.getByRole("button", { name: /enter the equity grant/i });
    await user.click(verdictButton);

    const optionsInput = screen.getByRole("textbox", { name: /number of options/i });
    expect(optionsInput).toHaveFocus();
  });

  it("focuses the Exit price / share field for a stock-options offer missing the exit value", async () => {
    window.localStorage.setItem("worth_it_onboarded", "true");
    useAppStore.setState({
      offers: [
        {
          id: "test-offer-0",
          name: "Atlas",
          equityDetails: {
            equity_type: "STOCK_OPTIONS",
            monthly_salary: 8_000,
            num_options: 1_000,
            strike_price: 1,
            vesting_period: 4,
            cliff_period: 1,
            exercise_strategy: "AT_EXIT",
            exit_price_per_share: 0,
          },
        },
      ],
    });
    const user = userEvent.setup();
    wrap(<Page />);

    const verdictButton = screen.getByRole("button", { name: /enter the exit valuation/i });
    await user.click(verdictButton);

    const exitPriceInput = screen.getByRole("textbox", { name: /exit price/i });
    expect(exitPriceInput).toHaveFocus();
  });
});

describe("Skip link and main landmark", () => {
  it("renders a skip-to-main-content link targeting an id'd <main>", () => {
    window.localStorage.setItem("worth_it_onboarded", "true");
    wrap(<Page />);

    const skipLink = screen.getByRole("link", { name: en.a11y.skipToMainContent });
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });
});

describe("Sample notice landmark containment", () => {
  it("renders the sample notice inside the main landmark, not as a bare sibling of it", () => {
    wrap(<Page />);

    const main = screen.getByRole("main");
    const note = screen.getByRole("note");
    expect(main).toContainElement(note);
    expect(within(main).getByRole("note")).toBe(note);
  });
});

describe("Seed display (single source of truth)", () => {
  it("renders the simulation seed only once, in the document header", () => {
    window.localStorage.setItem("worth_it_onboarded", "true");
    useAppStore.setState({
      globalSettings: { exit_year: 5 },
      currentJob: {
        monthly_salary: 10_000,
        annual_salary_growth_rate: 3,
        assumed_annual_roi: 5.4,
        investment_frequency: "Monthly",
      },
      offers: [
        {
          id: "test-offer-0",
          name: "Atlas",
          equityDetails: {
            equity_type: "RSU",
            monthly_salary: 8_000,
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

    // Render first with no Monte Carlo result yet, so the leading offer (and
    // its `previousLeadingIdRef` tracking, which clears `mcOverride` whenever
    // the leader changes) settles *before* a run completes — matching the
    // real flow where a run can only start once the chapters (and their
    // "Run simulations" button) already exist. Seeding a result before the
    // very first render would race the leader's null→real transition against
    // this same-render "new leader" clear.
    const { container, rerender } = wrap(<Page />);

    mockWsReturn.result = {
      net_outcomes: [1, 2, 3],
      simulated_valuations: [1, 2, 3],
      seed: 42,
      net_outcome_percentiles: { p10: 1, p25: 2, p50: 3, p75: 4, p90: 5 },
      payout_percentiles: { p10: 1, p25: 2, p50: 3, p75: 4, p90: 5 },
      probability_offer_wins: 0.6,
    };
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <Page />
      </NextIntlClientProvider>
    );

    expect(screen.getAllByText(en.landing.seed)).toHaveLength(1);
    expect(container.querySelector("footer")).not.toBeInTheDocument();
  });
});

describe("Chapter numbering with Dilution absent", () => {
  it("omits chapter 03 for a complete stock-options offer, keeping Sensitivity at 04 and Waterfall at 05", () => {
    window.localStorage.setItem("worth_it_onboarded", "true");
    useAppStore.setState({
      globalSettings: { exit_year: 5 },
      currentJob: {
        monthly_salary: 10_000,
        annual_salary_growth_rate: 3,
        assumed_annual_roi: 5.4,
        investment_frequency: "Monthly",
      },
      offers: [
        {
          id: "test-offer-0",
          name: "Atlas",
          equityDetails: {
            equity_type: "STOCK_OPTIONS",
            monthly_salary: 8_000,
            num_options: 1_000,
            strike_price: 1,
            vesting_period: 4,
            cliff_period: 1,
            exercise_strategy: "AT_EXIT",
            exit_price_per_share: 50,
          },
        },
      ],
    });

    wrap(<Page />);

    expect(
      screen.queryByRole("heading", { name: en.chapters.dilution.title })
    ).not.toBeInTheDocument();

    const sensitivityHeading = screen.getByRole("heading", { name: en.chapters.sensitivity.title });
    expect(sensitivityHeading.previousElementSibling).toHaveTextContent("04");

    const waterfallHeading = screen.getByRole("heading", { name: en.chapters.waterfall.title });
    expect(waterfallHeading.previousElementSibling).toHaveTextContent("05");
  });
});

describe("Draft restoration", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("restores a valid draft into the store on mount", async () => {
    window.localStorage.setItem("worth_it_onboarded", "true");
    const draft = {
      version: DRAFT_SCHEMA_VERSION,
      data: {
        globalSettings: { exit_year: 7 },
        currentJob: {
          monthly_salary: 12_000,
          annual_salary_growth_rate: 4,
          assumed_annual_roi: 6,
          investment_frequency: "Monthly",
        },
        equityDetails: null,
        offers: [
          {
            id: "draft-offer-1",
            name: "Nimbus",
            equityDetails: {
              equity_type: "RSU",
              monthly_salary: 12_000,
              total_equity_grant_pct: 1,
              vesting_period: 4,
              cliff_period: 1,
              simulate_dilution: false,
              dilution_rounds: [],
              exit_valuation: 50_000_000,
            },
          },
        ],
      },
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));

    wrap(<Page />);

    await waitFor(() => {
      expect(useAppStore.getState().globalSettings).toEqual({ exit_year: 7 });
    });
    expect(useAppStore.getState().currentJob?.monthly_salary).toBe(12_000);
    expect(useAppStore.getState().offers).toHaveLength(1);
    expect(useAppStore.getState().offers[0].name).toBe("Nimbus");
  });

  it("prefers a restored draft over loading the sample on first visit", async () => {
    const draft = {
      version: DRAFT_SCHEMA_VERSION,
      data: {
        globalSettings: { exit_year: 7 },
        currentJob: {
          monthly_salary: 12_000,
          annual_salary_growth_rate: 4,
          assumed_annual_roi: 6,
          investment_frequency: "Monthly",
        },
        equityDetails: null,
        offers: [{ id: "draft-offer-1", name: "Nimbus", equityDetails: null }],
      },
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));

    wrap(<Page />);

    await waitFor(() => {
      expect(useAppStore.getState().globalSettings).toEqual({ exit_year: 7 });
    });
    expect(useAppStore.getState().offers[0].name).toBe("Nimbus");
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    // The visit is still marked onboarded, so a future reload without a draft
    // never re-triggers the sample flow either.
    expect(window.localStorage.getItem("worth_it_onboarded")).toBe("true");
  });

  it("auto-saves the live offers to a draft", async () => {
    vi.useFakeTimers();
    window.localStorage.setItem("worth_it_onboarded", "true");
    useAppStore.setState({
      globalSettings: { exit_year: 6 },
      currentJob: {
        monthly_salary: 9_000,
        annual_salary_growth_rate: 3,
        assumed_annual_roi: 5.4,
        investment_frequency: "Monthly",
      },
      offers: [
        {
          id: "test-offer-0",
          name: "Atlas",
          equityDetails: {
            equity_type: "RSU",
            monthly_salary: 9_000,
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

    wrap(<Page />);

    await vi.advanceTimersByTimeAsync(5000);

    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.data.offers).toEqual(useAppStore.getState().offers);
  });
});
