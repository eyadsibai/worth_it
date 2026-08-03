/**
 * Pins the dilution-round wire format produced by useScenarioCalculation to the
 * backend contract (worth_it.types.DilutionRound): `dilution` as a 0-1 fraction.
 *
 * Pydantic validates `dilution_rounds` against that TypedDict and silently drops
 * unknown keys, so a field-name mismatch here does not raise -- it just makes the
 * backend calculate zero dilution.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useScenarioCalculation } from "@/lib/hooks/use-scenario-calculation";
import type { GlobalSettingsForm, CurrentJobForm, RSUForm } from "@/lib/schemas";

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    useMonthlyDataGridQuery: vi.fn(),
    useOpportunityCostQuery: vi.fn(),
    useStartupScenarioQuery: vi.fn(),
  };
});

import {
  useMonthlyDataGridQuery,
  useOpportunityCostQuery,
  useStartupScenarioQuery,
} from "@/lib/api-client";

const mockUseMonthlyDataGridQuery = useMonthlyDataGridQuery as ReturnType<typeof vi.fn>;
const mockUseOpportunityCostQuery = useOpportunityCostQuery as ReturnType<typeof vi.fn>;
const mockUseStartupScenarioQuery = useStartupScenarioQuery as ReturnType<typeof vi.fn>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function TestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const globalSettings: GlobalSettingsForm = { exit_year: 5 };

const currentJob: CurrentJobForm = {
  monthly_salary: 10000,
  annual_salary_growth_rate: 3,
  assumed_annual_roi: 7,
  investment_frequency: "Monthly",
};

const rsuWithRounds: RSUForm = {
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
      salary_change: 9500,
      enabled: true,
      status: "upcoming",
      dilution_method: "percentage",
    },
    {
      round_name: "Seed",
      round_type: "SAFE_NOTE",
      year: -1,
      dilution_pct: 10,
      pre_money_valuation: 4000000,
      amount_raised: 500000,
      salary_change: 0,
      enabled: false,
      status: "completed",
      dilution_method: "percentage",
    },
  ],
};

function renderWithRounds() {
  return renderHook(
    () => useScenarioCalculation({ globalSettings, currentJob, equityDetails: rsuWithRounds }),
    { wrapper: createWrapper() }
  );
}

describe("useScenarioCalculation dilution round wire format", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMonthlyDataGridQuery.mockReturnValue({
      data: { data: [] },
      isPending: false,
      isFetching: false,
      error: null,
    });
    mockUseOpportunityCostQuery.mockReturnValue({
      data: { data: [] },
      isPending: false,
      isFetching: false,
      error: null,
    });
    mockUseStartupScenarioQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      isFetching: false,
      error: null,
    });
  });

  it("sends `dilution` as a 0-1 fraction in the monthly data grid request", () => {
    renderWithRounds();

    const request = mockUseMonthlyDataGridQuery.mock.calls[0][0];
    expect(request.dilution_rounds).toHaveLength(1);

    const round = request.dilution_rounds[0];
    expect(round.dilution).toBeCloseTo(0.2);
    expect(round).not.toHaveProperty("dilution_pct");
  });

  it("sends `dilution` as a 0-1 fraction in the startup scenario request", () => {
    renderWithRounds();

    const request = mockUseStartupScenarioQuery.mock.calls[0][0];
    const rounds = request.startup_params.dilution_rounds;
    expect(rounds).toHaveLength(1);

    expect(rounds[0].dilution).toBeCloseTo(0.2);
    expect(rounds[0]).not.toHaveProperty("dilution_pct");
  });

  it("maps salary_change onto the backend's new_salary key", () => {
    renderWithRounds();

    const round = mockUseMonthlyDataGridQuery.mock.calls[0][0].dilution_rounds[0];
    expect(round.new_salary).toBe(9500);
    expect(round).not.toHaveProperty("salary_change");
  });

  it("passes through the round status and SAFE-note flag the backend branches on", () => {
    renderWithRounds();

    const round = mockUseMonthlyDataGridQuery.mock.calls[0][0].dilution_rounds[0];
    expect(round.year).toBe(1);
    expect(round.status).toBe("upcoming");
    expect(round.is_safe_note).toBe(false);
  });
});
