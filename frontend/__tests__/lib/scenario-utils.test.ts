/**
 * Tests for founder scenario utilities
 * Following TDD - these tests were written first
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { CapTable, FundingInstrument, PreferenceTier } from "@/lib/schemas";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

// Mock uuid
vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

// Test data
const mockCapTable: CapTable = {
  stakeholders: [
    {
      id: "s1",
      name: "Alice Founder",
      type: "founder",
      shares: 4000000,
      ownership_pct: 40,
      share_class: "common",
    },
    {
      id: "s2",
      name: "Bob Investor",
      type: "investor",
      shares: 2000000,
      ownership_pct: 20,
      share_class: "preferred",
    },
  ],
  total_shares: 10000000,
  option_pool_pct: 10,
};

const mockInstruments: FundingInstrument[] = [
  {
    id: "safe1",
    type: "SAFE",
    investor_name: "Y Combinator",
    investment_amount: 500000,
    valuation_cap: 5000000,
    pro_rata_rights: true,
    mfn_clause: false,
    status: "outstanding",
  },
];

const mockPreferenceTiers: PreferenceTier[] = [
  {
    id: "tier1",
    name: "Series A",
    seniority: 1,
    investment_amount: 2000000,
    liquidation_multiplier: 1,
    participating: false,
    stakeholder_ids: ["s2"],
  },
];

describe("scenario-utils", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("createFounderScenario", () => {
    it("creates a scenario with all required fields", async () => {
      const { createFounderScenario } = await import("@/lib/scenario-utils");

      const scenario = createFounderScenario(
        "Test Scenario",
        mockCapTable,
        mockInstruments,
        mockPreferenceTiers,
        "Test description"
      );

      expect(scenario.id).toBe("test-uuid-1234");
      expect(scenario.name).toBe("Test Scenario");
      expect(scenario.description).toBe("Test description");
      expect(scenario.capTable).toEqual(mockCapTable);
      expect(scenario.instruments).toEqual(mockInstruments);
      expect(scenario.preferenceTiers).toEqual(mockPreferenceTiers);
      expect(scenario.createdAt).toBeDefined();
      expect(scenario.updatedAt).toBeDefined();
    });

    it("creates a scenario without description", async () => {
      const { createFounderScenario } = await import("@/lib/scenario-utils");

      const scenario = createFounderScenario("No Description", mockCapTable, [], []);

      expect(scenario.description).toBeUndefined();
    });
  });

  describe("saveFounderScenario", () => {
    it("saves a new scenario to localStorage", async () => {
      const { createFounderScenario, saveFounderScenario, loadFounderScenarios } = await import(
        "@/lib/scenario-utils"
      );

      const scenario = createFounderScenario(
        "Test",
        mockCapTable,
        mockInstruments,
        mockPreferenceTiers
      );

      saveFounderScenario(scenario);

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const scenarios = loadFounderScenarios();
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe("Test");
    });

    it("updates existing scenario when ID matches", async () => {
      const { createFounderScenario, saveFounderScenario, loadFounderScenarios } = await import(
        "@/lib/scenario-utils"
      );

      const scenario = createFounderScenario(
        "Original",
        mockCapTable,
        mockInstruments,
        mockPreferenceTiers
      );

      saveFounderScenario(scenario);

      // Update the scenario
      const updatedScenario = { ...scenario, name: "Updated" };
      saveFounderScenario(updatedScenario);

      const scenarios = loadFounderScenarios();
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe("Updated");
    });
  });

  describe("loadFounderScenarios", () => {
    it("returns empty array when no scenarios exist", async () => {
      const { loadFounderScenarios } = await import("@/lib/scenario-utils");

      const scenarios = loadFounderScenarios();
      expect(scenarios).toEqual([]);
    });

    it("returns scenarios sorted by updatedAt descending", async () => {
      const { loadFounderScenarios } = await import("@/lib/scenario-utils");

      // Set up localStorage with multiple scenarios
      const oldDate = "2024-01-01T00:00:00.000Z";
      const newDate = "2024-12-01T00:00:00.000Z";

      localStorageMock.setItem(
        "worth_it_founder_scenarios",
        JSON.stringify([
          {
            id: "old",
            name: "Old",
            capTable: mockCapTable,
            instruments: [],
            preferenceTiers: [],
            createdAt: oldDate,
            updatedAt: oldDate,
          },
          {
            id: "new",
            name: "New",
            capTable: mockCapTable,
            instruments: [],
            preferenceTiers: [],
            createdAt: newDate,
            updatedAt: newDate,
          },
        ])
      );

      const scenarios = loadFounderScenarios();
      expect(scenarios[0].name).toBe("New");
      expect(scenarios[1].name).toBe("Old");
    });
  });

  describe("loadFounderScenarioById", () => {
    it("returns scenario when ID exists", async () => {
      const { createFounderScenario, saveFounderScenario, loadFounderScenarioById } = await import(
        "@/lib/scenario-utils"
      );

      const scenario = createFounderScenario(
        "Find Me",
        mockCapTable,
        mockInstruments,
        mockPreferenceTiers
      );
      saveFounderScenario(scenario);

      const found = loadFounderScenarioById(scenario.id);
      expect(found).not.toBeNull();
      expect(found?.name).toBe("Find Me");
    });

    it("returns null when ID does not exist", async () => {
      const { loadFounderScenarioById } = await import("@/lib/scenario-utils");

      const found = loadFounderScenarioById("nonexistent");
      expect(found).toBeNull();
    });
  });

  describe("deleteFounderScenario", () => {
    it("removes scenario from localStorage", async () => {
      const {
        createFounderScenario,
        saveFounderScenario,
        deleteFounderScenario,
        loadFounderScenarios,
      } = await import("@/lib/scenario-utils");

      const scenario = createFounderScenario(
        "Delete Me",
        mockCapTable,
        mockInstruments,
        mockPreferenceTiers
      );
      saveFounderScenario(scenario);

      expect(loadFounderScenarios()).toHaveLength(1);

      deleteFounderScenario(scenario.id);

      expect(loadFounderScenarios()).toHaveLength(0);
    });

    it("handles deletion of non-existent scenario gracefully", async () => {
      const { deleteFounderScenario } = await import("@/lib/scenario-utils");

      expect(() => deleteFounderScenario("nonexistent")).not.toThrow();
    });
  });

  describe("clearAllFounderScenarios", () => {
    it("removes all scenarios from localStorage", async () => {
      const {
        createFounderScenario,
        saveFounderScenario,
        clearAllFounderScenarios,
        loadFounderScenarios,
      } = await import("@/lib/scenario-utils");

      saveFounderScenario(createFounderScenario("S1", mockCapTable, [], []));
      saveFounderScenario(createFounderScenario("S2", mockCapTable, [], []));

      expect(loadFounderScenarios().length).toBeGreaterThan(0);

      clearAllFounderScenarios();

      expect(loadFounderScenarios()).toHaveLength(0);
    });
  });

  describe("getScenarioMetrics", () => {
    it("calculates correct metrics for a scenario", async () => {
      const { createFounderScenario, getScenarioMetrics } = await import("@/lib/scenario-utils");

      const scenario = createFounderScenario(
        "Metrics Test",
        mockCapTable,
        mockInstruments,
        mockPreferenceTiers
      );

      const metrics = getScenarioMetrics(scenario);

      expect(metrics.totalStakeholders).toBe(2);
      expect(metrics.totalShares).toBe(10000000);
      expect(metrics.optionPoolPct).toBe(10);
      expect(metrics.founderCount).toBe(1);
      expect(metrics.founderOwnership).toBe(40);
      expect(metrics.investorCount).toBe(1);
      expect(metrics.investorOwnership).toBe(20);
      expect(metrics.totalFundingRaised).toBe(500000);
      expect(metrics.outstandingSAFEs).toBe(1);
      expect(metrics.outstandingNotes).toBe(0);
      expect(metrics.pricedRounds).toBe(0);
    });

    it("handles empty cap table", async () => {
      const { createFounderScenario, getScenarioMetrics } = await import("@/lib/scenario-utils");

      const emptyCapTable: CapTable = {
        stakeholders: [],
        total_shares: 10000000,
        option_pool_pct: 10,
      };

      const scenario = createFounderScenario("Empty", emptyCapTable, [], []);
      const metrics = getScenarioMetrics(scenario);

      expect(metrics.totalStakeholders).toBe(0);
      expect(metrics.founderOwnership).toBe(0);
      expect(metrics.totalFundingRaised).toBe(0);
    });
  });
});
