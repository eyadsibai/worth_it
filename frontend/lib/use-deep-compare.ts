import { useRef, useEffect } from "react";

/**
 * Deep comparison utility that works with React hooks
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== "object") return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * Custom hook for deep comparison of dependencies
 * Returns a stable reference when dependencies haven't deeply changed
 */
export function useDeepCompareMemo<T>(value: T): T {
  const ref = useRef<T>(value);
  
  // eslint-disable-next-line react-hooks/refs
  if (!deepEqual(ref.current, value)) {
    // eslint-disable-next-line react-hooks/refs
    ref.current = value;
  }
  
  // eslint-disable-next-line react-hooks/refs
  return ref.current;
}

/**
 * Custom hook similar to useEffect but with deep comparison of dependencies
 */
export function useDeepCompareEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList | undefined
) {
  const stableDeps = useDeepCompareMemo(deps);
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, stableDeps);
}