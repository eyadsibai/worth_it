/**
 * Cap Table History Hook
 *
 * Wraps cap table state changes with undo/redo functionality.
 * Tracks changes to cap table, instruments, and preference tiers.
 */

import { useCallback, useEffect, useRef } from "react";
import { useHistoryStore } from "./use-history";
import { useUndoShortcuts } from "./use-undo-shortcuts";
import type { CapTable, FundingInstrument, PreferenceTier } from "@/lib/schemas";
import { toast } from "sonner";

export interface CapTableState {
  capTable: CapTable;
  instruments: FundingInstrument[];
  preferenceTiers: PreferenceTier[];
}

interface UseCapTableHistoryOptions {
  capTable: CapTable;
  instruments: FundingInstrument[];
  preferenceTiers: PreferenceTier[];
  onCapTableChange: (capTable: CapTable) => void;
  onInstrumentsChange: (instruments: FundingInstrument[]) => void;
  onPreferenceTiersChange: (tiers: PreferenceTier[]) => void;
}

interface UseCapTableHistoryReturn {
  // Wrapped setters that track history
  setCapTable: (capTable: CapTable, label?: string) => void;
  setInstruments: (instruments: FundingInstrument[], label?: string) => void;
  setPreferenceTiers: (tiers: PreferenceTier[], label?: string) => void;

  // Batch setter for loading scenarios (single history entry)
  setAll: (state: CapTableState, label?: string) => void;

  // Undo/Redo controls
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;

  // Clear history
  clearHistory: () => void;
}

export function useCapTableHistory({
  capTable,
  instruments,
  preferenceTiers,
  onCapTableChange,
  onInstrumentsChange,
  onPreferenceTiersChange,
}: UseCapTableHistoryOptions): UseCapTableHistoryReturn {
  const historyStore = useHistoryStore();
  const isRestoringRef = useRef(false);
  const initializedRef = useRef(false);

  // Subscribe to reactive state using selectors for proper reactivity
  const canUndo = useHistoryStore((state) => state.past.length > 0);
  const canRedo = useHistoryStore((state) => state.future.length > 0);
  const undoLabel = useHistoryStore((state) => state.presentLabel);
  const redoLabel = useHistoryStore((state) =>
    state.future.length > 0 ? state.future[0]?.label ?? null : null
  );

  // Initialize history with current state (only once)
  useEffect(() => {
    if (!initializedRef.current && capTable.stakeholders.length > 0) {
      historyStore.pushState(
        { capTable, instruments, preferenceTiers },
        "Initial state"
      );
      initializedRef.current = true;
    }
  }, [capTable, instruments, preferenceTiers, historyStore]);

  // Create wrapped setters that track history
  const setCapTable = useCallback(
    (newCapTable: CapTable, label = "Update cap table") => {
      if (isRestoringRef.current) return;

      const currentState: CapTableState = {
        capTable: newCapTable,
        instruments,
        preferenceTiers,
      };
      historyStore.pushState(currentState, label);
      onCapTableChange(newCapTable);
    },
    [instruments, preferenceTiers, onCapTableChange, historyStore]
  );

  const setInstruments = useCallback(
    (newInstruments: FundingInstrument[], label = "Update instruments") => {
      if (isRestoringRef.current) return;

      const currentState: CapTableState = {
        capTable,
        instruments: newInstruments,
        preferenceTiers,
      };
      historyStore.pushState(currentState, label);
      onInstrumentsChange(newInstruments);
    },
    [capTable, preferenceTiers, onInstrumentsChange, historyStore]
  );

  const setPreferenceTiers = useCallback(
    (newTiers: PreferenceTier[], label = "Update preference tiers") => {
      if (isRestoringRef.current) return;

      const currentState: CapTableState = {
        capTable,
        instruments,
        preferenceTiers: newTiers,
      };
      historyStore.pushState(currentState, label);
      onPreferenceTiersChange(newTiers);
    },
    [capTable, instruments, onPreferenceTiersChange, historyStore]
  );

  // Batch setter for updating all state at once (single history entry)
  const setAll = useCallback(
    (newState: CapTableState, label = "Load scenario") => {
      if (isRestoringRef.current) return;

      historyStore.pushState(newState, label);
      onCapTableChange(newState.capTable);
      onInstrumentsChange(newState.instruments);
      onPreferenceTiersChange(newState.preferenceTiers);
    },
    [historyStore, onCapTableChange, onInstrumentsChange, onPreferenceTiersChange]
  );

  // Undo action
  const undo = useCallback(() => {
    const previousState = historyStore.undo() as CapTableState | null;
    if (!previousState) return;

    isRestoringRef.current = true;
    onCapTableChange(previousState.capTable);
    onInstrumentsChange(previousState.instruments);
    onPreferenceTiersChange(previousState.preferenceTiers);
    isRestoringRef.current = false;

    toast.info("Undone", {
      description: historyStore.getRedoLabel() || "Previous state restored",
      duration: 2000,
    });
  }, [historyStore, onCapTableChange, onInstrumentsChange, onPreferenceTiersChange]);

  // Redo action
  const redo = useCallback(() => {
    const nextState = historyStore.redo() as CapTableState | null;
    if (!nextState) return;

    isRestoringRef.current = true;
    onCapTableChange(nextState.capTable);
    onInstrumentsChange(nextState.instruments);
    onPreferenceTiersChange(nextState.preferenceTiers);
    isRestoringRef.current = false;

    toast.info("Redone", {
      description: historyStore.getUndoLabel() || "State restored",
      duration: 2000,
    });
  }, [historyStore, onCapTableChange, onInstrumentsChange, onPreferenceTiersChange]);

  // Register keyboard shortcuts
  useUndoShortcuts({
    onUndo: undo,
    onRedo: redo,
    enabled: true,
  });

  return {
    setCapTable,
    setInstruments,
    setPreferenceTiers,
    setAll,
    undo,
    redo,
    // These values are now reactive via Zustand selectors defined above
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
    clearHistory: historyStore.clear,
  };
}
