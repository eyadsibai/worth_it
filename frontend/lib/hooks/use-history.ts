/**
 * History Store for Undo/Redo functionality
 *
 * This store maintains a temporal history of state changes, allowing users
 * to undo and redo actions. It uses a circular buffer pattern to limit
 * memory usage.
 *
 * Usage:
 * 1. Call pushState() whenever you want to save a state snapshot
 * 2. Call undo() to restore the previous state
 * 3. Call redo() to restore the next state (after undo)
 */

import { create } from "zustand";

export interface HistoryEntry<T = unknown> {
  state: T;
  label: string;
  timestamp: number;
}

interface HistoryState {
  past: HistoryEntry[];
  present: unknown | null;
  presentLabel: string | null;
  future: HistoryEntry[];
  maxSize: number;

  // Actions
  pushState: (state: unknown, label: string) => void;
  undo: () => unknown | null;
  redo: () => unknown | null;
  clear: () => void;

  // Selectors
  canUndo: () => boolean;
  canRedo: () => boolean;
  getUndoLabel: () => string | null;
  getRedoLabel: () => string | null;
}

const DEFAULT_MAX_SIZE = 50;

export const createHistoryStore = (maxSize = DEFAULT_MAX_SIZE) => {
  return create<HistoryState>((set, get) => ({
    past: [],
    present: null,
    presentLabel: null,
    future: [],
    maxSize,

    pushState: (state, label) => {
      const { present, presentLabel, past, maxSize } = get();

      // If we have a current state, move it to past
      const newPast =
        present !== null
          ? [
              ...past,
              {
                state: present,
                label: presentLabel || "",
                timestamp: Date.now(),
              },
            ].slice(-maxSize + 1) // Keep only maxSize-1 items
          : past;

      set({
        past: newPast,
        present: state,
        presentLabel: label,
        future: [], // Clear future when new state is pushed
      });
    },

    undo: () => {
      const { past, present, presentLabel, future } = get();

      if (past.length === 0) {
        return null;
      }

      const previous = past[past.length - 1];
      const newPast = past.slice(0, -1);

      // Move current to future
      const newFuture =
        present !== null
          ? [
              {
                state: present,
                label: presentLabel || "",
                timestamp: Date.now(),
              },
              ...future,
            ]
          : future;

      set({
        past: newPast,
        present: previous.state,
        presentLabel: previous.label,
        future: newFuture,
      });

      return previous.state;
    },

    redo: () => {
      const { past, present, presentLabel, future } = get();

      if (future.length === 0) {
        return null;
      }

      const next = future[0];
      const newFuture = future.slice(1);

      // Move current to past
      const newPast =
        present !== null
          ? [
              ...past,
              {
                state: present,
                label: presentLabel || "",
                timestamp: Date.now(),
              },
            ]
          : past;

      set({
        past: newPast,
        present: next.state,
        presentLabel: next.label,
        future: newFuture,
      });

      return next.state;
    },

    clear: () => {
      set({
        past: [],
        present: null,
        presentLabel: null,
        future: [],
      });
    },

    canUndo: () => {
      return get().past.length > 0;
    },

    canRedo: () => {
      return get().future.length > 0;
    },

    getUndoLabel: () => {
      const { presentLabel } = get();
      return presentLabel;
    },

    getRedoLabel: () => {
      const { future } = get();
      if (future.length === 0) return null;
      return future[0].label;
    },
  }));
};

// Default singleton store for the app
export const useHistoryStore = createHistoryStore(DEFAULT_MAX_SIZE);
