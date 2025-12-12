/**
 * Tests for Zustand application store
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/lib/store";
import type { ScenarioData } from "@/lib/export-utils";

// Reset store between tests
beforeEach(() => {
  useAppStore.setState({
    appMode: "employee",
    globalSettings: null,
    currentJob: null,
    equityDetails: null,
    capTable: {
      stakeholders: [],
      total_shares: 10000000,
      option_pool_pct: 10,
    },
    instruments: [],
    preferenceTiers: [],
    monteCarloResults: null,
    comparisonScenarios: [],
  });
});

describe("App Mode", () => {
  it("starts in employee mode", () => {
    const { appMode } = useAppStore.getState();
    expect(appMode).toBe("employee");
  });

  it("can switch to founder mode", () => {
    useAppStore.getState().setAppMode("founder");
    expect(useAppStore.getState().appMode).toBe("founder");
  });

  it("can switch back to employee mode", () => {
    useAppStore.getState().setAppMode("founder");
    useAppStore.getState().setAppMode("employee");
    expect(useAppStore.getState().appMode).toBe("employee");
  });
});

describe("Employee Mode State", () => {
  const mockGlobalSettings = {
    exit_year: 5,
  };

  const mockCurrentJob = {
    monthly_salary: 20000,
    annual_salary_growth_rate: 5,
    assumed_annual_roi: 8,
    investment_frequency: "Monthly" as const,
  };

  const mockEquityDetails = {
    equity_type: "RSU" as const,
    monthly_salary: 15000,
    total_equity_grant_pct: 0.5,
    exit_valuation: 100000000,
    vesting_period: 4,
    cliff_period: 1,
    simulate_dilution: false,
    dilution_rounds: [],
  };

  it("sets global settings", () => {
    useAppStore.getState().setGlobalSettings(mockGlobalSettings);
    expect(useAppStore.getState().globalSettings).toEqual(mockGlobalSettings);
  });

  it("sets current job", () => {
    useAppStore.getState().setCurrentJob(mockCurrentJob);
    expect(useAppStore.getState().currentJob).toEqual(mockCurrentJob);
  });

  it("sets equity details", () => {
    useAppStore.getState().setEquityDetails(mockEquityDetails);
    expect(useAppStore.getState().equityDetails).toEqual(mockEquityDetails);
  });

  it("hasEmployeeFormData returns false when incomplete", () => {
    expect(useAppStore.getState().hasEmployeeFormData()).toBe(false);

    useAppStore.getState().setGlobalSettings(mockGlobalSettings);
    expect(useAppStore.getState().hasEmployeeFormData()).toBe(false);

    useAppStore.getState().setCurrentJob(mockCurrentJob);
    expect(useAppStore.getState().hasEmployeeFormData()).toBe(false);
  });

  it("hasEmployeeFormData returns true when complete", () => {
    useAppStore.getState().setGlobalSettings(mockGlobalSettings);
    useAppStore.getState().setCurrentJob(mockCurrentJob);
    useAppStore.getState().setEquityDetails(mockEquityDetails);

    expect(useAppStore.getState().hasEmployeeFormData()).toBe(true);
  });
});

describe("Founder Mode State", () => {
  const mockCapTable = {
    stakeholders: [
      {
        id: "1",
        name: "Founder",
        type: "founder" as const,
        shares: 5000000,
        ownership_pct: 50,
        share_class: "common" as const,
      },
    ],
    total_shares: 10000000,
    option_pool_pct: 10,
  };

  const mockInstruments = [
    {
      id: "safe1",
      type: "SAFE" as const,
      investor_name: "Y Combinator",
      investment_amount: 500000,
      valuation_cap: 5000000,
      pro_rata_rights: true,
      mfn_clause: false,
      status: "outstanding" as const,
    },
  ];

  const mockPreferenceTiers = [
    {
      id: "tier1",
      name: "Series A",
      seniority: 1,
      investment_amount: 1000000,
      liquidation_multiplier: 1,
      participating: false,
      stakeholder_ids: ["investor1"],
    },
  ];

  it("sets cap table", () => {
    useAppStore.getState().setCapTable(mockCapTable);
    expect(useAppStore.getState().capTable).toEqual(mockCapTable);
  });

  it("sets instruments", () => {
    useAppStore.getState().setInstruments(mockInstruments);
    expect(useAppStore.getState().instruments).toEqual(mockInstruments);
  });

  it("sets preference tiers", () => {
    useAppStore.getState().setPreferenceTiers(mockPreferenceTiers);
    expect(useAppStore.getState().preferenceTiers).toEqual(mockPreferenceTiers);
  });
});

describe("Results State", () => {
  it("sets Monte Carlo results", () => {
    const mockResults = {
      net_outcomes: [100000, 200000, 300000],
      simulated_valuations: [1000000, 2000000, 3000000],
    };

    useAppStore.getState().setMonteCarloResults(mockResults);
    expect(useAppStore.getState().monteCarloResults).toEqual(mockResults);
  });

  it("clears Monte Carlo results", () => {
    useAppStore.getState().setMonteCarloResults({
      net_outcomes: [100000],
      simulated_valuations: [1000000],
    });
    useAppStore.getState().setMonteCarloResults(null);
    expect(useAppStore.getState().monteCarloResults).toBeNull();
  });

  it("sets comparison scenarios", () => {
    const mockScenario: ScenarioData = {
      name: "Scenario 1",
      timestamp: new Date().toISOString(),
      globalSettings: { exitYear: 5 },
      currentJob: {
        monthlySalary: 15000,
        annualGrowthRate: 5,
        assumedROI: 8,
        investmentFrequency: "Monthly",
      },
      equity: {
        type: "RSU",
        monthlySalary: 12000,
        vestingPeriod: 4,
        cliffPeriod: 1,
        equityPct: 0.5,
        exitValuation: 100000000,
      },
      results: {
        finalPayoutValue: 500000,
        finalOpportunityCost: 200000,
        netOutcome: 300000,
      },
    };

    useAppStore.getState().setComparisonScenarios([mockScenario]);
    expect(useAppStore.getState().comparisonScenarios).toEqual([mockScenario]);
  });

  it("clears comparison scenarios", () => {
    const mockScenario: ScenarioData = {
      name: "Test",
      timestamp: new Date().toISOString(),
      globalSettings: { exitYear: 5 },
      currentJob: {
        monthlySalary: 15000,
        annualGrowthRate: 5,
        assumedROI: 8,
        investmentFrequency: "Monthly",
      },
      equity: {
        type: "RSU",
        monthlySalary: 12000,
        vestingPeriod: 4,
        cliffPeriod: 1,
      },
      results: {
        finalPayoutValue: 100000,
        finalOpportunityCost: 50000,
        netOutcome: 50000,
      },
    };
    useAppStore.getState().setComparisonScenarios([mockScenario]);
    useAppStore.getState().clearComparisonScenarios();
    expect(useAppStore.getState().comparisonScenarios).toEqual([]);
  });
});
