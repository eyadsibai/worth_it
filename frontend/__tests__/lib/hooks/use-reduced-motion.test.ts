/**
 * Tests for useReducedMotion hook
 * Following TDD - tests written first
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Clear module cache and unmock the hook to test real implementation
vi.unmock("@/lib/hooks/use-reduced-motion");

// Import the real hook (not the mocked version from setup.tsx)
const { useReducedMotion } = await import("@/lib/hooks/use-reduced-motion");

describe("useReducedMotion", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matchMediaMock = vi.fn();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false when user prefers motion", () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it("returns true when user prefers reduced motion", () => {
    matchMediaMock.mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it("queries the correct media feature", () => {
    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    renderHook(() => useReducedMotion());

    expect(matchMediaMock).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });

  it("listens for changes to preference", () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();

    matchMediaMock.mockReturnValue({
      matches: false,
      addEventListener,
      removeEventListener,
    });

    const { unmount } = renderHook(() => useReducedMotion());

    expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("returns false during SSR (no window.matchMedia)", () => {
    matchMediaMock.mockImplementation(() => {
      throw new Error("matchMedia not available");
    });

    // The hook should catch the error and return false
    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });
});
