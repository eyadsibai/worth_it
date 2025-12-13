/**
 * Zustand store for global application state
 *
 * This store manages:
 * - App mode (employee/founder)
 * - Employee mode form state
 * - Founder mode cap table state
 * - Results state (Monte Carlo, scenario comparisons)
 *
 * Server state (API responses) is still managed by TanStack Query.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  GlobalSettingsForm,
  CurrentJobForm,
  RSUForm,
  StockOptionsForm,
  CapTable,
  FundingInstrument,
  PreferenceTier,
} from "@/lib/schemas";
import type { ScenarioData } from "@/lib/export-utils";
import { getExampleById } from "@/lib/constants/examples";

export type AppMode = "employee" | "founder";

interface MonteCarloResults {
  net_outcomes: number[];
  simulated_valuations: number[];
}

interface AppState {
  // App Mode
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;

  // Command Palette State
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Employee Mode - Form State
  globalSettings: GlobalSettingsForm | null;
  currentJob: CurrentJobForm | null;
  equityDetails: RSUForm | StockOptionsForm | null;
  setGlobalSettings: (data: GlobalSettingsForm) => void;
  setCurrentJob: (data: CurrentJobForm) => void;
  setEquityDetails: (data: RSUForm | StockOptionsForm) => void;

  // Founder Mode - Cap Table State
  capTable: CapTable;
  instruments: FundingInstrument[];
  preferenceTiers: PreferenceTier[];
  setCapTable: (data: CapTable) => void;
  setInstruments: (data: FundingInstrument[]) => void;
  setPreferenceTiers: (data: PreferenceTier[]) => void;

  // Results State
  monteCarloResults: MonteCarloResults | null;
  comparisonScenarios: ScenarioData[];
  setMonteCarloResults: (results: MonteCarloResults | null) => void;
  setComparisonScenarios: (scenarios: ScenarioData[]) => void;
  clearComparisonScenarios: () => void;

  // Example Loading
  loadExample: (exampleId: string) => boolean;

  // Derived State Helpers
  hasEmployeeFormData: () => boolean;
}

const initialCapTable: CapTable = {
  stakeholders: [],
  total_shares: 10000000,
  option_pool_pct: 10,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // App Mode
      appMode: "employee",
      setAppMode: (mode) => set({ appMode: mode }),

      // Command Palette State
      commandPaletteOpen: false,
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      // Employee Mode - Form State
      globalSettings: null,
      currentJob: null,
      equityDetails: null,
      setGlobalSettings: (data) => set({ globalSettings: data }),
      setCurrentJob: (data) => set({ currentJob: data }),
      setEquityDetails: (data) => set({ equityDetails: data }),

      // Founder Mode - Cap Table State
      capTable: initialCapTable,
      instruments: [],
      preferenceTiers: [],
      setCapTable: (data) => set({ capTable: data }),
      setInstruments: (data) => set({ instruments: data }),
      setPreferenceTiers: (data) => set({ preferenceTiers: data }),

      // Results State
      monteCarloResults: null,
      comparisonScenarios: [],
      setMonteCarloResults: (results) => set({ monteCarloResults: results }),
      setComparisonScenarios: (scenarios) => set({ comparisonScenarios: scenarios }),
      clearComparisonScenarios: () => set({ comparisonScenarios: [] }),

      // Example Loading
      loadExample: (exampleId) => {
        const example = getExampleById(exampleId);
        if (!example) return false;

        // Atomically update all form state and clear results
        set({
          globalSettings: example.globalSettings,
          currentJob: example.currentJob,
          equityDetails: example.equityDetails,
          monteCarloResults: null,
        });
        return true;
      },

      // Derived State Helpers
      hasEmployeeFormData: () => {
        const state = get();
        return !!(state.globalSettings && state.currentJob && state.equityDetails);
      },
    }),
    {
      name: "worth-it-app-state",
      // Only persist founder mode state and app mode preference
      partialize: (state) => ({
        appMode: state.appMode,
        capTable: state.capTable,
        instruments: state.instruments,
        preferenceTiers: state.preferenceTiers,
      }),
    }
  )
);

// Selector hooks for better performance (avoid unnecessary re-renders)
export const useAppMode = () => useAppStore((state) => state.appMode);
export const useCapTable = () => useAppStore((state) => state.capTable);
export const useInstruments = () => useAppStore((state) => state.instruments);
export const usePreferenceTiers = () => useAppStore((state) => state.preferenceTiers);
export const useComparisonScenarios = () => useAppStore((state) => state.comparisonScenarios);
export const useCommandPaletteOpen = () => useAppStore((state) => state.commandPaletteOpen);
export const useSetCommandPaletteOpen = () => useAppStore((state) => state.setCommandPaletteOpen);
