/**
 * Tests for useDebounce hook
 * Tests the debouncing behavior for values
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/lib/hooks/use-debounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("does not update value before delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "updated" });

    // Value should still be initial before delay
    expect(result.current).toBe("initial");

    // Advance time but not enough
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current).toBe("initial");
  });

  it("updates value after delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "updated" });

    // Advance time past delay
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("updated");
  });

  it("uses default delay of 300ms", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "updated" });

    // Before default delay
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("initial");

    // After default delay
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("updated");
  });

  it("resets timer on rapid changes", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "initial" },
    });

    // First update
    rerender({ value: "first" });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Second update before delay completes - should reset timer
    rerender({ value: "second" });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Still should be initial because timer was reset
    expect(result.current).toBe("initial");

    // Complete the remaining delay
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Now should be the latest value
    expect(result.current).toBe("second");
  });

  it("handles number values", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 0 },
    });

    rerender({ value: 42 });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe(42);
  });

  it("handles object values", () => {
    const initialObj = { count: 0 };
    const updatedObj = { count: 1 };

    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: initialObj },
    });

    rerender({ value: updatedObj });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toEqual(updatedObj);
  });

  it("handles null and undefined", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "initial" as string | null | undefined },
    });

    rerender({ value: null });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(null);

    rerender({ value: undefined });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe(undefined);
  });

  it("cleans up timer on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

    const { unmount, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "updated" });
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it("handles different delay values", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "initial", delay: 500 },
    });

    rerender({ value: "updated", delay: 500 });

    // Before 500ms delay
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe("initial");

    // After 500ms delay
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current).toBe("updated");
  });

  it("handles zero delay", () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
      initialProps: { value: "initial" },
    });

    rerender({ value: "updated" });

    // With zero delay, should update after any timer tick
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe("updated");
  });

  it("handles changing delay values", () => {
    const { result, rerender } = renderHook(({ value, delay }) => useDebounce(value, delay), {
      initialProps: { value: "initial", delay: 300 },
    });

    // Change both value and delay
    rerender({ value: "updated", delay: 100 });

    // After new shorter delay
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("updated");
  });
});
