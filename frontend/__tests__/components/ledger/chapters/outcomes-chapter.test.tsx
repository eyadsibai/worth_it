import { render, screen, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { OutcomesChapter } from "@/components/ledger/chapters/outcomes-chapter";
import type {
  CurrentJobForm,
  GlobalSettingsForm,
  RSUForm,
  MonteCarloResponse,
} from "@/lib/schemas";
import en from "@/messages/en.json";

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

const globalSettings: GlobalSettingsForm = { exit_year: 5 };

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

const percentiles = { p10: -82985, p25: -40185, p50: 22542, p75: 127215, p90: 289615 };

const completedResult: MonteCarloResponse = {
  net_outcomes: [10000, 20000, 30000],
  simulated_valuations: [500000, 750000, 1000000],
  seed: 20260820,
  net_outcome_percentiles: percentiles,
  payout_percentiles: { ...percentiles, p10: 0 },
  probability_offer_wins: 0.64,
};

const mockRunSimulation = vi.fn();
const mockCancel = vi.fn();

let mockHookReturn: {
  isConnected: boolean;
  isRunning: boolean;
  progress: { current: number; total: number; percentage: number } | null;
  result: MonteCarloResponse | null;
  error: string | null;
  runSimulation: typeof mockRunSimulation;
  cancel: typeof mockCancel;
};

vi.mock("@/lib/api-client", () => ({
  useMonteCarloWebSocket: () => mockHookReturn,
}));

describe("OutcomesChapter", () => {
  beforeEach(() => {
    mockRunSimulation.mockClear();
    mockCancel.mockClear();
    mockHookReturn = {
      isConnected: false,
      isRunning: false,
      progress: null,
      result: completedResult,
      error: null,
      runSimulation: mockRunSimulation,
      cancel: mockCancel,
    };
  });

  it("renders the Chapter heading with the translated title", () => {
    wrap(
      <OutcomesChapter
        index="02"
        globalSettings={globalSettings}
        currentJob={currentJob}
        equityDetails={equityDetails}
        onPercentiles={vi.fn()}
      />
    );

    expect(
      screen.getByRole("heading", { level: 2, name: en.chapters.outcomes.title })
    ).toBeInTheDocument();
  });

  it("renders +$22,542 in the median row", () => {
    wrap(
      <OutcomesChapter
        index="02"
        globalSettings={globalSettings}
        currentJob={currentJob}
        equityDetails={equityDetails}
        onPercentiles={vi.fn()}
      />
    );

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    const medianRow = rows.find((row) => within(row).queryByText(en.chapters.outcomes.rowMedian));
    expect(medianRow).toBeDefined();
    expect(within(medianRow as HTMLElement).getAllByText("+$22,542").length).toBeGreaterThan(0);
  });

  it('renders the seed inside a <bdi dir="ltr">', () => {
    wrap(
      <OutcomesChapter
        index="02"
        globalSettings={globalSettings}
        currentJob={currentJob}
        equityDetails={equityDetails}
        onPercentiles={vi.fn()}
      />
    );

    const bdi = screen.getByText("20260820");
    expect(bdi.tagName).toBe("BDI");
    expect(bdi).toHaveAttribute("dir", "ltr");
  });

  it("calls onPercentiles with the percentiles, probability, and seed when a result lands", () => {
    const onPercentiles = vi.fn();
    wrap(
      <OutcomesChapter
        index="02"
        globalSettings={globalSettings}
        currentJob={currentJob}
        equityDetails={equityDetails}
        onPercentiles={onPercentiles}
      />
    );

    expect(onPercentiles).toHaveBeenCalledWith(percentiles, 0.64, 20260820);
  });

  it("signals a reset with nulls when a new run clears the previous result", () => {
    const onPercentiles = vi.fn();
    // Mirrors the real hook's own `runSimulation`, which resets `result` to
    // null the instant a new run starts.
    mockRunSimulation.mockImplementation(() => {
      mockHookReturn = { ...mockHookReturn, result: null };
    });

    const { rerender } = wrap(
      <OutcomesChapter
        index="02"
        globalSettings={globalSettings}
        currentJob={currentJob}
        equityDetails={equityDetails}
        onPercentiles={onPercentiles}
      />
    );
    onPercentiles.mockClear(); // drop the initial "result landed" call

    screen
      .getByRole("button", { name: en.chapters.outcomes.run.replace("{runs}", "10,000") })
      .click();
    rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <OutcomesChapter
          index="02"
          globalSettings={globalSettings}
          currentJob={currentJob}
          equityDetails={equityDetails}
          onPercentiles={onPercentiles}
        />
      </NextIntlClientProvider>
    );

    expect(onPercentiles).toHaveBeenCalledWith(null, null, null);
  });

  it("runs a simulation via the WebSocket hook when the run action is clicked", () => {
    mockHookReturn.result = null;
    wrap(
      <OutcomesChapter
        index="02"
        globalSettings={globalSettings}
        currentJob={currentJob}
        equityDetails={equityDetails}
        onPercentiles={vi.fn()}
      />
    );

    screen
      .getByRole("button", { name: en.chapters.outcomes.run.replace("{runs}", "10,000") })
      .click();
    expect(mockRunSimulation).toHaveBeenCalledTimes(1);
  });

  it("renders a progressbar rule while running", () => {
    mockHookReturn.result = null;
    mockHookReturn.isRunning = true;
    mockHookReturn.progress = { current: 5000, total: 10000, percentage: 50 };
    wrap(
      <OutcomesChapter
        index="02"
        globalSettings={globalSettings}
        currentJob={currentJob}
        equityDetails={equityDetails}
        onPercentiles={vi.fn()}
      />
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders an Assumptions disclosure holding the runs input and a re-roll-seed button", () => {
    wrap(
      <OutcomesChapter
        index="02"
        globalSettings={globalSettings}
        currentJob={currentJob}
        equityDetails={equityDetails}
        onPercentiles={vi.fn()}
      />
    );

    expect(screen.getByText(en.chapters.outcomes.assumptions)).toBeInTheDocument();
    expect(screen.getByLabelText(en.chapters.outcomes.runsLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.chapters.outcomes.reroll })).toBeInTheDocument();
  });

  it("omits the percentile table and OutcomeBand before any result has landed", () => {
    mockHookReturn.result = null;
    wrap(
      <OutcomesChapter
        index="02"
        globalSettings={globalSettings}
        currentJob={currentJob}
        equityDetails={equityDetails}
        onPercentiles={vi.fn()}
      />
    );

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
