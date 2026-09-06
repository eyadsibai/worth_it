/**
 * Tests for WaterfallAnalysis request construction
 * Following TDD - tests written first
 *
 * The waterfall endpoint rejects a preference tier whose holders are unknown, so
 * the auto-generated tiers must carry real stakeholder ids, must order rounds
 * even when their dates are missing, and must sweep a valuation range that is
 * anchored on the scenario's own exit assumption.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WaterfallAnalysis } from "@/components/cap-table/waterfall-analysis";
import type { CapTable, PreferenceTier, PricedRound, WaterfallRequest } from "@/lib/schemas";
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
/**
 * The API rejects an over-long exit_valuations list with a 400 - it does not clip
 * it - so the cap is a contract, not a hint. Read it out of the Pydantic model
 * rather than copying the number here: a duplicated literal stays green while the
 * backend tightens the bound underneath it, and the waterfall tab 400s in prod.
 */
const BACKEND_MODELS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../backend/src/worth_it/models.py"
);

function backendLimit(name: string): number {
  // Tolerates a type annotation (`MAX_EXIT_VALUATIONS: Final[int] = 100`) so a
  // typing pass on the backend does not read as a moved contract.
  const declaration = new RegExp(`^${name}(?::[^=]+)?\\s*=\\s*([0-9_]+)`, "m").exec(
    readFileSync(BACKEND_MODELS, "utf8")
  );
  if (!declaration) {
    throw new Error(`${name} is no longer declared in ${BACKEND_MODELS}`);
  }
  return Number(declaration[1].replace(/_/g, ""));
}

const MAX_EXIT_VALUATIONS = backendLimit("MAX_EXIT_VALUATIONS");

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

/** Every suite here inspects the request, so every suite needs the same idle mutation. */
function stubWaterfallMutation() {
  mutate.mockClear();
  vi.mocked(apiClient.useCalculateWaterfall).mockReturnValue({
    mutate,
    data: undefined,
    isPending: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof apiClient.useCalculateWaterfall>);
}

describe("WaterfallAnalysis request construction", () => {
  beforeEach(stubWaterfallMutation);

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
  beforeEach(stubWaterfallMutation);

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

describe("WaterfallAnalysis tiers referencing deleted stakeholders", () => {
  beforeEach(stubWaterfallMutation);

  /** A tier still naming a holder the user has since deleted from the cap table. */
  const staleTier: PreferenceTier = {
    id: "tier-stale",
    name: "Series Seed",
    seniority: 1,
    investment_amount: 2_000_000,
    liquidation_multiplier: 1,
    participating: false,
    stakeholder_ids: ["deleted-investor"],
  };

  const liveTier: PreferenceTier = {
    id: "tier-live",
    name: "Series A",
    seniority: 2,
    investment_amount: 5_000_000,
    liquidation_multiplier: 1,
    participating: false,
    stakeholder_ids: ["investor-a"],
  };

  it("never sends a stakeholder id the cap table does not contain", () => {
    // The engine raises "Stakeholder not found" and the API turns that into a 400,
    // so one deleted holder takes down the whole waterfall view, not just its tier.
    render(<WaterfallAnalysis capTable={mockCapTable} preferenceTiers={[staleTier, liveTier]} />, {
      wrapper: createWrapper(),
    });

    const known = new Set(mockCapTable.stakeholders.map((s) => s.id));
    for (const tier of lastRequest().preference_tiers) {
      for (const id of tier.stakeholder_ids) {
        expect(known).toContain(id);
      }
    }
  });

  it("keeps the tiers that still have live holders", () => {
    render(<WaterfallAnalysis capTable={mockCapTable} preferenceTiers={[staleTier, liveTier]} />, {
      wrapper: createWrapper(),
    });

    expect(lastRequest().preference_tiers.map((t) => t.name)).toEqual(["Series A"]);
  });

  it("tells the user the stale tier was left out instead of dropping it silently", () => {
    render(<WaterfallAnalysis capTable={mockCapTable} preferenceTiers={[staleTier]} />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByRole("status")).toHaveTextContent(/Series Seed/);
  });

  it("shows the editor the same holders the calculation uses", () => {
    // The warning card says the tier has no holders. An editor still counting the
    // deleted one contradicts it, and "Unknown stakeholder" is not something the
    // user can act on.
    render(<WaterfallAnalysis capTable={mockCapTable} preferenceTiers={[staleTier]} />, {
      wrapper: createWrapper(),
    });

    expect(
      screen.getByRole("button", { name: /Holders \(0\)\s*for Series Seed/i })
    ).toBeInTheDocument();
    expect(screen.queryByText(/Unknown stakeholder/i)).not.toBeInTheDocument();
  });
});

describe("WaterfallAnalysis rounds without a usable name", () => {
  beforeEach(stubWaterfallMutation);

  it("does not let a blank round name claim every preferred stakeholder", () => {
    render(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={[
          pricedRound({ id: "r1", round_name: "Series A", lead_investor: "Acme Ventures" }),
          // Declared last, so it is the most senior tier and picks its holders first.
          // `"   ".includes("")` is true for every name, so an unguarded fallback
          // hands it the whole preferred class and starves every later tier.
          pricedRound({ id: "r2", round_name: "   " }),
        ]}
      />,
      { wrapper: createWrapper() }
    );

    const tiers = lastRequest().preference_tiers;
    expect(tiers.find((t) => t.name === "Series A")?.stakeholder_ids).toEqual(["investor-a"]);
    expect(tiers.map((t) => t.name)).toEqual(["Series A"]);
  });
});

describe("WaterfallAnalysis preference tier persistence", () => {
  beforeEach(stubWaterfallMutation);

  it("reports tier edits to the caller so they survive a remount", async () => {
    // Radix unmounts a non-selected TabsContent, so state held only in this
    // component is destroyed by switching tabs and a Save persists the stale stack.
    const onPreferenceTiersChange = vi.fn();
    const user = userEvent.setup();

    render(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={[
          pricedRound({ id: "r1", round_name: "Series A", lead_investor: "Acme Ventures" }),
        ]}
        onPreferenceTiersChange={onPreferenceTiersChange}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole("button", { name: /Remove Series A/i }));

    expect(onPreferenceTiersChange).toHaveBeenCalled();
    expect(onPreferenceTiersChange.mock.calls.at(-1)?.[0]).toEqual([]);
  });

  it("publishes the stack it inferred so a save cannot persist an empty one", async () => {
    // Inference is an edit to the stack, not a rendering detail. If the owner
    // never hears about it, Save writes an empty preference stack while this
    // panel shows - and prices - a full one.
    const onPreferenceTiersChange = vi.fn();

    render(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={[
          pricedRound({ id: "r1", round_name: "Series A", lead_investor: "Acme Ventures" }),
          pricedRound({ id: "r2", round_name: "Series B", lead_investor: "Beta Capital" }),
        ]}
        preferenceTiers={[]}
        onPreferenceTiersChange={onPreferenceTiersChange}
      />,
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(onPreferenceTiersChange).toHaveBeenCalled());
    const published = onPreferenceTiersChange.mock.calls.at(-1)?.[0] as PreferenceTier[];
    expect(published.map((t) => t.name)).toEqual(["Series B", "Series A"]);
    // What the owner persists is exactly what the panel priced.
    expect(published).toEqual(lastRequest().preference_tiers);
  });

  it("infers a stack for priced rounds that arrive after mount", async () => {
    const onPreferenceTiersChange = vi.fn();
    const round = pricedRound({ id: "r1", round_name: "Series A", lead_investor: "Acme Ventures" });

    const { rerender } = render(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={[]}
        preferenceTiers={[]}
        onPreferenceTiersChange={onPreferenceTiersChange}
      />,
      { wrapper: createWrapper() }
    );

    expect(lastRequest().preference_tiers).toEqual([]);

    rerender(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={[round]}
        preferenceTiers={[]}
        onPreferenceTiersChange={onPreferenceTiersChange}
      />
    );

    await waitFor(() =>
      expect(lastRequest().preference_tiers.map((t) => t.name)).toEqual(["Series A"])
    );
    expect(onPreferenceTiersChange.mock.calls.at(-1)?.[0]).toEqual(lastRequest().preference_tiers);
  });

  it("adopts an empty stack from the caller instead of keeping the one it had", async () => {
    // Clearing the stack is a decision the owner is allowed to make. Only an
    // absent prop means "uncontrolled - guess for me".
    const seededTier: PreferenceTier = {
      id: "tier-seeded",
      name: "Series A",
      seniority: 1,
      investment_amount: 5_000_000,
      liquidation_multiplier: 1,
      participating: false,
      stakeholder_ids: ["investor-a"],
    };

    const { rerender } = render(
      <WaterfallAnalysis capTable={mockCapTable} preferenceTiers={[seededTier]} />,
      { wrapper: createWrapper() }
    );

    expect(lastRequest().preference_tiers.map((t) => t.name)).toEqual(["Series A"]);

    rerender(<WaterfallAnalysis capTable={mockCapTable} preferenceTiers={[]} />);

    await waitFor(() => expect(lastRequest().preference_tiers).toEqual([]));
    expect(screen.queryByText(/Preference Stack \(/i)).not.toBeInTheDocument();
  });

  it("does not resurrect a stack the user emptied", async () => {
    // The user deleting the last tier and inference filling it straight back in
    // would make the tier undeletable.
    const onPreferenceTiersChange = vi.fn();
    const user = userEvent.setup();
    const rounds = [
      pricedRound({ id: "r1", round_name: "Series A", lead_investor: "Acme Ventures" }),
    ];

    const { rerender } = render(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={rounds}
        preferenceTiers={[]}
        onPreferenceTiersChange={onPreferenceTiersChange}
      />,
      { wrapper: createWrapper() }
    );

    await user.click(screen.getByRole("button", { name: /Remove Series A/i }));
    rerender(
      <WaterfallAnalysis
        capTable={mockCapTable}
        pricedRounds={rounds}
        preferenceTiers={[]}
        onPreferenceTiersChange={onPreferenceTiersChange}
      />
    );

    await waitFor(() => expect(lastRequest().preference_tiers).toEqual([]));
    expect(screen.queryByText(/Preference Stack \(/i)).not.toBeInTheDocument();
  });
});
