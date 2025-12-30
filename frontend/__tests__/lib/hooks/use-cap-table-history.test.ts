import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCapTableHistory, type CapTableState } from "@/lib/hooks/use-cap-table-history";
import { useHistoryStore } from "@/lib/hooks/use-history";
import type { CapTable, FundingInstrument, PreferenceTier } from "@/lib/schemas";

// Helper to wait for all effects to settle after rendering hooks
// This prevents "not wrapped in act(...)" warnings from async state updates
const waitForEffects = async () => {
  await waitFor(() => {});
};

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
  },
}));

// Mock the undo shortcuts hook to avoid side effects
vi.mock("@/lib/hooks/use-undo-shortcuts", () => ({
  useUndoShortcuts: vi.fn(),
}));

describe("useCapTableHistory", () => {
  const mockOnCapTableChange = vi.fn();
  const mockOnInstrumentsChange = vi.fn();
  const mockOnPreferenceTiersChange = vi.fn();

  const createMockCapTable = (stakeholderCount: number = 1): CapTable => ({
    stakeholders: Array.from({ length: stakeholderCount }, (_, i) => ({
      id: `stakeholder-${i}`,
      name: `Stakeholder ${i}`,
      type: "founder" as const,
      shares: 1000000,
      ownership_pct: 100 / stakeholderCount,
      share_class: "common" as const,
    })),
    total_shares: 10000000,
    option_pool_pct: 10,
  });

  const createMockInstruments = (): FundingInstrument[] => [];
  const createMockPreferenceTiers = (): PreferenceTier[] => [];

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear history store before each test
    useHistoryStore.getState().clear();
  });

  afterEach(() => {
    useHistoryStore.getState().clear();
  });

  describe("initialization", () => {
    it("returns all expected properties", async () => {
      const { result } = renderHook(() =>
        useCapTableHistory({
          capTable: createMockCapTable(),
          instruments: createMockInstruments(),
          preferenceTiers: createMockPreferenceTiers(),
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      expect(result.current).toHaveProperty("setCapTable");
      expect(result.current).toHaveProperty("setInstruments");
      expect(result.current).toHaveProperty("setPreferenceTiers");
      expect(result.current).toHaveProperty("setAll");
      expect(result.current).toHaveProperty("undo");
      expect(result.current).toHaveProperty("redo");
      expect(result.current).toHaveProperty("canUndo");
      expect(result.current).toHaveProperty("canRedo");
      expect(result.current).toHaveProperty("undoLabel");
      expect(result.current).toHaveProperty("redoLabel");
      expect(result.current).toHaveProperty("clearHistory");
    });

    it("initializes history with current state", async () => {
      const capTable = createMockCapTable();
      const instruments = createMockInstruments();
      const preferenceTiers = createMockPreferenceTiers();

      renderHook(() =>
        useCapTableHistory({
          capTable,
          instruments,
          preferenceTiers,
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      // After initialization, we should have one state in history
      const historyState = useHistoryStore.getState();
      expect(historyState.present).toBeDefined();
    });
  });

  describe("setCapTable", () => {
    it("calls onCapTableChange and records history", async () => {
      const initialCapTable = createMockCapTable(1);
      const updatedCapTable = createMockCapTable(2);

      const { result } = renderHook(() =>
        useCapTableHistory({
          capTable: initialCapTable,
          instruments: createMockInstruments(),
          preferenceTiers: createMockPreferenceTiers(),
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      act(() => {
        result.current.setCapTable(updatedCapTable, "Add stakeholder");
      });

      expect(mockOnCapTableChange).toHaveBeenCalledWith(updatedCapTable);
    });

    it("uses default label when none provided", async () => {
      const { result } = renderHook(() =>
        useCapTableHistory({
          capTable: createMockCapTable(),
          instruments: createMockInstruments(),
          preferenceTiers: createMockPreferenceTiers(),
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      act(() => {
        result.current.setCapTable(createMockCapTable(2));
      });

      expect(mockOnCapTableChange).toHaveBeenCalled();
    });
  });

  describe("setInstruments", () => {
    it("calls onInstrumentsChange and records history", async () => {
      const newInstruments: FundingInstrument[] = [
        {
          id: "safe-1",
          type: "SAFE",
          investor_name: "Angel Investor",
          investment_amount: 500000,
          valuation_cap: 5000000,
          status: "outstanding",
          pro_rata_rights: false,
          mfn_clause: false,
        },
      ];

      const { result } = renderHook(() =>
        useCapTableHistory({
          capTable: createMockCapTable(),
          instruments: createMockInstruments(),
          preferenceTiers: createMockPreferenceTiers(),
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      act(() => {
        result.current.setInstruments(newInstruments, "Add SAFE");
      });

      expect(mockOnInstrumentsChange).toHaveBeenCalledWith(newInstruments);
    });
  });

  describe("setPreferenceTiers", () => {
    it("calls onPreferenceTiersChange and records history", async () => {
      const newTiers: PreferenceTier[] = [
        {
          id: "tier-1",
          name: "Series A",
          seniority: 1,
          investment_amount: 1000000,
          liquidation_multiplier: 1,
          participating: false,
          stakeholder_ids: ["stakeholder-1"],
        },
      ];

      const { result } = renderHook(() =>
        useCapTableHistory({
          capTable: createMockCapTable(),
          instruments: createMockInstruments(),
          preferenceTiers: createMockPreferenceTiers(),
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      act(() => {
        result.current.setPreferenceTiers(newTiers, "Add preference tier");
      });

      expect(mockOnPreferenceTiersChange).toHaveBeenCalledWith(newTiers);
    });
  });

  describe("setAll", () => {
    it("updates all state and creates single history entry", async () => {
      const newState: CapTableState = {
        capTable: createMockCapTable(3),
        instruments: [
          {
            id: "safe-1",
            type: "SAFE",
            investor_name: "Investor",
            investment_amount: 100000,
            valuation_cap: 1000000,
            status: "outstanding",
            pro_rata_rights: false,
            mfn_clause: false,
          },
        ],
        preferenceTiers: [
          {
            id: "tier-1",
            name: "Tier 1",
            seniority: 1,
            investment_amount: 100000,
            liquidation_multiplier: 1,
            participating: false,
            stakeholder_ids: ["stakeholder-1"],
          },
        ],
      };

      const { result } = renderHook(() =>
        useCapTableHistory({
          capTable: createMockCapTable(),
          instruments: createMockInstruments(),
          preferenceTiers: createMockPreferenceTiers(),
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      act(() => {
        result.current.setAll(newState, "Load scenario");
      });

      expect(mockOnCapTableChange).toHaveBeenCalledWith(newState.capTable);
      expect(mockOnInstrumentsChange).toHaveBeenCalledWith(newState.instruments);
      expect(mockOnPreferenceTiersChange).toHaveBeenCalledWith(newState.preferenceTiers);
    });
  });

  describe("undo/redo", () => {
    it("can undo state changes", async () => {
      const initialCapTable = createMockCapTable(1);
      const updatedCapTable = createMockCapTable(2);

      const { result, rerender } = renderHook(
        (props: { capTable: CapTable }) =>
          useCapTableHistory({
            capTable: props.capTable,
            instruments: createMockInstruments(),
            preferenceTiers: createMockPreferenceTiers(),
            onCapTableChange: mockOnCapTableChange,
            onInstrumentsChange: mockOnInstrumentsChange,
            onPreferenceTiersChange: mockOnPreferenceTiersChange,
          }),
        { initialProps: { capTable: initialCapTable } }
      );

      await waitForEffects();

      // Make a change
      act(() => {
        result.current.setCapTable(updatedCapTable, "Add stakeholder");
      });

      // Re-render with updated cap table
      rerender({ capTable: updatedCapTable });

      await waitForEffects();

      // Now undo
      act(() => {
        result.current.undo();
      });

      // Undo should restore previous state
      expect(mockOnCapTableChange).toHaveBeenCalled();
    });

    it("does nothing when there is nothing to undo", async () => {
      const { result } = renderHook(() =>
        useCapTableHistory({
          capTable: createMockCapTable(0), // Empty cap table won't initialize history
          instruments: createMockInstruments(),
          preferenceTiers: createMockPreferenceTiers(),
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      // Try to undo with empty history
      mockOnCapTableChange.mockClear();
      act(() => {
        result.current.undo();
      });

      // No state change should occur
      expect(mockOnCapTableChange).not.toHaveBeenCalled();
    });

    it("does nothing when there is nothing to redo", async () => {
      const { result } = renderHook(() =>
        useCapTableHistory({
          capTable: createMockCapTable(),
          instruments: createMockInstruments(),
          preferenceTiers: createMockPreferenceTiers(),
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      // Try to redo with no future states
      mockOnCapTableChange.mockClear();
      act(() => {
        result.current.redo();
      });

      // No state change should occur
      expect(mockOnCapTableChange).not.toHaveBeenCalled();
    });
  });

  describe("canUndo/canRedo state", () => {
    it("reports correct undo availability", async () => {
      const { result } = renderHook(() =>
        useCapTableHistory({
          capTable: createMockCapTable(),
          instruments: createMockInstruments(),
          preferenceTiers: createMockPreferenceTiers(),
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      // Initially, there should be nothing to undo (past is empty)
      expect(result.current.canUndo).toBe(false);

      // Make a change
      act(() => {
        result.current.setCapTable(createMockCapTable(2), "Add stakeholder");
      });

      // Now we should be able to undo
      expect(result.current.canUndo).toBe(true);
    });

    it("reports correct redo availability", async () => {
      const { result, rerender } = renderHook(
        (props: { capTable: CapTable }) =>
          useCapTableHistory({
            capTable: props.capTable,
            instruments: createMockInstruments(),
            preferenceTiers: createMockPreferenceTiers(),
            onCapTableChange: mockOnCapTableChange,
            onInstrumentsChange: mockOnInstrumentsChange,
            onPreferenceTiersChange: mockOnPreferenceTiersChange,
          }),
        { initialProps: { capTable: createMockCapTable() } }
      );

      await waitForEffects();

      // Initially nothing to redo
      expect(result.current.canRedo).toBe(false);

      // Make a change
      const updatedCapTable = createMockCapTable(2);
      act(() => {
        result.current.setCapTable(updatedCapTable, "Add stakeholder");
      });

      rerender({ capTable: updatedCapTable });

      await waitForEffects();

      // Undo the change
      act(() => {
        result.current.undo();
      });

      // Now we should be able to redo
      expect(result.current.canRedo).toBe(true);
    });
  });

  describe("clearHistory", () => {
    it("clears the history state", async () => {
      const { result } = renderHook(() =>
        useCapTableHistory({
          capTable: createMockCapTable(),
          instruments: createMockInstruments(),
          preferenceTiers: createMockPreferenceTiers(),
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      // Make some changes
      act(() => {
        result.current.setCapTable(createMockCapTable(2), "Change 1");
        result.current.setCapTable(createMockCapTable(3), "Change 2");
      });

      // Clear history
      act(() => {
        result.current.clearHistory();
      });

      // After clearing, nothing should be undoable
      const historyState = useHistoryStore.getState();
      expect(historyState.past.length).toBe(0);
      expect(historyState.future.length).toBe(0);
    });
  });

  describe("labels", () => {
    it("provides correct undo label", async () => {
      const { result } = renderHook(() =>
        useCapTableHistory({
          capTable: createMockCapTable(),
          instruments: createMockInstruments(),
          preferenceTiers: createMockPreferenceTiers(),
          onCapTableChange: mockOnCapTableChange,
          onInstrumentsChange: mockOnInstrumentsChange,
          onPreferenceTiersChange: mockOnPreferenceTiersChange,
        })
      );

      await waitForEffects();

      // Make a change with label
      act(() => {
        result.current.setCapTable(createMockCapTable(2), "Add new stakeholder");
      });

      // The undo label should be the current state's label
      expect(result.current.undoLabel).toBe("Add new stakeholder");
    });
  });
});
