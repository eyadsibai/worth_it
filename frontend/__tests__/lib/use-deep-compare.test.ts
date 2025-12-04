/**
 * Tests for useDeepCompare hooks
 * Tests the deepEqual utility and the custom hooks for deep comparison
 */
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDeepCompareMemo, useDeepCompareEffect } from "@/lib/use-deep-compare";

// =============================================================================
// useDeepCompareMemo Tests
// =============================================================================

describe("useDeepCompareMemo", () => {
  it("returns the same reference when values are deeply equal", () => {
    const initialValue = { a: 1, b: { c: 2 } };
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: initialValue } }
    );

    const firstRef = result.current;

    // Rerender with a new object that has the same structure
    rerender({ value: { a: 1, b: { c: 2 } } });

    // Should return the same reference because values are deeply equal
    expect(result.current).toBe(firstRef);
  });

  it("returns a new reference when values change", () => {
    const initialValue = { a: 1, b: { c: 2 } };
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: initialValue } }
    );

    const firstRef = result.current;

    // Rerender with different value
    rerender({ value: { a: 1, b: { c: 3 } } }); // c changed from 2 to 3

    // Should return a new reference because value changed
    expect(result.current).not.toBe(firstRef);
    expect(result.current).toEqual({ a: 1, b: { c: 3 } });
  });

  it("handles primitive values", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: 42 } }
    );

    expect(result.current).toBe(42);

    // Same value
    rerender({ value: 42 });
    expect(result.current).toBe(42);

    // Different value
    rerender({ value: 100 });
    expect(result.current).toBe(100);
  });

  it("handles null and undefined", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: null as unknown } }
    );

    expect(result.current).toBe(null);

    rerender({ value: undefined });
    expect(result.current).toBe(undefined);

    rerender({ value: null });
    expect(result.current).toBe(null);
  });

  it("handles arrays", () => {
    const initialValue = [1, 2, { a: 3 }];
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: initialValue } }
    );

    const firstRef = result.current;

    // Same array content
    rerender({ value: [1, 2, { a: 3 }] });
    expect(result.current).toBe(firstRef);

    // Different array content
    rerender({ value: [1, 2, { a: 4 }] });
    expect(result.current).not.toBe(firstRef);
  });

  it("handles empty objects", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: {} } }
    );

    const firstRef = result.current;

    rerender({ value: {} });
    expect(result.current).toBe(firstRef);

    rerender({ value: { newKey: "value" } });
    expect(result.current).not.toBe(firstRef);
  });

  it("detects key count differences", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: { a: 1, b: 2 } as Record<string, number> } }
    );

    const firstRef = result.current;

    // Different number of keys
    rerender({ value: { a: 1 } });
    expect(result.current).not.toBe(firstRef);
  });

  it("detects different key names", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: { a: 1 } as Record<string, number> } }
    );

    const firstRef = result.current;

    // Different key name
    rerender({ value: { b: 1 } });
    expect(result.current).not.toBe(firstRef);
  });
});

// =============================================================================
// useDeepCompareEffect Tests
// =============================================================================

describe("useDeepCompareEffect", () => {
  it("runs effect on initial render", () => {
    const effect = vi.fn();

    renderHook(() => useDeepCompareEffect(effect, [{ a: 1 }]));

    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("does not re-run effect when dependencies are deeply equal", () => {
    const effect = vi.fn();
    const { rerender } = renderHook(
      ({ deps }) => useDeepCompareEffect(effect, deps),
      { initialProps: { deps: [{ a: 1, b: { c: 2 } }] } }
    );

    expect(effect).toHaveBeenCalledTimes(1);

    // Rerender with deeply equal deps (new object reference, same values)
    rerender({ deps: [{ a: 1, b: { c: 2 } }] });

    // Effect should NOT re-run
    expect(effect).toHaveBeenCalledTimes(1);
  });

  it("re-runs effect when dependencies change", () => {
    const effect = vi.fn();
    const { rerender } = renderHook(
      ({ deps }) => useDeepCompareEffect(effect, deps),
      { initialProps: { deps: [{ a: 1 }] } }
    );

    expect(effect).toHaveBeenCalledTimes(1);

    // Rerender with different deps
    rerender({ deps: [{ a: 2 }] });

    // Effect should re-run
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it("calls cleanup function when dependencies change", () => {
    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);

    const { rerender } = renderHook(
      ({ deps }) => useDeepCompareEffect(effect, deps),
      { initialProps: { deps: [{ value: 1 }] } }
    );

    expect(effect).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    // Change deps - should trigger cleanup from previous effect
    rerender({ deps: [{ value: 2 }] });

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it("calls cleanup function on unmount", () => {
    const cleanup = vi.fn();
    const effect = vi.fn(() => cleanup);

    const { unmount } = renderHook(() =>
      useDeepCompareEffect(effect, [{ a: 1 }])
    );

    expect(cleanup).not.toHaveBeenCalled();

    unmount();

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("handles multiple dependencies", () => {
    const effect = vi.fn();
    const { rerender } = renderHook(
      ({ deps }) => useDeepCompareEffect(effect, deps),
      { initialProps: { deps: [{ a: 1 }, { b: 2 }, "string"] } }
    );

    expect(effect).toHaveBeenCalledTimes(1);

    // Same deps
    rerender({ deps: [{ a: 1 }, { b: 2 }, "string"] });
    expect(effect).toHaveBeenCalledTimes(1);

    // One dep changed
    rerender({ deps: [{ a: 1 }, { b: 3 }, "string"] });
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it("handles undefined deps (runs on every render)", () => {
    const effect = vi.fn();
    const { rerender } = renderHook(
      ({ deps }) => useDeepCompareEffect(effect, deps),
      { initialProps: { deps: undefined as React.DependencyList | undefined } }
    );

    expect(effect).toHaveBeenCalledTimes(1);

    rerender({ deps: undefined });
    // With undefined deps, useEffect runs on every render
    // The deep compare memoizes undefined === undefined, but useEffect
    // with the same deps reference still re-runs on rerender
    expect(effect).toHaveBeenCalledTimes(2);
  });

  it("handles empty dependency array", () => {
    const effect = vi.fn();
    const { rerender } = renderHook(
      ({ deps }) => useDeepCompareEffect(effect, deps),
      { initialProps: { deps: [] as React.DependencyList } }
    );

    expect(effect).toHaveBeenCalledTimes(1);

    rerender({ deps: [] });
    expect(effect).toHaveBeenCalledTimes(1);
  });
});

// =============================================================================
// Deep Equal Edge Cases (tested through the hooks)
// =============================================================================

describe("Deep equality edge cases", () => {
  it("handles comparing different types", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: { a: 1 } as unknown } }
    );

    const firstRef = result.current;

    // Different type (object vs string)
    rerender({ value: "string" });
    expect(result.current).not.toBe(firstRef);
    expect(result.current).toBe("string");
  });

  it("handles comparing object with null", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: { a: 1 } as unknown } }
    );

    const firstRef = result.current;

    rerender({ value: null });
    expect(result.current).not.toBe(firstRef);
    expect(result.current).toBe(null);
  });

  it("handles deeply nested objects", () => {
    const deepObject = {
      level1: {
        level2: {
          level3: {
            level4: {
              value: "deep",
            },
          },
        },
      },
    };

    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: deepObject } }
    );

    const firstRef = result.current;

    // Same deep structure
    rerender({
      value: {
        level1: {
          level2: {
            level3: {
              level4: {
                value: "deep",
              },
            },
          },
        },
      },
    });
    expect(result.current).toBe(firstRef);

    // Change at deep level
    rerender({
      value: {
        level1: {
          level2: {
            level3: {
              level4: {
                value: "changed",
              },
            },
          },
        },
      },
    });
    expect(result.current).not.toBe(firstRef);
  });

  it("handles arrays with nested objects", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: [{ items: [1, 2, 3] }, { items: [4, 5, 6] }] } }
    );

    const firstRef = result.current;

    // Same structure
    rerender({ value: [{ items: [1, 2, 3] }, { items: [4, 5, 6] }] });
    expect(result.current).toBe(firstRef);

    // Different nested array
    rerender({ value: [{ items: [1, 2, 99] }, { items: [4, 5, 6] }] });
    expect(result.current).not.toBe(firstRef);
  });
});
