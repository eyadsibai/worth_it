"use client";

import * as React from "react";

/**
 * Mobile view types for tabbed navigation.
 * - "inputs": Shows the forms column (Global Settings, Current Job, Startup Offer)
 * - "results": Shows the results column (Scenario Results, Monte Carlo, Sensitivity)
 */
export type MobileView = "inputs" | "results";

interface MobileViewContextValue {
  /** Currently active view on mobile */
  activeView: MobileView;
  /** Set the active view */
  setActiveView: (view: MobileView) => void;
  /** Whether calculations are running (for Results badge) */
  isCalculating: boolean;
  /** Set calculation state */
  setIsCalculating: (calculating: boolean) => void;
  /** Whether results are outdated (form changed since last calculation) */
  hasOutdatedResults: boolean;
  /** Set outdated state */
  setHasOutdatedResults: (outdated: boolean) => void;
}

const MobileViewContext = React.createContext<MobileViewContextValue | null>(null);

interface MobileViewProviderProps {
  children: React.ReactNode;
  /** Initial view to show (defaults to "inputs") */
  defaultView?: MobileView;
}

/**
 * Provider for mobile view state.
 * Wraps content that needs access to mobile view toggling.
 */
export function MobileViewProvider({
  children,
  defaultView = "inputs",
}: MobileViewProviderProps) {
  const [activeView, setActiveView] = React.useState<MobileView>(defaultView);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const [hasOutdatedResults, setHasOutdatedResults] = React.useState(false);

  const value = React.useMemo(
    () => ({
      activeView,
      setActiveView,
      isCalculating,
      setIsCalculating,
      hasOutdatedResults,
      setHasOutdatedResults,
    }),
    [activeView, isCalculating, hasOutdatedResults]
  );

  return (
    <MobileViewContext.Provider value={value}>
      {children}
    </MobileViewContext.Provider>
  );
}

/**
 * Hook to access mobile view state.
 * Must be used within a MobileViewProvider.
 *
 * @throws Error if used outside of MobileViewProvider
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { activeView, setActiveView, isCalculating } = useMobileView();
 *
 *   return (
 *     <button onClick={() => setActiveView("results")}>
 *       View Results {isCalculating && <Spinner />}
 *     </button>
 *   );
 * }
 * ```
 */
export function useMobileView(): MobileViewContextValue {
  const context = React.useContext(MobileViewContext);
  if (!context) {
    throw new Error("useMobileView must be used within a MobileViewProvider");
  }
  return context;
}

/**
 * Hook to safely access mobile view state.
 * Returns null if used outside of MobileViewProvider (no error thrown).
 * Useful for components that may or may not be within the provider.
 */
export function useMobileViewSafe(): MobileViewContextValue | null {
  return React.useContext(MobileViewContext);
}
