import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHistoryStore, createHistoryStore } from "@/lib/hooks/use-history";

describe("useHistoryStore", () => {
  beforeEach(() => {
    // Reset the store before each test
    useHistoryStore.setState({
      past: [],
      present: null,
      future: [],
    });
  });

  describe("initial state", () => {
    it("starts with empty history", () => {
      const { result } = renderHook(() => useHistoryStore());

      expect(result.current.past).toHaveLength(0);
      expect(result.current.present).toBeNull();
      expect(result.current.future).toHaveLength(0);
    });

    it("canUndo returns false when no history", () => {
      const { result } = renderHook(() => useHistoryStore());

      expect(result.current.canUndo()).toBe(false);
    });

    it("canRedo returns false when no future", () => {
      const { result } = renderHook(() => useHistoryStore());

      expect(result.current.canRedo()).toBe(false);
    });
  });

  describe("pushState", () => {
    it("adds new state to history", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "Test action");
      });

      expect(result.current.present).toEqual({ value: 1 });
      expect(result.current.past).toHaveLength(0); // First state has no past
    });

    it("moves current state to past when pushing new state", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "First");
        result.current.pushState({ value: 2 }, "Second");
      });

      expect(result.current.present).toEqual({ value: 2 });
      expect(result.current.past).toHaveLength(1);
      expect(result.current.past[0].state).toEqual({ value: 1 });
    });

    it("clears future when pushing new state", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "First");
        result.current.pushState({ value: 2 }, "Second");
        result.current.undo();
        result.current.pushState({ value: 3 }, "Third");
      });

      expect(result.current.future).toHaveLength(0);
    });

    it("limits history to maxSize", () => {
      // Create store with small max size for testing
      useHistoryStore.setState({
        past: [],
        present: null,
        future: [],
        maxSize: 3,
      });

      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "1");
        result.current.pushState({ value: 2 }, "2");
        result.current.pushState({ value: 3 }, "3");
        result.current.pushState({ value: 4 }, "4");
        result.current.pushState({ value: 5 }, "5");
      });

      // Should only keep maxSize-1 past states (3-1=2) plus present
      expect(result.current.past.length).toBeLessThanOrEqual(3);
    });
  });

  describe("undo", () => {
    it("restores previous state", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "First");
        result.current.pushState({ value: 2 }, "Second");
      });

      let undoneState: unknown;
      act(() => {
        undoneState = result.current.undo();
      });

      expect(undoneState).toEqual({ value: 1 });
      expect(result.current.present).toEqual({ value: 1 });
    });

    it("moves current state to future", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "First");
        result.current.pushState({ value: 2 }, "Second");
        result.current.undo();
      });

      expect(result.current.future).toHaveLength(1);
      expect(result.current.future[0].state).toEqual({ value: 2 });
    });

    it("returns null when cannot undo", () => {
      const { result } = renderHook(() => useHistoryStore());

      let undoneState: unknown;
      act(() => {
        undoneState = result.current.undo();
      });

      expect(undoneState).toBeNull();
    });

    it("canUndo returns true after adding states", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "First");
        result.current.pushState({ value: 2 }, "Second");
      });

      expect(result.current.canUndo()).toBe(true);
    });
  });

  describe("redo", () => {
    it("restores future state", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "First");
        result.current.pushState({ value: 2 }, "Second");
        result.current.undo();
      });

      let redoneState: unknown;
      act(() => {
        redoneState = result.current.redo();
      });

      expect(redoneState).toEqual({ value: 2 });
      expect(result.current.present).toEqual({ value: 2 });
    });

    it("moves current state to past", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "First");
        result.current.pushState({ value: 2 }, "Second");
        result.current.undo();
        result.current.redo();
      });

      expect(result.current.past).toHaveLength(1);
      expect(result.current.past[0].state).toEqual({ value: 1 });
    });

    it("returns null when cannot redo", () => {
      const { result } = renderHook(() => useHistoryStore());

      let redoneState: unknown;
      act(() => {
        redoneState = result.current.redo();
      });

      expect(redoneState).toBeNull();
    });

    it("canRedo returns true after undo", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "First");
        result.current.pushState({ value: 2 }, "Second");
        result.current.undo();
      });

      expect(result.current.canRedo()).toBe(true);
    });
  });

  describe("clear", () => {
    it("clears all history", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "First");
        result.current.pushState({ value: 2 }, "Second");
        result.current.clear();
      });

      expect(result.current.past).toHaveLength(0);
      expect(result.current.present).toBeNull();
      expect(result.current.future).toHaveLength(0);
    });
  });

  describe("action labels", () => {
    it("stores action labels with states", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "Add stakeholder");
        result.current.pushState({ value: 2 }, "Update ownership");
      });

      expect(result.current.past[0].label).toBe("Add stakeholder");
    });

    it("getUndoLabel returns last action label", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "Add stakeholder");
        result.current.pushState({ value: 2 }, "Update ownership");
      });

      expect(result.current.getUndoLabel()).toBe("Update ownership");
    });

    it("getRedoLabel returns next action label", () => {
      const { result } = renderHook(() => useHistoryStore());

      act(() => {
        result.current.pushState({ value: 1 }, "Add stakeholder");
        result.current.pushState({ value: 2 }, "Update ownership");
        result.current.undo();
      });

      expect(result.current.getRedoLabel()).toBe("Update ownership");
    });
  });
});
