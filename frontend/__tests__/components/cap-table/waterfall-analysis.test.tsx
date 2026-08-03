/**
 * Tests for WaterfallAnalysis request construction
 * Following TDD - tests written first
 *
 * The waterfall endpoint rejects a preference tier whose holders are unknown, so
 * the auto-generated tiers must carry real stakeholder ids, must order rounds
 * even when their dates are missing, and must sweep a valuation range that is
 * anchored on the scenario's own exit assumption.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WaterfallAnalysis } from "@/components/cap-table/waterfall-analysis";
import type { CapTable, PricedRound, WaterfallRequest } from "@/lib/schemas";
import * as apiClient from "@/lib/api-client";

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof apiClient>("@/lib/api-client");
  return {
    ...actual,
    useCalculateWaterfall: vi.fn(),
  };
});

const mutate = vi.fn();

/** The valuation span master could always model; narrowing it is a capability regression. */
const LEGACY_MIN_VALUATION = 1_000_000;
const LEGACY_MAX_VALUATION = 500_000_000;
/** Fallback anchor when the scenario carries no exit assumption. */
const DEFAULT_EXIT_VALUATION = 50_000_000;
/** Mirrors MAX_EXIT_VALUATIONS in backend/src/worth_it/models.py */
const MAX_EXIT_VALUATIONS = 100;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

const mockCapTable: CapTable = {
  stakeholders: [
    {
      id: "founder-1",
      name: "Alice Founder",
      type: "founder",
      shares: 6_000_000,
      ownership_pct: 60,
      share_class: "common",
    },
    {
      id: "investor-a",
      name: "Acme Ventures",
      type: "investor",
      shares: 2_000_000,
      ownership_pct: 20,
      share_class: "preferred",
    },
    {
      id: "investor-b",
      name: "Beta Capital",
      type: "investor",
      shares: 2_000_000,
      ownership_pct: 20,
      share_class: "preferred",
    },
  ],
  total_shares: 10_000_000,
  option_pool_pct: 10,
};

function pricedRound(overrides: Partial<PricedRound> & { id: string }): PricedRound {
  return {
    type: "PRICED_ROUND",
    round_name: "Series A",
    pre_money_valuation: 20_000_000,
    amount_raised: 5_000_000,
    price_per_share: 2.5,
    liquidation_multiplier: 1,
    participating: false,
    new_shares_issued: 2_000_000,
    ...overrides,
  };
}

function lastRequest(): WaterfallRequest {
  return mutate.mock.calls[mutate.mock.calls.length - 1][0] as WaterfallRequest;
}

describe("WaterfallAnalysis request construction", () => {
  beforeEach(() => {
    mutate.mockClear();
    vi.mocked(apiClient.useCalculateWaterfall).mockReturnValue({
      mutate,
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiClient.useCalculateWaterfall>);
  });

  it("attaches the lead investor of each priced round to its preference tier", () => {
    render(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={[
          pricedRound({ id: "r1", round_name: "Series A", lead_investor: "Acme Ventures" }),
          pricedRound({ id: "r2", round_name: "Series B", lead_investor: "Beta Capital" }),
        ]}
      />,
      { wrapper: createWrapper() }
    );

    const tiers = lastRequest().preference_tiers;
    expect(tiers).toHaveLength(2);
    for (const tier of tiers) {
      expect(tier.stakeholder_ids.length).toBeGreaterThan(0);
    }
    expect(tiers.find((t) => t.name === "Series A")?.stakeholder_ids).toEqual(["investor-a"]);
    expect(tiers.find((t) => t.name === "Series B")?.stakeholder_ids).toEqual(["investor-b"]);
  });

  it("never assigns the same stakeholder to two tiers", () => {
    render(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={[
          pricedRound({ id: "r1", round_name: "Series A", lead_investor: "Acme Ventures" }),
          pricedRound({ id: "r2", round_name: "Series A-1", lead_investor: "Acme Ventures" }),
        ]}
      />,
      { wrapper: createWrapper() }
    );

    const assigned = lastRequest().preference_tiers.flatMap((t) => t.stakeholder_ids);
    expect(new Set(assigned).size).toBe(assigned.length);
  });

  it("ranks the most recently declared round as most senior when dates are missing", () => {
    render(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={[
          pricedRound({ id: "r1", round_name: "Series A", lead_investor: "Acme Ventures" }),
          pricedRound({ id: "r2", round_name: "Series B", lead_investor: "Beta Capital" }),
        ]}
      />,
      { wrapper: createWrapper() }
    );

    const tiers = lastRequest().preference_tiers;
    expect(tiers.find((t) => t.name === "Series B")?.seniority).toBe(1);
    expect(tiers.find((t) => t.name === "Series A")?.seniority).toBe(2);
  });

  it("still ranks by date when dates are present", () => {
    render(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={[
          pricedRound({
            id: "r1",
            round_name: "Series B",
            date: "2024-01-01",
            lead_investor: "Beta Capital",
          }),
          pricedRound({
            id: "r2",
            round_name: "Series A",
            date: "2021-01-01",
            lead_investor: "Acme Ventures",
          }),
        ]}
      />,
      { wrapper: createWrapper() }
    );

    const tiers = lastRequest().preference_tiers;
    expect(tiers.find((t) => t.name === "Series B")?.seniority).toBe(1);
    expect(tiers.find((t) => t.name === "Series A")?.seniority).toBe(2);
  });

  it("keeps the whole $1M-$500M span reachable while anchoring on the scenario exit", () => {
    render(<WaterfallAnalysis capTable={mockCapTable} exitValuation={100_000_000} />, {
      wrapper: createWrapper(),
    });

    const valuations = lastRequest().exit_valuations;
    expect(Math.min(...valuations)).toBeLessThanOrEqual(LEGACY_MIN_VALUATION);
    expect(Math.max(...valuations)).toBeGreaterThanOrEqual(LEGACY_MAX_VALUATION);
    // The scenario's own exit is sampled exactly, not merely bracketed
    expect(valuations).toContain(100_000_000);
  });

  it("reaches beyond $500M when the scenario exit is larger", () => {
    render(<WaterfallAnalysis capTable={mockCapTable} exitValuation={1_000_000_000} />, {
      wrapper: createWrapper(),
    });

    const valuations = lastRequest().exit_valuations;
    expect(Math.min(...valuations)).toBeLessThanOrEqual(LEGACY_MIN_VALUATION);
    expect(Math.max(...valuations)).toBeGreaterThanOrEqual(2_000_000_000);
    expect(valuations).toContain(1_000_000_000);
  });

  it("still reaches a $500M exit when the scenario exit is a small acquihire", () => {
    render(<WaterfallAnalysis capTable={mockCapTable} exitValuation={5_000_000} />, {
      wrapper: createWrapper(),
    });

    const valuations = lastRequest().exit_valuations;
    expect(Math.min(...valuations)).toBeLessThanOrEqual(1_000_000);
    expect(Math.max(...valuations)).toBeGreaterThanOrEqual(LEGACY_MAX_VALUATION);
    expect(valuations).toContain(5_000_000);
  });

  it("falls back to the default exit valuation when the scenario has none", () => {
    render(<WaterfallAnalysis capTable={mockCapTable} exitValuation={0} />, {
      wrapper: createWrapper(),
    });

    const valuations = lastRequest().exit_valuations;
    expect(Math.min(...valuations)).toBeLessThanOrEqual(LEGACY_MIN_VALUATION);
    expect(Math.max(...valuations)).toBeGreaterThanOrEqual(LEGACY_MAX_VALUATION);
    expect(valuations).toContain(DEFAULT_EXIT_VALUATION);
  });

  it("never sends more exit valuations than the API accepts", () => {
    render(<WaterfallAnalysis capTable={mockCapTable} exitValuation={1_000_000_000} />, {
      wrapper: createWrapper(),
    });

    const valuations = lastRequest().exit_valuations;
    expect(valuations.length).toBeGreaterThan(0);
    expect(valuations.length).toBeLessThanOrEqual(MAX_EXIT_VALUATIONS);
    // Strictly ascending so the chart's x-axis reads left-to-right
    for (let i = 1; i < valuations.length; i++) {
      expect(valuations[i]).toBeGreaterThan(valuations[i - 1]);
    }
  });
});

describe("WaterfallAnalysis unmatched preference tiers", () => {
  beforeEach(() => {
    mutate.mockClear();
    vi.mocked(apiClient.useCalculateWaterfall).mockReturnValue({
      mutate,
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof apiClient.useCalculateWaterfall>);
  });

  const unmatchableRound = pricedRound({
    id: "r-unmatched",
    round_name: "Series C",
    lead_investor: "Nobody In This Cap Table",
  });

  it("omits tiers that match no stakeholder from the waterfall request", () => {
    render(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={[
          pricedRound({ id: "r1", round_name: "Series A", lead_investor: "Acme Ventures" }),
          unmatchableRound,
        ]}
      />,
      { wrapper: createWrapper() }
    );

    const tiers = lastRequest().preference_tiers;
    expect(tiers.map((t) => t.name)).toEqual(["Series A"]);
    for (const tier of tiers) {
      expect(tier.stakeholder_ids.length).toBeGreaterThan(0);
    }
  });

  it("sends no tiers at all rather than a tier that claims nobody", () => {
    render(<WaterfallAnalysis capTable={mockCapTable} pricedRounds={[unmatchableRound]} />, {
      wrapper: createWrapper(),
    });

    expect(lastRequest().preference_tiers).toEqual([]);
  });

  it("tells the user, by name, which round has no holders assigned", () => {
    render(<WaterfallAnalysis capTable={mockCapTable} pricedRounds={[unmatchableRound]} />, {
      wrapper: createWrapper(),
    });

    const warning = screen.getByRole("status");
    expect(warning).toHaveTextContent(/Series C/);
    expect(warning).toHaveTextContent(/holder/i);
  });

  it("stays quiet when every tier has holders", () => {
    render(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={[
          pricedRound({ id: "r1", round_name: "Series A", lead_investor: "Acme Ventures" }),
        ]}
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
