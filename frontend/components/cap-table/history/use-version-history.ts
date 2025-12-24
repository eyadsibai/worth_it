/**
 * Version History Store for Cap Table (#175)
 *
 * Zustand store that manages cap table version snapshots with
 * localStorage persistence for tracking changes over time.
 */

import { create } from "zustand";
import type {
  CapTableSnapshot,
  CapTableVersion,
  VersionTrigger,
  VersionHistoryStore,
  VersionDiff,
  StakeholderDiff,
  FundingDiff,
} from "./types";
import { VERSION_HISTORY_STORAGE_KEY, DEFAULT_MAX_VERSIONS, VERSION_TRIGGER_LABELS } from "./types";

/**
 * Create a human-readable description for a version based on trigger type and entity name.
 */
export function createVersionDescription(triggerType: VersionTrigger, entityName?: string): string {
  const baseLabel = VERSION_TRIGGER_LABELS[triggerType];

  if (entityName) {
    return `${baseLabel}: ${entityName}`;
  }

  return baseLabel;
}

/**
 * Calculate the diff between two cap table snapshots.
 */
export function calculateVersionDiff(
  previous: CapTableSnapshot,
  current: CapTableSnapshot
): VersionDiff {
  const stakeholderChanges: StakeholderDiff[] = [];
  const fundingChanges: FundingDiff[] = [];

  // Create maps for efficient lookup
  const previousStakeholders = new Map(previous.stakeholders.map((s) => [s.id, s]));
  const currentStakeholders = new Map(current.stakeholders.map((s) => [s.id, s]));
  const previousFunding = new Map(previous.fundingInstruments.map((f) => [f.id, f]));
  const currentFunding = new Map(current.fundingInstruments.map((f) => [f.id, f]));

  // Find added and modified stakeholders
  for (const [id, stakeholder] of currentStakeholders) {
    const prev = previousStakeholders.get(id);
    if (!prev) {
      // Added
      stakeholderChanges.push({
        type: "added",
        stakeholder,
      });
    } else if (prev.ownership_pct !== stakeholder.ownership_pct) {
      // Modified
      stakeholderChanges.push({
        type: "modified",
        stakeholder,
        previousOwnership: prev.ownership_pct,
        newOwnership: stakeholder.ownership_pct,
      });
    }
  }

  // Find removed stakeholders
  for (const [id, stakeholder] of previousStakeholders) {
    if (!currentStakeholders.has(id)) {
      stakeholderChanges.push({
        type: "removed",
        stakeholder,
      });
    }
  }

  // Find added funding instruments
  for (const [id, instrument] of currentFunding) {
    if (!previousFunding.has(id)) {
      fundingChanges.push({
        type: "added",
        instrument,
      });
    }
  }

  // Find removed funding instruments
  for (const [id, instrument] of previousFunding) {
    if (!currentFunding.has(id)) {
      fundingChanges.push({
        type: "removed",
        instrument,
      });
    }
  }

  // Calculate option pool change
  const optionPoolChange =
    previous.optionPoolPct !== current.optionPoolPct
      ? {
          previous: previous.optionPoolPct,
          current: current.optionPoolPct,
        }
      : undefined;

  // Calculate summary
  const summary = {
    stakeholdersAdded: stakeholderChanges.filter((c) => c.type === "added").length,
    stakeholdersRemoved: stakeholderChanges.filter((c) => c.type === "removed").length,
    stakeholdersModified: stakeholderChanges.filter((c) => c.type === "modified").length,
    fundingAdded: fundingChanges.filter((c) => c.type === "added").length,
    fundingRemoved: fundingChanges.filter((c) => c.type === "removed").length,
  };

  return {
    stakeholderChanges,
    fundingChanges,
    optionPoolChange,
    summary,
  };
}

/**
 * Version History Zustand Store
 */
export const useVersionHistory = create<VersionHistoryStore>((set, get) => ({
  // Initial state
  versions: [],
  maxVersions: DEFAULT_MAX_VERSIONS,
  isHistoryPanelOpen: false,
  selectedVersionId: null,
  comparisonVersionId: null,

  // Actions
  addVersion: (snapshot: CapTableSnapshot, triggerType: VersionTrigger, entityName?: string) => {
    const newVersion: CapTableVersion = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      description: createVersionDescription(triggerType, entityName),
      triggerType,
      snapshot,
    };

    set((state) => {
      // Add new version at the beginning (most recent first)
      const updatedVersions = [newVersion, ...state.versions];

      // Prune oldest versions if exceeding max
      if (updatedVersions.length > state.maxVersions) {
        updatedVersions.length = state.maxVersions;
      }

      return { versions: updatedVersions };
    });

    // Persist to localStorage
    get().saveVersionsToStorage();
  },

  restoreVersion: (versionId: string): CapTableSnapshot | null => {
    const version = get().versions.find((v) => v.id === versionId);
    return version?.snapshot ?? null;
  },

  deleteVersion: (versionId: string) => {
    set((state) => {
      const newVersions = state.versions.filter((v) => v.id !== versionId);
      const newSelectedId = state.selectedVersionId === versionId ? null : state.selectedVersionId;
      const newComparisonId =
        state.comparisonVersionId === versionId ? null : state.comparisonVersionId;

      return {
        versions: newVersions,
        selectedVersionId: newSelectedId,
        comparisonVersionId: newComparisonId,
      };
    });

    get().saveVersionsToStorage();
  },

  clearAllVersions: () => {
    set({
      versions: [],
      selectedVersionId: null,
      comparisonVersionId: null,
    });

    if (typeof window !== "undefined") {
      localStorage.removeItem(VERSION_HISTORY_STORAGE_KEY);
    }
  },

  // UI state
  openHistoryPanel: () => set({ isHistoryPanelOpen: true }),
  closeHistoryPanel: () => set({ isHistoryPanelOpen: false }),
  selectVersion: (versionId: string | null) => set({ selectedVersionId: versionId }),
  setComparisonVersion: (versionId: string | null) => set({ comparisonVersionId: versionId }),

  // Persistence
  loadVersionsFromStorage: () => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(VERSION_HISTORY_STORAGE_KEY);
      if (stored) {
        const versions = JSON.parse(stored) as CapTableVersion[];
        set({ versions });
      }
    } catch (error) {
      console.error("Failed to load version history from localStorage:", error);
      // Keep existing state on error
    }
  },

  saveVersionsToStorage: () => {
    if (typeof window === "undefined") return;

    try {
      const { versions } = get();
      localStorage.setItem(VERSION_HISTORY_STORAGE_KEY, JSON.stringify(versions));
    } catch (error) {
      console.error("Failed to save version history to localStorage:", error);
    }
  },
}));

/**
 * Hook to get the diff between selected version and comparison version (or current state)
 */
export function useVersionDiff(currentSnapshot?: CapTableSnapshot): VersionDiff | null {
  const { versions, selectedVersionId, comparisonVersionId } = useVersionHistory();

  if (!selectedVersionId) return null;

  const selectedVersion = versions.find((v) => v.id === selectedVersionId);
  if (!selectedVersion) return null;

  // Compare against comparison version or current state
  let compareSnapshot: CapTableSnapshot | undefined;

  if (comparisonVersionId) {
    const comparisonVersion = versions.find((v) => v.id === comparisonVersionId);
    compareSnapshot = comparisonVersion?.snapshot;
  } else {
    compareSnapshot = currentSnapshot;
  }

  if (!compareSnapshot) return null;

  return calculateVersionDiff(selectedVersion.snapshot, compareSnapshot);
}
