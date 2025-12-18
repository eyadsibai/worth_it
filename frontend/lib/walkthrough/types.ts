import type { SpotlightStep } from "@/components/walkthrough/spotlight";

export interface Tour {
  /** Unique identifier for the tour */
  id: string;
  /** Display name for the tour */
  name: string;
  /** Brief description of what this tour covers */
  description: string;
  /** The steps in this tour */
  steps: SpotlightStep[];
  /** Optional prerequisite tours that should be completed first */
  prerequisites?: string[];
}

export interface TourProgress {
  /** Map of tour IDs to completion status */
  completed: Record<string, boolean>;
  /** Map of tour IDs to the last completed step index */
  lastStep: Record<string, number>;
  /** Whether the user has dismissed all tours permanently */
  dismissedAll: boolean;
}

export interface TourState {
  /** Currently active tour, if any */
  activeTour: Tour | null;
  /** Current step index in the active tour */
  currentStep: number;
  /** Whether a tour is currently running */
  isRunning: boolean;
  /** User's progress across all tours */
  progress: TourProgress;
}

export const DEFAULT_TOUR_PROGRESS: TourProgress = {
  completed: {},
  lastStep: {},
  dismissedAll: false,
};
