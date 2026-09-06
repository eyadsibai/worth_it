"use client";

import * as React from "react";
import {
  GlobalSettingsFormSchema,
  CurrentJobFormSchema,
  RSUFormSchema,
  StockOptionsFormSchema,
} from "@/lib/schemas";
import type { GlobalSettingsForm, CurrentJobForm, RSUForm, StockOptionsForm } from "@/lib/schemas";

const STORAGE_KEY = "worth-it-draft-employee";
const DEFAULT_INTERVAL_MS = 5000; // 5 seconds

/**
 * Bump whenever a persisted field changes meaning.
 *
 * Drafts written by an older schema are dropped rather than migrated:
 * dilution_rounds.salary_change used to be seeded as a raise amount and now
 * carries the absolute new monthly salary, which is forwarded to the backend as
 * new_salary. A stored 1000 could be either a correct absolute salary the user
 * typed or an old example's raise, and the two are indistinguishable once
 * serialised - so the only safe reading of an unversioned draft is none.
 */
export const DRAFT_SCHEMA_VERSION = 2;

/**
 * Check if localStorage is available and functional.
 * Some browsers block localStorage in private mode or via privacy settings.
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = "__localStorage_test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export interface DraftFormData {
  globalSettings: Partial<GlobalSettingsForm> | null;
  currentJob: Partial<CurrentJobForm> | null;
  equityDetails: Partial<RSUForm> | Partial<StockOptionsForm> | null;
}

export interface DraftData {
  version: number;
  data: DraftFormData;
  savedAt: string;
}

interface UseDraftAutoSaveOptions {
  intervalMs?: number;
  disabled?: boolean;
}

/**
 * Hook to auto-save form data to localStorage at regular intervals.
 * Only saves when data has changed and is not empty.
 *
 * @example
 * ```tsx
 * useDraftAutoSave({
 *   globalSettings,
 *   currentJob,
 *   equityDetails,
 * });
 * ```
 */
export function useDraftAutoSave(
  formData: DraftFormData,
  options: UseDraftAutoSaveOptions = {}
): void {
  const { intervalMs = DEFAULT_INTERVAL_MS, disabled = false } = options;
  const lastSavedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (disabled) {
      return;
    }

    const intervalId = setInterval(() => {
      // Check if there's any data to save
      const hasData =
        formData.globalSettings !== null ||
        formData.currentJob !== null ||
        formData.equityDetails !== null;

      if (!hasData) {
        return;
      }

      // Create serialized version to compare (safely handles circular refs)
      const serialized = safeDraftSerialize(formData);
      if (serialized === null) {
        return;
      }

      // Only save if data has changed
      if (serialized === lastSavedRef.current) {
        return;
      }

      const draft: DraftData = {
        version: DRAFT_SCHEMA_VERSION,
        data: formData,
        savedAt: new Date().toISOString(),
      };

      try {
        const draftJson = safeDraftSerialize(draft);
        if (draftJson !== null) {
          localStorage.setItem(STORAGE_KEY, draftJson);
          lastSavedRef.current = serialized;
        }
      } catch {
        // localStorage may be full or unavailable
        console.warn("Failed to save draft to localStorage");
      }
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [formData, intervalMs, disabled]);
}

/**
 * Get the saved draft from localStorage.
 * Returns null if no draft exists or if the data is invalid.
 */
export function getDraft(): DraftData | null {
  if (!isLocalStorageAvailable()) {
    return null;
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored) as DraftData;

    // Validate the structure
    if (!parsed.savedAt || !parsed.data) {
      return null;
    }

    // An unversioned payload parses to undefined here, which is the pre-versioning
    // draft this guard exists to reject. Clear it so the check runs once rather
    // than on every read.
    if (parsed.version !== DRAFT_SCHEMA_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear the saved draft from localStorage.
 */
export function clearDraft(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Safely serialize form data to JSON string.
 * Returns null if serialization fails (e.g., circular references).
 */
export function safeDraftSerialize(data: unknown): string | null {
  try {
    return JSON.stringify(data);
  } catch {
    return null;
  }
}

/**
 * Safely parse draft data using Zod schemas instead of unsafe type casting.
 * Returns validated data or null for each field that fails validation.
 */
export function safeParseDraftData(data: DraftFormData): {
  globalSettings: GlobalSettingsForm | null;
  currentJob: CurrentJobForm | null;
  equityDetails: RSUForm | StockOptionsForm | null;
} {
  let globalSettings: GlobalSettingsForm | null = null;
  let currentJob: CurrentJobForm | null = null;
  let equityDetails: RSUForm | StockOptionsForm | null = null;

  if (data.globalSettings) {
    const result = GlobalSettingsFormSchema.safeParse(data.globalSettings);
    if (result.success) {
      globalSettings = result.data;
    }
  }

  if (data.currentJob) {
    const result = CurrentJobFormSchema.safeParse(data.currentJob);
    if (result.success) {
      currentJob = result.data;
    }
  }

  if (data.equityDetails) {
    // Try RSU first, then Stock Options
    const rsuResult = RSUFormSchema.safeParse(data.equityDetails);
    if (rsuResult.success) {
      equityDetails = rsuResult.data;
    } else {
      const optionsResult = StockOptionsFormSchema.safeParse(data.equityDetails);
      if (optionsResult.success) {
        equityDetails = optionsResult.data;
      }
    }
  }

  return { globalSettings, currentJob, equityDetails };
}
