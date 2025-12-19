/**
 * Types for Cap Table Version History (#175)
 *
 * These types define the structure for saving, loading, and comparing
 * cap table versions over time.
 */

import { z } from "zod";
import type { Stakeholder, FundingInstrument } from "@/lib/schemas";

// ============================================================================
// Version Trigger Types
// ============================================================================

export const VersionTriggerEnum = z.enum([
  "stakeholder_added",
  "stakeholder_removed",
  "funding_added",
  "instrument_converted",
  "option_pool_changed",
  "manual_save",
]);
export type VersionTrigger = z.infer<typeof VersionTriggerEnum>;

// Human-readable descriptions for each trigger type
export const VERSION_TRIGGER_LABELS: Record<VersionTrigger, string> = {
  stakeholder_added: "Added stakeholder",
  stakeholder_removed: "Removed stakeholder",
  funding_added: "Added funding",
  instrument_converted: "Converted instrument",
  option_pool_changed: "Changed option pool",
  manual_save: "Manual save",
};

// ============================================================================
// Version Snapshot Schema
// ============================================================================

export const CapTableSnapshotSchema = z.object({
  stakeholders: z.array(z.custom<Stakeholder>()),
  fundingInstruments: z.array(z.custom<FundingInstrument>()),
  optionPoolPct: z.number().min(0).max(100),
  totalShares: z.number().min(0),
});
export type CapTableSnapshot = z.infer<typeof CapTableSnapshotSchema>;

// ============================================================================
// Version Schema
// ============================================================================

export const CapTableVersionSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number(), // Unix timestamp in milliseconds
  description: z.string(),
  triggerType: VersionTriggerEnum,
  snapshot: CapTableSnapshotSchema,
});
export type CapTableVersion = z.infer<typeof CapTableVersionSchema>;

// ============================================================================
// Diff Types for Version Comparison
// ============================================================================

export type DiffChangeType = "added" | "removed" | "modified";

export interface StakeholderDiff {
  type: DiffChangeType;
  stakeholder: Stakeholder;
  previousOwnership?: number; // Only for 'modified'
  newOwnership?: number; // Only for 'modified'
}

export interface FundingDiff {
  type: DiffChangeType;
  instrument: FundingInstrument;
}

export interface VersionDiff {
  stakeholderChanges: StakeholderDiff[];
  fundingChanges: FundingDiff[];
  optionPoolChange?: {
    previous: number;
    current: number;
  };
  summary: {
    stakeholdersAdded: number;
    stakeholdersRemoved: number;
    stakeholdersModified: number;
    fundingAdded: number;
    fundingRemoved: number;
  };
}

// ============================================================================
// Store State Types
// ============================================================================

export interface VersionHistoryState {
  versions: CapTableVersion[];
  maxVersions: number;
  isHistoryPanelOpen: boolean;
  selectedVersionId: string | null;
  comparisonVersionId: string | null;
}

export interface VersionHistoryActions {
  // Version management
  addVersion: (
    snapshot: CapTableSnapshot,
    triggerType: VersionTrigger,
    entityName?: string
  ) => void;
  restoreVersion: (versionId: string) => CapTableSnapshot | null;
  deleteVersion: (versionId: string) => void;
  clearAllVersions: () => void;

  // UI state
  openHistoryPanel: () => void;
  closeHistoryPanel: () => void;
  selectVersion: (versionId: string | null) => void;
  setComparisonVersion: (versionId: string | null) => void;

  // Persistence
  loadVersionsFromStorage: () => void;
  saveVersionsToStorage: () => void;
}

export type VersionHistoryStore = VersionHistoryState & VersionHistoryActions;

// ============================================================================
// Constants
// ============================================================================

export const VERSION_HISTORY_STORAGE_KEY = "cap-table-versions";
export const DEFAULT_MAX_VERSIONS = 20;
