/**
 * Unit Tests for Timeline Data Hook (#228)
 *
 * Tests data transformation from version history and form data
 * to timeline events and chart data.
 */

import { describe, it, expect } from "vitest";
import {
  transformVersionsToEvents,
  deriveEmployeeTimelineEvents,
  filterEvents,
  transformEventsToChartData,
  getStakeholderNames,
} from "@/components/cap-table/timeline/use-timeline-data";
import type { CapTableVersion, CapTableSnapshot } from "@/components/cap-table/history/types";
import type { RSUForm, StockOptionsForm, GlobalSettingsForm, Stakeholder } from "@/lib/schemas";
import type { TimelineEvent, TimelineFilterState } from "@/components/cap-table/timeline/types";
import { ALL_FILTERS_ENABLED } from "@/components/cap-table/timeline/types";

// ============================================================================
// Mock Data Factories
// ============================================================================

function createMockStakeholder(overrides: Partial<Stakeholder> = {}): Stakeholder {
  return {
    id: "s1",
    name: "Founder A",
    type: "founder",
    shares: 500000,
    ownership_pct: 50,
    share_class: "common",
    ...overrides,
  };
}

function createMockSnapshot(overrides: Partial<CapTableSnapshot> = {}): CapTableSnapshot {
  return {
    stakeholders: [
      createMockStakeholder({ id: "s1", name: "Founder A", ownership_pct: 50 }),
      createMockStakeholder({ id: "s2", name: "Founder B", ownership_pct: 30 }),
      createMockStakeholder({ id: "s3", name: "Option Pool", type: "employee", ownership_pct: 20 }),
    ],
    fundingInstruments: [],
    optionPoolPct: 20,
    totalShares: 1000000,
    ...overrides,
  };
}

function createMockVersion(overrides: Partial<CapTableVersion> = {}): CapTableVersion {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    description: "Test version",
    triggerType: "manual_save",
    snapshot: createMockSnapshot(),
    ...overrides,
  };
}

function createMockRSUForm(overrides: Partial<RSUForm> = {}): RSUForm {
  return {
    equity_type: "RSU",
    monthly_salary: 5000,
    total_equity_grant_pct: 0.5,
    vesting_period: 4,
    cliff_period: 1,
    simulate_dilution: false,
    dilution_rounds: [],
    exit_valuation: 100000000,
    ...overrides,
  };
}

function createMockStockOptionsForm(overrides: Partial<StockOptionsForm> = {}): StockOptionsForm {
  return {
    equity_type: "STOCK_OPTIONS",
    monthly_salary: 5000,
    num_options: 10000,
    strike_price: 1.0,
    vesting_period: 4,
    cliff_period: 1,
    exercise_strategy: "AT_EXIT",
    exit_price_per_share: 10.0,
    ...overrides,
  };
}

function createMockGlobalSettings(): GlobalSettingsForm {
  return {
    exit_year: 5,
  };
}

// ============================================================================
// transformVersionsToEvents Tests
// ============================================================================

describe("transformVersionsToEvents", () => {
  it("should return empty array for empty versions", () => {
    const events = transformVersionsToEvents([]);
    expect(events).toEqual([]);
  });

  it("should create company_founded event for first version", () => {
    const version = createMockVersion({
      timestamp: 1700000000000,
      description: "Initial Setup",
      triggerType: "manual_save",
    });

    const events = transformVersionsToEvents([version]);

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("company_founded");
    expect(events[0].timestamp).toBe(1700000000000);
  });

  it("should detect stakeholder_added trigger type", () => {
    // Versions are stored newest first, so v2 (newer) comes first in the array
    const v1 = createMockVersion({
      timestamp: 1700000000000,
      triggerType: "manual_save",
      snapshot: createMockSnapshot({
        stakeholders: [createMockStakeholder({ name: "Founder", ownership_pct: 100 })],
      }),
    });

    const v2 = createMockVersion({
      timestamp: 1700100000000,
      triggerType: "stakeholder_added",
      description: "Added Investor",
      snapshot: createMockSnapshot({
        stakeholders: [
          createMockStakeholder({ name: "Founder", ownership_pct: 80 }),
          createMockStakeholder({
            id: "s2",
            name: "Investor",
            type: "investor",
            ownership_pct: 20,
          }),
        ],
      }),
    });

    // Pass versions in reverse chronological order (newest first)
    const events = transformVersionsToEvents([v2, v1]);

    expect(events).toHaveLength(2);
    // After reversing to chronological, events[0] is oldest (v1), events[1] is newest (v2)
    expect(events[0].type).toBe("company_founded");
    expect(events[1].type).toBe("stakeholder_added");
  });

  it("should detect funding_added trigger type", () => {
    const v1 = createMockVersion({
      timestamp: 1700000000000,
    });

    const v2 = createMockVersion({
      timestamp: 1700100000000,
      triggerType: "funding_added",
      description: "Seed Round",
    });

    // Pass versions in reverse chronological order (newest first)
    const events = transformVersionsToEvents([v2, v1]);

    expect(events).toHaveLength(2);
    expect(events[1].type).toBe("funding_round");
  });

  it("should include ownership snapshot for each event", () => {
    const version = createMockVersion();
    const events = transformVersionsToEvents([version]);

    expect(events[0].ownershipSnapshot).toBeDefined();
    expect(events[0].ownershipSnapshot.length).toBeGreaterThan(0);
    expect(events[0].ownershipSnapshot[0]).toHaveProperty("name");
    expect(events[0].ownershipSnapshot[0]).toHaveProperty("percentage");
  });

  it("should output events in chronological order", () => {
    const v1 = createMockVersion({ timestamp: 1700200000000 }); // Later
    const v2 = createMockVersion({ timestamp: 1700000000000 }); // Earlier

    // Pass in reverse chronological order (newest first, as stored in the app)
    const events = transformVersionsToEvents([v1, v2]);

    // Output should be chronological (oldest first)
    expect(events[0].timestamp).toBe(1700000000000); // v2 first
    expect(events[1].timestamp).toBe(1700200000000); // v1 second
  });
});

// ============================================================================
// deriveEmployeeTimelineEvents Tests
// ============================================================================

describe("deriveEmployeeTimelineEvents", () => {
  it("should create grant_date event for RSUs", () => {
    const rsuForm = createMockRSUForm();
    const globalSettings = createMockGlobalSettings();

    const events = deriveEmployeeTimelineEvents(rsuForm, globalSettings);

    const grantEvent = events.find((e) => e.type === "grant_date");
    expect(grantEvent).toBeDefined();
    expect(grantEvent!.title).toBe("Equity Grant");
    expect(grantEvent!.description).toContain("0.5% equity in RSUs");
  });

  it("should create grant_date event for stock options", () => {
    const optionsForm = createMockStockOptionsForm({ num_options: 50000 });
    const globalSettings = createMockGlobalSettings();

    const events = deriveEmployeeTimelineEvents(optionsForm, globalSettings);

    const grantEvent = events.find((e) => e.type === "grant_date");
    expect(grantEvent).toBeDefined();
    expect(grantEvent!.description).toContain("50,000 stock options");
  });

  it("should create cliff_date event after cliff period", () => {
    const rsuForm = createMockRSUForm({
      vesting_period: 4, // 4 years
      cliff_period: 1, // 1 year
    });
    const globalSettings = createMockGlobalSettings();

    const events = deriveEmployeeTimelineEvents(rsuForm, globalSettings);

    const cliffEvent = events.find((e) => e.type === "cliff_date");
    expect(cliffEvent).toBeDefined();
    expect(cliffEvent!.title).toBe("Cliff Reached");
  });

  it("should create 100% vesting milestone at end of vesting", () => {
    const rsuForm = createMockRSUForm({
      vesting_period: 4,
      cliff_period: 1,
    });
    const globalSettings = createMockGlobalSettings();

    const events = deriveEmployeeTimelineEvents(rsuForm, globalSettings);

    // The 100% milestone uses "vesting_milestone" type with "100% Vested" title
    const fullVestingEvent = events.find(
      (e) => e.type === "vesting_milestone" && e.title === "100% Vested"
    );
    expect(fullVestingEvent).toBeDefined();
    expect(fullVestingEvent!.description).toContain("vested");
  });

  it("should skip cliff event if cliff_period is 0", () => {
    const rsuForm = createMockRSUForm({
      cliff_period: 0,
    });
    const globalSettings = createMockGlobalSettings();

    const events = deriveEmployeeTimelineEvents(rsuForm, globalSettings);

    const cliffEvent = events.find((e) => e.type === "cliff_date");
    expect(cliffEvent).toBeUndefined();
  });

  it("should sort events chronologically", () => {
    const rsuForm = createMockRSUForm();
    const globalSettings = createMockGlobalSettings();

    const events = deriveEmployeeTimelineEvents(rsuForm, globalSettings);

    for (let i = 1; i < events.length; i++) {
      expect(events[i].timestamp).toBeGreaterThanOrEqual(events[i - 1].timestamp);
    }
  });
});

// ============================================================================
// filterEvents Tests
// ============================================================================

describe("filterEvents", () => {
  const mockEvents: TimelineEvent[] = [
    {
      id: "e1",
      timestamp: 1700000000000,
      type: "funding_round",
      title: "Seed Round",
      description: "Seed funding round",
      ownershipSnapshot: [],
    },
    {
      id: "e2",
      timestamp: 1700100000000,
      type: "stakeholder_added",
      title: "Added Employee",
      description: "New employee added",
      ownershipSnapshot: [],
    },
    {
      id: "e3",
      timestamp: 1700200000000,
      type: "vesting_milestone",
      title: "50% Vested",
      description: "50% of equity vested",
      ownershipSnapshot: [],
    },
    {
      id: "e4",
      timestamp: 1700300000000,
      type: "option_pool_change",
      title: "Pool Expansion",
      description: "Option pool expanded",
      ownershipSnapshot: [],
    },
  ];

  it("should return all events when all filters are enabled", () => {
    const filtered = filterEvents(mockEvents, ALL_FILTERS_ENABLED);
    expect(filtered).toHaveLength(4);
  });

  it("should filter out funding_round events when disabled", () => {
    const filters: TimelineFilterState = {
      ...ALL_FILTERS_ENABLED,
      fundingRound: false,
    };

    const filtered = filterEvents(mockEvents, filters);
    expect(filtered.find((e) => e.type === "funding_round")).toBeUndefined();
  });

  it("should filter out multiple event types", () => {
    const filters: TimelineFilterState = {
      ...ALL_FILTERS_ENABLED,
      fundingRound: false,
      vestingMilestone: false,
    };

    const filtered = filterEvents(mockEvents, filters);
    expect(filtered.find((e) => e.type === "funding_round")).toBeUndefined();
    expect(filtered.find((e) => e.type === "vesting_milestone")).toBeUndefined();
  });

  it("should return empty array when all filters are disabled", () => {
    const allDisabled: TimelineFilterState = {
      fundingRound: false,
      stakeholderAdded: false,
      stakeholderRemoved: false,
      optionPoolChange: false,
      instrumentConverted: false,
      grantDate: false,
      cliffDate: false,
      vestingMilestone: false,
      exerciseDeadline: false,
    };

    const filtered = filterEvents(mockEvents, allDisabled);
    expect(filtered).toHaveLength(0);
  });
});

// ============================================================================
// transformEventsToChartData Tests
// ============================================================================

describe("transformEventsToChartData", () => {
  it("should return empty array for empty events", () => {
    const chartData = transformEventsToChartData([]);
    expect(chartData).toEqual([]);
  });

  it("should create chart data points with stakeholder percentages", () => {
    const events: TimelineEvent[] = [
      {
        id: "e1",
        timestamp: 1700000000000,
        type: "company_founded",
        title: "Initial",
        description: "Company founded",
        ownershipSnapshot: [
          { stakeholderId: "s1", name: "Founder", percentage: 80, category: "founder" },
          { stakeholderId: "s2", name: "Pool", percentage: 20, category: "option_pool" },
        ],
      },
    ];

    const chartData = transformEventsToChartData(events);

    expect(chartData).toHaveLength(1);
    expect(chartData[0].timestamp).toBe(1700000000000);
    expect(chartData[0]["Founder"]).toBe(80);
    expect(chartData[0]["Pool"]).toBe(20);
  });

  it("should include formatted date", () => {
    const events: TimelineEvent[] = [
      {
        id: "e1",
        timestamp: 1700000000000, // Nov 2023
        type: "company_founded",
        title: "Initial",
        description: "Company founded",
        ownershipSnapshot: [
          { stakeholderId: "s1", name: "Founder", percentage: 100, category: "founder" },
        ],
      },
    ];

    const chartData = transformEventsToChartData(events);

    expect(chartData[0].date).toBeDefined();
    expect(typeof chartData[0].date).toBe("string");
  });
});

// ============================================================================
// getStakeholderNames Tests
// ============================================================================

describe("getStakeholderNames", () => {
  it("should return empty array for empty events", () => {
    const names = getStakeholderNames([]);
    expect(names).toEqual([]);
  });

  it("should extract unique stakeholder names", () => {
    const events: TimelineEvent[] = [
      {
        id: "e1",
        timestamp: 1700000000000,
        type: "company_founded",
        title: "Initial",
        description: "Company founded",
        ownershipSnapshot: [
          { stakeholderId: "s1", name: "Alice", percentage: 50, category: "founder" },
          { stakeholderId: "s2", name: "Bob", percentage: 30, category: "founder" },
          { stakeholderId: "s3", name: "Pool", percentage: 20, category: "option_pool" },
        ],
      },
      {
        id: "e2",
        timestamp: 1700100000000,
        type: "stakeholder_added",
        title: "Added",
        description: "New stakeholder added",
        ownershipSnapshot: [
          { stakeholderId: "s1", name: "Alice", percentage: 40, category: "founder" },
          { stakeholderId: "s2", name: "Bob", percentage: 30, category: "founder" },
          { stakeholderId: "s3", name: "Pool", percentage: 15, category: "option_pool" },
          { stakeholderId: "s4", name: "Charlie", percentage: 15, category: "investor" },
        ],
      },
    ];

    const names = getStakeholderNames(events);

    expect(names).toContain("Alice");
    expect(names).toContain("Bob");
    expect(names).toContain("Pool");
    expect(names).toContain("Charlie");
    expect(names).toHaveLength(4); // No duplicates
  });
});
