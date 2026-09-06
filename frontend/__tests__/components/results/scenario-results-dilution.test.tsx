/**
 * Tests that the Total Dilution metric card renders the backend-computed value.
 *
 * All business logic lives in the backend (see CLAUDE.md); the frontend must not
 * recompute dilution from the raw form rounds.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScenarioResults } from "@/components/results/scenario-results";
import type { StartupScenarioResponse, RSUForm } from "@/lib/schemas";

beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    constructor(callback: IntersectionObserverCallback) {
      setTimeout(() => callback([], this as IntersectionObserver), 0);
    }
    root = null;
    rootMargin = "";
    thresholds = [];
    takeRecords = () => [];
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// useReducedMotion=true makes AnimatedPercentage render its exact target value
// synchronously instead of animating up from zero.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: { children: React.ReactNode }) => (
      <span {...props}>{children}</span>
    ),
  },
  useReducedMotion: () => true,
  useInView: () => true,
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: vi.fn(),
    on: vi.fn(() => vi.fn()),
  }),
  useSpring: (value: { get: () => number }) => ({
    get: () => value.get(),
    set: vi.fn(),
    on: vi.fn(() => vi.fn()),
  }),
  useTransform: (value: { get: () => number }, transform: (v: number) => string) => ({
    get: () => transform(value.get()),
    on: vi.fn(() => vi.fn()),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LineChart: () => <div data-testid="line-chart" />,
  AreaChart: () => <div data-testid="area-chart" />,
  Line: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ReferenceLine: () => null,
}));

/** Backend says 15% total dilution. */
const apiResults: StartupScenarioResponse = {
  final_payout_value: 500000,
  final_opportunity_cost: 200000,
  payout_label: "Total equity value",
  breakeven_label: "Break-even at Year 3",
  total_dilution: 0.15,
  diluted_equity_pct: 0.85,
  results_df: [
    {
      year: 1,
      startup_monthly_salary: 10000,
      current_job_monthly_salary: 12000,
      monthly_surplus: -2000,
      cumulative_opportunity_cost: 24000,
      breakeven_value: 50000,
    },
  ],
};

/**
 * Rounds that a frontend-side recomputation would turn into
 * 1 - (1 - 0.20) * (1 - 0.30) = 0.44, i.e. 44% -- deliberately different
 * from the backend's 15% so the two sources are distinguishable.
 */
const equityDetails: RSUForm = {
  equity_type: "RSU",
  monthly_salary: 8000,
  total_equity_grant_pct: 0.5,
  vesting_period: 4,
  cliff_period: 1,
  simulate_dilution: true,
  exit_valuation: 100000000,
  dilution_rounds: [
    {
      round_name: "Series A",
      round_type: "PRICED_ROUND",
      year: 1,
      dilution_pct: 20,
      pre_money_valuation: 10000000,
      amount_raised: 2500000,
      salary_change: 0,
      enabled: true,
      status: "upcoming",
      dilution_method: "percentage",
    },
    {
      round_name: "Series B",
      round_type: "PRICED_ROUND",
      year: 3,
      dilution_pct: 30,
      pre_money_valuation: 40000000,
      amount_raised: 17000000,
      salary_change: 0,
      enabled: true,
      status: "upcoming",
      dilution_method: "percentage",
    },
  ],
};

describe("ScenarioResults total dilution", () => {
  it("renders the backend total_dilution, not a value recomputed from the form rounds", () => {
    render(<ScenarioResults results={apiResults} equityDetails={equityDetails} />);

    // 0.15 -> "15%" comes from the API response.
    expect(screen.getByText("15%")).toBeInTheDocument();
    // 0.44 -> "44%" would mean the frontend recomputed dilution locally.
    expect(screen.queryByText("44%")).not.toBeInTheDocument();
  });

  it("keeps the dilution card consistent with the payout the backend returned", () => {
    // The payout figure and the dilution figure must come from the same
    // calculation, so a differing set of form rounds must not move the card.
    const untouchedByForm: RSUForm = {
      ...equityDetails,
      dilution_rounds: equityDetails.dilution_rounds.map((r) => ({ ...r, dilution_pct: 5 })),
    };

    render(<ScenarioResults results={apiResults} equityDetails={untouchedByForm} />);

    expect(screen.getByText("15%")).toBeInTheDocument();
  });
});
