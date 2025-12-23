import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  useVersionHistory,
  createVersionDescription,
  calculateVersionDiff,
} from "@/components/cap-table/history/use-version-history";
import type { CapTableSnapshot, CapTableVersion } from "@/components/cap-table/history/types";
import {
  VERSION_HISTORY_STORAGE_KEY,
  DEFAULT_MAX_VERSIONS,
} from "@/components/cap-table/history/types";

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
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock crypto.randomUUID
vi.stubGlobal("crypto", {
  randomUUID: () => "test-uuid-" + Math.random().toString(36).substring(7),
});

// Test data factory
function createMockSnapshot(overrides?: Partial<CapTableSnapshot>): CapTableSnapshot {
  return {
    stakeholders: [
      {
        id: "founder-1",
        name: "Alice Founder",
        type: "founder",
        shares: 5_000_000,
        ownership_pct: 50,
        share_class: "common",
      },
      {
        id: "founder-2",
        name: "Bob Cofounder",
        type: "founder",
        shares: 3_000_000,
        ownership_pct: 30,
        share_class: "common",
      },
    ],
    fundingInstruments: [],
    optionPoolPct: 10,
    totalShares: 10_000_000,
    ...overrides,
  };
}

describe("useVersionHistory", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset the store state
    useVersionHistory.getState().clearAllVersions();
  });

  describe("addVersion", () => {
    it("should add a new version with correct structure", () => {
      const { result } = renderHook(() => useVersionHistory());
      const snapshot = createMockSnapshot();

      act(() => {
        result.current.addVersion(snapshot, "stakeholder_added", "Alice Founder");
      });

      expect(result.current.versions).toHaveLength(1);
      const version = result.current.versions[0];
      expect(version.id).toBeDefined();
      expect(version.timestamp).toBeLessThanOrEqual(Date.now());
      expect(version.triggerType).toBe("stakeholder_added");
      expect(version.snapshot).toEqual(snapshot);
    });

    it("should auto-generate description with entity name", () => {
      const { result } = renderHook(() => useVersionHistory());
      const snapshot = createMockSnapshot();

      act(() => {
        result.current.addVersion(snapshot, "stakeholder_added", "Charlie Developer");
      });

      expect(result.current.versions[0].description).toBe("Added stakeholder: Charlie Developer");
    });

    it("should auto-generate description without entity name", () => {
      const { result } = renderHook(() => useVersionHistory());
      const snapshot = createMockSnapshot();

      act(() => {
        result.current.addVersion(snapshot, "option_pool_changed");
      });

      expect(result.current.versions[0].description).toBe("Changed option pool");
    });

    it("should prune oldest versions when exceeding max", () => {
      const { result } = renderHook(() => useVersionHistory());

      // Add more versions than the max
      act(() => {
        for (let i = 0; i < DEFAULT_MAX_VERSIONS + 5; i++) {
          result.current.addVersion(createMockSnapshot(), "stakeholder_added", `Stakeholder ${i}`);
        }
      });

      expect(result.current.versions).toHaveLength(DEFAULT_MAX_VERSIONS);
      // Most recent should be kept
      expect(result.current.versions[0].description).toContain("Stakeholder 24");
    });

    it("should save to localStorage after adding version", () => {
      const { result } = renderHook(() => useVersionHistory());

      act(() => {
        result.current.addVersion(createMockSnapshot(), "stakeholder_added", "Test");
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        VERSION_HISTORY_STORAGE_KEY,
        expect.any(String)
      );
    });
  });

  describe("restoreVersion", () => {
    it("should return snapshot for valid version ID", () => {
      const { result } = renderHook(() => useVersionHistory());
      const snapshot = createMockSnapshot();

      act(() => {
        result.current.addVersion(snapshot, "stakeholder_added", "Test");
      });

      const versionId = result.current.versions[0].id;
      const restored = result.current.restoreVersion(versionId);

      expect(restored).toEqual(snapshot);
    });

    it("should return null for invalid version ID", () => {
      const { result } = renderHook(() => useVersionHistory());

      const restored = result.current.restoreVersion("non-existent-id");

      expect(restored).toBeNull();
    });
  });

  describe("deleteVersion", () => {
    it("should remove version by ID", () => {
      const { result } = renderHook(() => useVersionHistory());

      act(() => {
        result.current.addVersion(createMockSnapshot(), "stakeholder_added", "First");
        result.current.addVersion(createMockSnapshot(), "stakeholder_added", "Second");
      });

      const firstVersionId = result.current.versions.find((v) =>
        v.description.includes("First")
      )?.id;

      act(() => {
        result.current.deleteVersion(firstVersionId!);
      });

      expect(result.current.versions).toHaveLength(1);
      expect(result.current.versions[0].description).toContain("Second");
    });

    it("should clear selected version if deleted", () => {
      const { result } = renderHook(() => useVersionHistory());

      act(() => {
        result.current.addVersion(createMockSnapshot(), "stakeholder_added", "Test");
      });

      const versionId = result.current.versions[0].id;

      act(() => {
        result.current.selectVersion(versionId);
      });

      expect(result.current.selectedVersionId).toBe(versionId);

      act(() => {
        result.current.deleteVersion(versionId);
      });

      expect(result.current.selectedVersionId).toBeNull();
    });
  });

  describe("UI state management", () => {
    it("should open and close history panel", () => {
      const { result } = renderHook(() => useVersionHistory());

      expect(result.current.isHistoryPanelOpen).toBe(false);

      act(() => {
        result.current.openHistoryPanel();
      });

      expect(result.current.isHistoryPanelOpen).toBe(true);

      act(() => {
        result.current.closeHistoryPanel();
      });

      expect(result.current.isHistoryPanelOpen).toBe(false);
    });

    it("should select and deselect versions", () => {
      const { result } = renderHook(() => useVersionHistory());

      act(() => {
        result.current.addVersion(createMockSnapshot(), "stakeholder_added", "Test");
      });

      const versionId = result.current.versions[0].id;

      act(() => {
        result.current.selectVersion(versionId);
      });

      expect(result.current.selectedVersionId).toBe(versionId);

      act(() => {
        result.current.selectVersion(null);
      });

      expect(result.current.selectedVersionId).toBeNull();
    });

    it("should set comparison version", () => {
      const { result } = renderHook(() => useVersionHistory());

      act(() => {
        result.current.addVersion(createMockSnapshot(), "stakeholder_added", "First");
        result.current.addVersion(createMockSnapshot(), "stakeholder_added", "Second");
      });

      const firstId = result.current.versions[1].id;
      const secondId = result.current.versions[0].id;

      act(() => {
        result.current.selectVersion(secondId);
        result.current.setComparisonVersion(firstId);
      });

      expect(result.current.selectedVersionId).toBe(secondId);
      expect(result.current.comparisonVersionId).toBe(firstId);
    });
  });

  describe("persistence", () => {
    it("should load versions from localStorage", () => {
      const mockVersions: CapTableVersion[] = [
        {
          id: "stored-version-1",
          timestamp: Date.now(),
          description: "Stored version",
          triggerType: "stakeholder_added",
          snapshot: createMockSnapshot(),
        },
      ];

      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(mockVersions));

      const { result } = renderHook(() => useVersionHistory());

      act(() => {
        result.current.loadVersionsFromStorage();
      });

      expect(result.current.versions).toHaveLength(1);
      expect(result.current.versions[0].id).toBe("stored-version-1");
    });

    it("should handle invalid JSON in localStorage gracefully", () => {
      localStorageMock.getItem.mockReturnValueOnce("invalid-json");

      const { result } = renderHook(() => useVersionHistory());

      act(() => {
        result.current.loadVersionsFromStorage();
      });

      // Should not crash and versions should be empty
      expect(result.current.versions).toEqual([]);
    });

    it("should clear all versions", () => {
      const { result } = renderHook(() => useVersionHistory());

      act(() => {
        result.current.addVersion(createMockSnapshot(), "stakeholder_added", "Test");
        result.current.addVersion(createMockSnapshot(), "stakeholder_added", "Test 2");
      });

      expect(result.current.versions).toHaveLength(2);

      act(() => {
        result.current.clearAllVersions();
      });

      expect(result.current.versions).toHaveLength(0);
    });
  });
});

describe("createVersionDescription", () => {
  it("should create description with entity name", () => {
    expect(createVersionDescription("stakeholder_added", "Alice")).toBe("Added stakeholder: Alice");
    expect(createVersionDescription("funding_added", "SAFE from Acme")).toBe(
      "Added funding: SAFE from Acme"
    );
  });

  it("should create description without entity name", () => {
    expect(createVersionDescription("stakeholder_removed")).toBe("Removed stakeholder");
    expect(createVersionDescription("option_pool_changed")).toBe("Changed option pool");
    expect(createVersionDescription("manual_save")).toBe("Manual save");
  });
});

describe("calculateVersionDiff", () => {
  it("should detect added stakeholders", () => {
    const previous = createMockSnapshot();
    const current = createMockSnapshot({
      stakeholders: [
        ...previous.stakeholders,
        {
          id: "new-stakeholder",
          name: "New Person",
          type: "employee",
          shares: 100_000,
          ownership_pct: 1,
          share_class: "common",
        },
      ],
    });

    const diff = calculateVersionDiff(previous, current);

    expect(diff.stakeholderChanges).toHaveLength(1);
    expect(diff.stakeholderChanges[0].type).toBe("added");
    expect(diff.stakeholderChanges[0].stakeholder.name).toBe("New Person");
    expect(diff.summary.stakeholdersAdded).toBe(1);
  });

  it("should detect removed stakeholders", () => {
    const current = createMockSnapshot();
    const previous = createMockSnapshot({
      stakeholders: [
        ...current.stakeholders,
        {
          id: "removed-stakeholder",
          name: "Removed Person",
          type: "employee",
          shares: 100_000,
          ownership_pct: 1,
          share_class: "common",
        },
      ],
    });

    const diff = calculateVersionDiff(previous, current);

    expect(diff.stakeholderChanges).toHaveLength(1);
    expect(diff.stakeholderChanges[0].type).toBe("removed");
    expect(diff.stakeholderChanges[0].stakeholder.name).toBe("Removed Person");
    expect(diff.summary.stakeholdersRemoved).toBe(1);
  });

  it("should detect modified ownership percentages", () => {
    const previous = createMockSnapshot();
    const current = createMockSnapshot({
      stakeholders: previous.stakeholders.map((s) =>
        s.id === "founder-1" ? { ...s, ownership_pct: 45 } : s
      ),
    });

    const diff = calculateVersionDiff(previous, current);

    const modified = diff.stakeholderChanges.find((c) => c.type === "modified");
    expect(modified).toBeDefined();
    expect(modified?.previousOwnership).toBe(50);
    expect(modified?.newOwnership).toBe(45);
    expect(diff.summary.stakeholdersModified).toBe(1);
  });

  it("should detect option pool changes", () => {
    const previous = createMockSnapshot({ optionPoolPct: 10 });
    const current = createMockSnapshot({ optionPoolPct: 15 });

    const diff = calculateVersionDiff(previous, current);

    expect(diff.optionPoolChange).toEqual({
      previous: 10,
      current: 15,
    });
  });

  it("should detect added funding instruments", () => {
    const previous = createMockSnapshot();
    const current = createMockSnapshot({
      fundingInstruments: [
        {
          id: "safe-1",
          type: "SAFE",
          investor_name: "Acme Ventures",
          investment_amount: 500_000,
          status: "outstanding",
          pro_rata_rights: false,
          mfn_clause: false,
        },
      ],
    });

    const diff = calculateVersionDiff(previous, current);

    expect(diff.fundingChanges).toHaveLength(1);
    expect(diff.fundingChanges[0].type).toBe("added");
    expect(diff.summary.fundingAdded).toBe(1);
  });
});
