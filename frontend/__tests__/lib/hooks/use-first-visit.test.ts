/**
 * Tests for useFirstVisit hook
 * TDD: Tests written first
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFirstVisit } from "@/lib/hooks/use-first-visit";

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

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useFirstVisit", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it("returns isFirstVisit=true when localStorage has no record", () => {
    const { result } = renderHook(() => useFirstVisit());

    expect(result.current.isFirstVisit).toBe(true);
  });

  it("returns isFirstVisit=false when user has been onboarded", () => {
    localStorageMock.setItem("worth_it_onboarded", "true");

    const { result } = renderHook(() => useFirstVisit());

    expect(result.current.isFirstVisit).toBe(false);
  });

  it("markAsOnboarded sets localStorage and updates state", () => {
    const { result } = renderHook(() => useFirstVisit());

    expect(result.current.isFirstVisit).toBe(true);

    act(() => {
      result.current.markAsOnboarded();
    });

    expect(result.current.isFirstVisit).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "worth_it_onboarded",
      "true"
    );
  });

  it("resetOnboarding clears localStorage and updates state", () => {
    localStorageMock.setItem("worth_it_onboarded", "true");

    const { result } = renderHook(() => useFirstVisit());

    expect(result.current.isFirstVisit).toBe(false);

    act(() => {
      result.current.resetOnboarding();
    });

    expect(result.current.isFirstVisit).toBe(true);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "worth_it_onboarded"
    );
  });
});
