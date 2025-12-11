/**
 * Tests for cap table export functions
 * Following TDD - tests written first
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CapTable, FundingInstrument, SAFE, ConvertibleNote, PricedRound, WaterfallDistribution } from "@/lib/schemas";

// Mock DOM APIs
const mockLink = {
  href: "",
  download: "",
  click: vi.fn(),
};

const mockAppendChild = vi.fn();
const mockRemoveChild = vi.fn();
const mockCreateObjectURL = vi.fn(() => "blob:test-url");
const mockRevokeObjectURL = vi.fn();

beforeEach(() => {
  vi.spyOn(document, "createElement").mockReturnValue(mockLink as unknown as HTMLElement);
  vi.spyOn(document.body, "appendChild").mockImplementation(mockAppendChild);
  vi.spyOn(document.body, "removeChild").mockImplementation(mockRemoveChild);
  vi.spyOn(URL, "createObjectURL").mockImplementation(mockCreateObjectURL);
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(mockRevokeObjectURL);

  mockLink.href = "";
  mockLink.download = "";
  mockLink.click.mockClear();
  mockAppendChild.mockClear();
  mockRemoveChild.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Test data
const mockCapTable: CapTable = {
  stakeholders: [
    {
      id: "1",
      name: "Alice Founder",
      type: "founder",
      shares: 4000000,
      ownership_pct: 40,
      share_class: "common",
      vesting: {
        total_shares: 4000000,
        vesting_months: 48,
        cliff_months: 12,
        vested_shares: 1000000,
      },
    },
    {
      id: "2",
      name: "Bob Investor",
      type: "investor",
      shares: 3000000,
      ownership_pct: 30,
      share_class: "preferred",
    },
  ],
  total_shares: 10000000,
  option_pool_pct: 10,
};

const mockSAFE: SAFE = {
  id: "safe1",
  type: "SAFE",
  investor_name: "Y Combinator",
  investment_amount: 500000,
  valuation_cap: 5000000,
  discount_pct: 20,
  pro_rata_rights: true,
  mfn_clause: true,
  status: "outstanding",
  date: "2024-01-15",
};

const mockNote: ConvertibleNote = {
  id: "note1",
  type: "CONVERTIBLE_NOTE",
  investor_name: "Angel Investor",
  principal_amount: 250000,
  interest_rate: 5,
  interest_type: "simple",
  valuation_cap: 10000000,
  discount_pct: 15,
  maturity_months: 24,
  status: "outstanding",
  date: "2024-02-01",
};

const mockPricedRound: PricedRound = {
  id: "round1",
  type: "PRICED_ROUND",
  round_name: "Series A",
  lead_investor: "Sequoia Capital",
  pre_money_valuation: 20000000,
  amount_raised: 5000000,
  price_per_share: 2.5,
  liquidation_multiplier: 1,
  participating: false,
  new_shares_issued: 2000000,
  date: "2024-06-01",
};

const mockWaterfall: WaterfallDistribution = {
  exit_valuation: 50000000,
  waterfall_steps: [
    {
      step_number: 1,
      description: "Liquidation Preference",
      amount: 5000000,
      recipients: ["Series A"],
      remaining_proceeds: 45000000,
    },
  ],
  stakeholder_payouts: [
    {
      stakeholder_id: "1",
      name: "Alice Founder",
      payout_amount: 20000000,
      payout_pct: 40,
      roi: undefined,
    },
    {
      stakeholder_id: "2",
      name: "Bob Investor",
      payout_amount: 15000000,
      payout_pct: 30,
      investment_amount: 5000000,
      roi: 3.0,
    },
  ],
  common_pct: 40,
  preferred_pct: 60,
};

describe("cap table export functions", () => {
  describe("exportCapTableAsCSV", () => {
    it("exports cap table with correct filename", async () => {
      const { exportCapTableAsCSV } = await import("@/lib/export-utils");

      exportCapTableAsCSV(mockCapTable, "test-cap-table");

      expect(mockLink.download).toBe("test-cap-table.csv");
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });

    it("handles empty cap table", async () => {
      const { exportCapTableAsCSV } = await import("@/lib/export-utils");

      const emptyCapTable: CapTable = {
        stakeholders: [],
        total_shares: 10000000,
        option_pool_pct: 10,
      };

      expect(() => exportCapTableAsCSV(emptyCapTable, "empty")).not.toThrow();
    });

    it("handles stakeholders without vesting", async () => {
      const { exportCapTableAsCSV } = await import("@/lib/export-utils");

      const capTableNoVesting: CapTable = {
        stakeholders: [
          {
            id: "1",
            name: "Test User",
            type: "founder",
            shares: 1000000,
            ownership_pct: 10,
            share_class: "common",
          },
        ],
        total_shares: 10000000,
        option_pool_pct: 10,
      };

      expect(() => exportCapTableAsCSV(capTableNoVesting, "no-vesting")).not.toThrow();
    });
  });

  describe("exportFundingHistoryAsCSV", () => {
    it("exports SAFE instruments", async () => {
      const { exportFundingHistoryAsCSV } = await import("@/lib/export-utils");

      exportFundingHistoryAsCSV([mockSAFE], "test-funding");

      expect(mockLink.download).toBe("test-funding.csv");
      expect(mockLink.click).toHaveBeenCalled();
    });

    it("exports Convertible Notes", async () => {
      const { exportFundingHistoryAsCSV } = await import("@/lib/export-utils");

      exportFundingHistoryAsCSV([mockNote], "test-notes");

      expect(mockLink.download).toBe("test-notes.csv");
      expect(mockLink.click).toHaveBeenCalled();
    });

    it("exports Priced Rounds", async () => {
      const { exportFundingHistoryAsCSV } = await import("@/lib/export-utils");

      exportFundingHistoryAsCSV([mockPricedRound], "test-rounds");

      expect(mockLink.download).toBe("test-rounds.csv");
      expect(mockLink.click).toHaveBeenCalled();
    });

    it("exports mixed instruments", async () => {
      const { exportFundingHistoryAsCSV } = await import("@/lib/export-utils");

      const mixedInstruments: FundingInstrument[] = [mockSAFE, mockNote, mockPricedRound];

      exportFundingHistoryAsCSV(mixedInstruments, "test-mixed");

      expect(mockLink.download).toBe("test-mixed.csv");
      expect(mockLink.click).toHaveBeenCalled();
    });

    it("handles empty instruments array", async () => {
      const { exportFundingHistoryAsCSV } = await import("@/lib/export-utils");

      expect(() => exportFundingHistoryAsCSV([], "empty")).not.toThrow();
    });
  });

  describe("exportExitScenariosAsCSV", () => {
    it("exports exit scenarios with correct filename", async () => {
      const { exportExitScenariosAsCSV } = await import("@/lib/export-utils");

      const valuations = [10000000, 50000000, 100000000];

      exportExitScenariosAsCSV(mockCapTable, valuations, "test-exit");

      expect(mockLink.download).toBe("test-exit.csv");
      expect(mockLink.click).toHaveBeenCalled();
    });

    it("handles empty valuations array", async () => {
      const { exportExitScenariosAsCSV } = await import("@/lib/export-utils");

      expect(() => exportExitScenariosAsCSV(mockCapTable, [], "empty")).not.toThrow();
    });

    it("handles empty cap table", async () => {
      const { exportExitScenariosAsCSV } = await import("@/lib/export-utils");

      const emptyCapTable: CapTable = {
        stakeholders: [],
        total_shares: 10000000,
        option_pool_pct: 10,
      };

      expect(() => exportExitScenariosAsCSV(emptyCapTable, [10000000], "empty-cap")).not.toThrow();
    });
  });

  describe("exportCapTableAsPDF", () => {
    it("generates PDF without throwing", async () => {
      const { exportCapTableAsPDF } = await import("@/lib/export-utils");

      expect(() =>
        exportCapTableAsPDF(mockCapTable, [mockSAFE, mockNote, mockPricedRound], mockWaterfall)
      ).not.toThrow();
    });

    it("handles cap table without waterfall", async () => {
      const { exportCapTableAsPDF } = await import("@/lib/export-utils");

      expect(() =>
        exportCapTableAsPDF(mockCapTable, [mockSAFE], undefined)
      ).not.toThrow();
    });

    it("handles empty instruments", async () => {
      const { exportCapTableAsPDF } = await import("@/lib/export-utils");

      expect(() =>
        exportCapTableAsPDF(mockCapTable, [], undefined)
      ).not.toThrow();
    });
  });
});
