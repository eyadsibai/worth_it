"use client";

import * as React from "react";
import type { GlobalSettingsForm, CurrentJobForm, RSUForm, StockOptionsForm } from "@/lib/schemas";

const STORAGE_KEY = "worth-it-draft-employee";
const DEFAULT_INTERVAL_MS = 5000; // 5 seconds

export interface DraftFormData {
  globalSettings: Partial<GlobalSettingsForm> | null;
  currentJob: Partial<CurrentJobForm> | null;
  equityDetails: Partial<RSUForm> | Partial<StockOptionsForm> | null;
}

export interface DraftData {
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

      // Create serialized version to compare
      const serialized = JSON.stringify(formData);

      // Only save if data has changed
      if (serialized === lastSavedRef.current) {
        return;
      }

      const draft: DraftData = {
        data: formData,
        savedAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        lastSavedRef.current = serialized;
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

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Clear the saved draft from localStorage.
 */
export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}
