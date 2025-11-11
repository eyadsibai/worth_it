import { useRef, useEffect } from "react";

/**
 * Deep comparison utility that works with React hooks
 */
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
  
  if (!deepEqual(ref.current, value)) {
    ref.current = value;
  }
  
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
  
  useEffect(effect, stableDeps);
}