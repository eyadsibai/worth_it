/**
 * Tests for the custom deep comparison hook
 */

import { renderHook } from '@testing-library/react';
import { useDeepCompareMemo, useDeepCompareEffect } from '@/lib/use-deep-compare';

describe('useDeepCompareMemo', () => {
  it('should return the same reference for deeply equal objects', () => {
    const initialObj = { a: 1, b: { c: 2 } };
    
    const { result, rerender } = renderHook(
      ({ obj }) => useDeepCompareMemo(obj),
      { initialProps: { obj: initialObj } }
    );

    const firstResult = result.current;

    // Re-render with a different reference but same content
    rerender({ obj: { a: 1, b: { c: 2 } } });

    // Should return the same reference
    expect(result.current).toBe(firstResult);
  });

  it('should return a new reference when content changes', () => {
    const initialObj = { a: 1, b: { c: 2 } };
    
    const { result, rerender } = renderHook(
      ({ obj }) => useDeepCompareMemo(obj),
      { initialProps: { obj: initialObj } }
    );

    const firstResult = result.current;

    // Re-render with different content
    rerender({ obj: { a: 1, b: { c: 3 } } });

    // Should return a new reference
    expect(result.current).not.toBe(firstResult);
    expect(result.current).toEqual({ a: 1, b: { c: 3 } });
  });

  it('should handle primitive values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDeepCompareMemo(value),
      { initialProps: { value: 'hello' } }
    );

    const firstResult = result.current;
    rerender({ value: 'hello' });

    expect(result.current).toBe(firstResult);
  });

  it('should handle arrays', () => {
    const initialArray = [1, 2, { a: 3 }];
    
    const { result, rerender } = renderHook(
      ({ arr }) => useDeepCompareMemo(arr),
      { initialProps: { arr: initialArray } }
    );

    const firstResult = result.current;
    rerender({ arr: [1, 2, { a: 3 }] });

    expect(result.current).toBe(firstResult);
  });
});

describe('useDeepCompareEffect', () => {
  it('should not re-run effect when dependencies are deeply equal', () => {
    const effectFn = jest.fn();
    const deps = { a: 1, b: { c: 2 } };
    
    const { rerender } = renderHook(
      ({ dependencies }) => useDeepCompareEffect(effectFn, [dependencies]),
      { initialProps: { dependencies: deps } }
    );

    expect(effectFn).toHaveBeenCalledTimes(1);

    // Re-render with different reference but same content
    rerender({ dependencies: { a: 1, b: { c: 2 } } });

    // Effect should not run again
    expect(effectFn).toHaveBeenCalledTimes(1);
  });

  it('should re-run effect when dependencies change deeply', () => {
    const effectFn = jest.fn();
    const deps = { a: 1, b: { c: 2 } };
    
    const { rerender } = renderHook(
      ({ dependencies }) => useDeepCompareEffect(effectFn, [dependencies]),
      { initialProps: { dependencies: deps } }
    );

    expect(effectFn).toHaveBeenCalledTimes(1);

    // Re-render with different content
    rerender({ dependencies: { a: 1, b: { c: 3 } } });

    // Effect should run again
    expect(effectFn).toHaveBeenCalledTimes(2);
  });

  it('should handle cleanup function', () => {
    const cleanupFn = jest.fn();
    const effectFn = jest.fn(() => cleanupFn);
    const deps = { a: 1 };
    
    const { rerender, unmount } = renderHook(
      ({ dependencies }) => useDeepCompareEffect(effectFn, [dependencies]),
      { initialProps: { dependencies: deps } }
    );

    expect(effectFn).toHaveBeenCalledTimes(1);
    expect(cleanupFn).not.toHaveBeenCalled();

    // Re-render with different deps
    rerender({ dependencies: { a: 2 } });

    expect(cleanupFn).toHaveBeenCalledTimes(1);
    expect(effectFn).toHaveBeenCalledTimes(2);

    unmount();
    expect(cleanupFn).toHaveBeenCalledTimes(2);
  });
});