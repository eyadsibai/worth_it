/**
 * Tests for useDraftAutoSave hook
 * Following TDD - tests written first
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDraftAutoSave, getDraft, clearDraft, type DraftData } from "@/lib/hooks/use-draft-auto-save";

describe("useDraftAutoSave", () => {
  const STORAGE_KEY = "worth-it-draft-employee";

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("auto-save functionality", () => {
    it("saves form data to localStorage after interval", async () => {
      const formData = {
        globalSettings: { exit_year: 2028 },
        currentJob: { monthly_salary: 10000 },
        equityDetails: { equity_type: "RSU" as const, monthly_salary: 8000 },
      };

      renderHook(() => useDraftAutoSave(formData, { intervalMs: 5000 }));

      // Advance time past the interval
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed.data).toEqual(formData);
      expect(parsed.savedAt).toBeDefined();
    });

    it("does not save if form data is empty/null", () => {
      const formData = {
        globalSettings: null,
        currentJob: null,
        equityDetails: null,
      };

      renderHook(() => useDraftAutoSave(formData, { intervalMs: 5000 }));

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it("saves only when data has changed", () => {
      const formData = {
        globalSettings: { exit_year: 2028 },
        currentJob: { monthly_salary: 10000 },
        equityDetails: null,
      };

      renderHook(() => useDraftAutoSave(formData, { intervalMs: 5000 }));

      // First save
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      const firstSave = localStorage.getItem(STORAGE_KEY);
      expect(firstSave).not.toBeNull();
      const firstTimestamp = JSON.parse(firstSave!).savedAt;

      // Same data, should not update timestamp (internal ref prevents re-save)
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      const secondSave = localStorage.getItem(STORAGE_KEY);
      const secondTimestamp = JSON.parse(secondSave!).savedAt;

      // Timestamp should remain the same since data didn't change
      expect(firstTimestamp).toBe(secondTimestamp);
    });

    it("updates save when data changes", () => {
      let formData = {
        globalSettings: { exit_year: 2028 },
        currentJob: null,
        equityDetails: null,
      };

      const { rerender } = renderHook(
        ({ data }) => useDraftAutoSave(data, { intervalMs: 5000 }),
        { initialProps: { data: formData } }
      );

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      const firstSave = localStorage.getItem(STORAGE_KEY);
      expect(firstSave).not.toBeNull();
      expect(JSON.parse(firstSave!).data.globalSettings.exit_year).toBe(2028);

      // Update data
      formData = {
        globalSettings: { exit_year: 2030 },
        currentJob: null,
        equityDetails: null,
      };
      rerender({ data: formData });

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      const secondSave = localStorage.getItem(STORAGE_KEY);
      expect(secondSave).not.toBeNull();
      // Data should be updated to new value
      expect(JSON.parse(secondSave!).data.globalSettings.exit_year).toBe(2030);
    });

    it("cleans up interval on unmount", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");
      const formData = {
        globalSettings: { exit_year: 2028 },
        currentJob: null,
        equityDetails: null,
      };

      const { unmount } = renderHook(() => useDraftAutoSave(formData, { intervalMs: 5000 }));

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe("disabled option", () => {
    it("does not save when disabled", () => {
      const formData = {
        globalSettings: { exit_year: 2028 },
        currentJob: { monthly_salary: 10000 },
        equityDetails: null,
      };

      renderHook(() => useDraftAutoSave(formData, { intervalMs: 5000, disabled: true }));

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });
});

describe("getDraft", () => {
  const STORAGE_KEY = "worth-it-draft-employee";

  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when no draft exists", () => {
    expect(getDraft()).toBeNull();
  });

  it("returns draft data when exists", () => {
    const draft: DraftData = {
      data: {
        globalSettings: { exit_year: 2028 },
        currentJob: { monthly_salary: 10000 },
        equityDetails: null,
      },
      savedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));

    const result = getDraft();
    expect(result).toEqual(draft);
  });

  it("returns null for corrupted data", () => {
    localStorage.setItem(STORAGE_KEY, "invalid json");
    expect(getDraft()).toBeNull();
  });

  it("returns null for draft without savedAt", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: {} }));
    expect(getDraft()).toBeNull();
  });
});

describe("clearDraft", () => {
  const STORAGE_KEY = "worth-it-draft-employee";

  beforeEach(() => {
    localStorage.clear();
  });

  it("removes draft from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ data: {}, savedAt: new Date().toISOString() }));

    clearDraft();

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("does not throw when no draft exists", () => {
    expect(() => clearDraft()).not.toThrow();
  });
});
