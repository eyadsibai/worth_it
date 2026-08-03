/**
 * Tests for CapTableManager.
 *
 * Two contracts are asserted here:
 *
 * 1. Share derivation. The waterfall engine distributes proceeds strictly by
 *    `shares / total_shares`, so a stakeholder added through the form must
 *    carry a share count derived from its ownership percentage. A stakeholder
 *    with `shares: 0` is paid nothing no matter what its ownership says.
 *
 * 2. Waterfall anchoring. The exit valuation the scenario is built around must
 *    reach WaterfallAnalysis, otherwise the chart silently sweeps a default
 *    range that has nothing to do with the user's scenario.
 */
import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CapTableManager } from "@/components/cap-table/cap-table-manager";
import type { CapTable, FundingInstrument, PricedRound, Stakeholder } from "@/lib/schemas";

const captured = vi.hoisted(() => ({
  waterfallProps: null as { exitValuation?: number } | null,
}));

vi.mock("@/components/cap-table/waterfall-analysis", () => ({
  WaterfallAnalysis: (props: { exitValuation?: number }) => {
    captured.waterfallProps = props;
    return <div data-testid="waterfall-analysis" />;
  },
}));

vi.mock("@/components/cap-table/stakeholder-form", () => ({
  StakeholderForm: ({ onSubmit }: { onSubmit: (data: Record<string, unknown>) => void }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            name: "Dana Founder",
            type: "founder",
            ownership_pct: 40,
            share_class: "common",
            has_vesting: false,
            vesting_months: 48,
            cliff_months: 12,
          })
        }
      >
        add-dana
      </button>
      <button
        type="button"
        onClick={() =>
          onSubmit({
            name: "Evan Employee",
            type: "employee",
            ownership_pct: 2.5,
            share_class: "common",
            has_vesting: true,
            vesting_months: 48,
            cliff_months: 12,
          })
        }
      >
        add-evan
      </button>
    </div>
  ),
}));

vi.mock("@/components/cap-table/ownership-chart", () => ({
  OwnershipChart: () => <div data-testid="ownership-chart" />,
}));

vi.mock("@/components/cap-table/exit-calculator", () => ({
  ExitCalculator: () => <div data-testid="exit-calculator" />,
}));

vi.mock("@/components/cap-table/funding-rounds-manager", () => ({
  FundingRoundsManager: () => <div data-testid="funding-rounds-manager" />,
}));

vi.mock("@/components/cap-table/scenario-manager", () => ({
  ScenarioManager: () => <div data-testid="scenario-manager" />,
}));

vi.mock("@/components/cap-table/export-menu", () => ({
  ExportMenu: () => <div data-testid="export-menu" />,
}));

vi.mock("@/components/cap-table/timeline", () => ({
  FounderTimeline: () => <div data-testid="founder-timeline" />,
}));

vi.mock("@/components/cap-table/history", () => ({
  HistoryTriggerButton: () => <button type="button">history</button>,
  VersionHistoryPanel: () => <div data-testid="version-history-panel" />,
  useVersionHistory: () => ({ addVersion: vi.fn(), loadVersionsFromStorage: vi.fn() }),
}));

vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    useConvertInstruments: () => ({ mutate: vi.fn() }),
  };
});

const TOTAL_SHARES = 10_000_000;
const PERCENT = 100;

const seedFounder: Stakeholder = {
  id: "seed-founder",
  name: "Alice Founder",
  type: "founder",
  shares: 5_000_000,
  ownership_pct: 50,
  share_class: "common",
};

function baseCapTable(): CapTable {
  return {
    stakeholders: [seedFounder],
    total_shares: TOTAL_SHARES,
    option_pool_pct: 10,
  };
}

function pricedRound(overrides: Partial<PricedRound> = {}): PricedRound {
  return {
    id: "round-1",
    type: "PRICED_ROUND",
    round_name: "Series A",
    pre_money_valuation: 200_000_000,
    amount_raised: 50_000_000,
    price_per_share: 2.5,
    liquidation_multiplier: 1,
    participating: false,
    new_shares_issued: 2_000_000,
    ...overrides,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

interface RenderOptions {
  capTable?: CapTable;
  instruments?: FundingInstrument[];
  exitValuation?: number;
}

function renderManager({ capTable, instruments = [], exitValuation }: RenderOptions = {}) {
  const onCapTableChange = vi.fn();
  render(
    <CapTableManager
      capTable={capTable ?? baseCapTable()}
      onCapTableChange={onCapTableChange}
      instruments={instruments}
      onInstrumentsChange={vi.fn()}
      preferenceTiers={[]}
      onPreferenceTiersChange={vi.fn()}
      exitValuation={exitValuation}
    />,
    { wrapper: createWrapper() }
  );
  return { onCapTableChange };
}

function lastCapTable(onCapTableChange: ReturnType<typeof vi.fn>): CapTable {
  const calls = onCapTableChange.mock.calls;
  return calls[calls.length - 1][0] as CapTable;
}

describe("CapTableManager share derivation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    captured.waterfallProps = null;
  });

  it("derives shares from the ownership percentage of a newly added stakeholder", () => {
    const { onCapTableChange } = renderManager();

    fireEvent.click(screen.getByRole("button", { name: "add-dana" }));

    const added = lastCapTable(onCapTableChange).stakeholders.find(
      (s) => s.name === "Dana Founder"
    );
    expect(added).toBeDefined();
    expect(added?.shares).toBe(4_000_000);
  });

  it("derives vesting share totals from the ownership percentage too", () => {
    const { onCapTableChange } = renderManager();

    fireEvent.click(screen.getByRole("button", { name: "add-evan" }));

    const added = lastCapTable(onCapTableChange).stakeholders.find(
      (s) => s.name === "Evan Employee"
    );
    expect(added?.shares).toBe(250_000);
    expect(added?.vesting?.total_shares).toBe(250_000);
    expect(added?.vesting?.vested_shares).toBe(0);
  });

  it("produces non-zero pro-rata payouts for a hand-built cap table", () => {
    const { onCapTableChange } = renderManager();

    fireEvent.click(screen.getByRole("button", { name: "add-dana" }));
    const afterDana = lastCapTable(onCapTableChange);

    // Mirror the backend engine: payout = shares / total_shares * exit_valuation
    const exit = 100_000_000;
    const payouts = afterDana.stakeholders.map((s) => ({
      name: s.name,
      payout: (s.shares / afterDana.total_shares) * exit,
    }));

    for (const row of payouts) {
      expect(row.payout).toBeGreaterThan(0);
    }
    expect(payouts.find((p) => p.name === "Dana Founder")?.payout).toBeCloseTo(40_000_000, 6);
    expect(payouts.find((p) => p.name === "Alice Founder")?.payout).toBeCloseTo(50_000_000, 6);
  });

  it("keeps derived shares consistent with the declared ownership percentage", () => {
    const { onCapTableChange } = renderManager();

    fireEvent.click(screen.getByRole("button", { name: "add-dana" }));
    const updated = lastCapTable(onCapTableChange);

    for (const s of updated.stakeholders) {
      expect((s.shares / updated.total_shares) * PERCENT).toBeCloseTo(s.ownership_pct, 6);
    }
  });
});

describe("CapTableManager waterfall anchoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    captured.waterfallProps = null;
  });

  // Radix tabs select on mousedown, not click, so a bare fireEvent.click never
  // activates the panel.
  function openWaterfallTab() {
    const tab = screen.getByRole("tab", { name: /waterfall/i });
    fireEvent.mouseDown(tab);
    fireEvent.click(tab);
  }

  it("passes the supplied exit valuation through to WaterfallAnalysis", () => {
    renderManager({ exitValuation: 250_000_000 });

    openWaterfallTab();

    expect(captured.waterfallProps?.exitValuation).toBe(250_000_000);
  });

  it("anchors on the latest priced round post-money when no exit valuation is supplied", () => {
    renderManager({
      instruments: [pricedRound({ post_money_valuation: 250_000_000 })],
    });

    openWaterfallTab();

    expect(captured.waterfallProps?.exitValuation).toBe(250_000_000);
  });

  it("falls back to pre-money plus amount raised when post-money is absent", () => {
    renderManager({
      instruments: [pricedRound({ pre_money_valuation: 30_000_000, amount_raised: 10_000_000 })],
    });

    openWaterfallTab();

    expect(captured.waterfallProps?.exitValuation).toBe(40_000_000);
  });
});
