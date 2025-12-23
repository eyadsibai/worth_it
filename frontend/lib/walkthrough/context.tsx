"use client";

import * as React from "react";
import type { Tour, TourProgress, TourState } from "./types";
import { DEFAULT_TOUR_PROGRESS } from "./types";
import { tours } from "./tours";

const STORAGE_KEY = "worth_it_tour_progress";

interface WalkthroughContextValue extends TourState {
  /** Start a specific tour by ID */
  startTour: (tourId: string) => void;
  /** Go to the next step in the current tour */
  nextStep: () => void;
  /** Go to the previous step in the current tour */
  prevStep: () => void;
  /** Skip (close) the current tour without completing */
  skipTour: () => void;
  /** Complete the current tour */
  completeTour: () => void;
  /** Reset all tour progress */
  resetProgress: () => void;
  /** Dismiss all tours permanently */
  dismissAll: () => void;
  /** Check if a tour has been completed */
  isTourCompleted: (tourId: string) => boolean;
  /** Get available (not yet completed) tours */
  availableTours: Tour[];
}

const WalkthroughContext = React.createContext<WalkthroughContextValue | null>(null);

function loadProgress(): TourProgress {
  if (typeof window === "undefined") return DEFAULT_TOUR_PROGRESS;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as TourProgress;
    }
  } catch {
    // Ignore parsing errors
  }
  return DEFAULT_TOUR_PROGRESS;
}

function saveProgress(progress: TourProgress): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage errors
  }
}

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<TourState>({
    activeTour: null,
    currentStep: 0,
    isRunning: false,
    progress: DEFAULT_TOUR_PROGRESS,
  });

  // Load progress from localStorage on mount
  React.useEffect(() => {
    const progress = loadProgress();
    setState((prev) => ({ ...prev, progress }));
  }, []);

  // Save progress when it changes
  React.useEffect(() => {
    saveProgress(state.progress);
  }, [state.progress]);

  const startTour = React.useCallback((tourId: string) => {
    const tour = tours[tourId];
    if (!tour) {
      console.warn(`Tour "${tourId}" not found`);
      return;
    }

    setState((prev) => {
      // Check prerequisites using current state
      if (tour.prerequisites) {
        const unmetPrereqs = tour.prerequisites.filter(
          (prereqId) => !prev.progress.completed[prereqId]
        );
        if (unmetPrereqs.length > 0) {
          console.warn(`Tour "${tourId}" requires completing: ${unmetPrereqs.join(", ")}`);
          // Note: Can't recursively call startTour here, so just return unchanged
          // The UI should handle showing prerequisites
          return prev;
        }
      }

      return {
        ...prev,
        activeTour: tour,
        currentStep: prev.progress.lastStep[tourId] || 0,
        isRunning: true,
      };
    });
  }, []);

  const nextStep = React.useCallback(() => {
    setState((prev) => {
      if (!prev.activeTour) return prev;

      const nextStepIndex = prev.currentStep + 1;
      if (nextStepIndex >= prev.activeTour.steps.length) {
        // Tour complete
        return {
          ...prev,
          activeTour: null,
          currentStep: 0,
          isRunning: false,
          progress: {
            ...prev.progress,
            completed: {
              ...prev.progress.completed,
              [prev.activeTour.id]: true,
            },
            lastStep: {
              ...prev.progress.lastStep,
              [prev.activeTour.id]: 0,
            },
          },
        };
      }

      return {
        ...prev,
        currentStep: nextStepIndex,
        progress: {
          ...prev.progress,
          lastStep: {
            ...prev.progress.lastStep,
            [prev.activeTour.id]: nextStepIndex,
          },
        },
      };
    });
  }, []);

  const prevStep = React.useCallback(() => {
    setState((prev) => {
      if (!prev.activeTour || prev.currentStep === 0) return prev;

      const prevStepIndex = prev.currentStep - 1;
      return {
        ...prev,
        currentStep: prevStepIndex,
        progress: {
          ...prev.progress,
          lastStep: {
            ...prev.progress.lastStep,
            [prev.activeTour.id]: prevStepIndex,
          },
        },
      };
    });
  }, []);

  const skipTour = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeTour: null,
      currentStep: 0,
      isRunning: false,
    }));
  }, []);

  const completeTour = React.useCallback(() => {
    setState((prev) => {
      if (!prev.activeTour) return prev;

      return {
        ...prev,
        activeTour: null,
        currentStep: 0,
        isRunning: false,
        progress: {
          ...prev.progress,
          completed: {
            ...prev.progress.completed,
            [prev.activeTour.id]: true,
          },
          lastStep: {
            ...prev.progress.lastStep,
            [prev.activeTour.id]: 0,
          },
        },
      };
    });
  }, []);

  const resetProgress = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      progress: DEFAULT_TOUR_PROGRESS,
    }));
  }, []);

  const dismissAll = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeTour: null,
      currentStep: 0,
      isRunning: false,
      progress: {
        ...prev.progress,
        dismissedAll: true,
      },
    }));
  }, []);

  const isTourCompleted = React.useCallback(
    (tourId: string) => state.progress.completed[tourId] ?? false,
    [state.progress.completed]
  );

  const availableTours = React.useMemo(() => {
    if (state.progress.dismissedAll) return [];

    return Object.values(tours).filter((tour) => {
      // Not completed
      if (state.progress.completed[tour.id]) return false;

      // Prerequisites met
      if (tour.prerequisites) {
        return tour.prerequisites.every((prereqId) => state.progress.completed[prereqId]);
      }

      return true;
    });
  }, [state.progress]);

  const value: WalkthroughContextValue = {
    ...state,
    startTour,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
    resetProgress,
    dismissAll,
    isTourCompleted,
    availableTours,
  };

  return <WalkthroughContext.Provider value={value}>{children}</WalkthroughContext.Provider>;
}

export function useWalkthrough() {
  const context = React.useContext(WalkthroughContext);
  if (!context) {
    throw new Error("useWalkthrough must be used within a WalkthroughProvider");
  }
  return context;
}
