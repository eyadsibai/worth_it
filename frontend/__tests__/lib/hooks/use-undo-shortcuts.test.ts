import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useUndoShortcuts } from "@/lib/hooks/use-undo-shortcuts";

describe("useUndoShortcuts", () => {
  const mockOnUndo = vi.fn();
  const mockOnRedo = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock navigator for consistent testing
    Object.defineProperty(navigator, "platform", {
      value: "MacIntel",
      configurable: true,
    });
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const dispatchKeyboardEvent = (options: {
    key: string;
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    target?: HTMLElement;
  }) => {
    const event = new KeyboardEvent("keydown", {
      key: options.key,
      metaKey: options.metaKey ?? false,
      ctrlKey: options.ctrlKey ?? false,
      shiftKey: options.shiftKey ?? false,
      bubbles: true,
      cancelable: true,
    });

    // Allow target override for testing input exclusion
    if (options.target) {
      Object.defineProperty(event, "target", {
        value: options.target,
        writable: false,
      });
    }

    window.dispatchEvent(event);
  };

  describe("Mac shortcuts", () => {
    it("triggers onUndo when Cmd+Z is pressed", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      dispatchKeyboardEvent({ key: "z", metaKey: true });

      expect(mockOnUndo).toHaveBeenCalledTimes(1);
      expect(mockOnRedo).not.toHaveBeenCalled();
    });

    it("triggers onRedo when Cmd+Shift+Z is pressed", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      // When Shift is pressed, key is uppercase "Z"
      dispatchKeyboardEvent({ key: "Z", metaKey: true, shiftKey: true });

      expect(mockOnRedo).toHaveBeenCalledTimes(1);
      expect(mockOnUndo).not.toHaveBeenCalled();
    });

    it("triggers onRedo when Cmd+Y is pressed", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      dispatchKeyboardEvent({ key: "y", metaKey: true });

      expect(mockOnRedo).toHaveBeenCalledTimes(1);
      expect(mockOnUndo).not.toHaveBeenCalled();
    });
  });

  describe("Windows shortcuts", () => {
    beforeEach(() => {
      Object.defineProperty(navigator, "platform", {
        value: "Win32",
        configurable: true,
      });
      Object.defineProperty(navigator, "userAgent", {
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        configurable: true,
      });
    });

    it("triggers onUndo when Ctrl+Z is pressed", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      dispatchKeyboardEvent({ key: "z", ctrlKey: true });

      expect(mockOnUndo).toHaveBeenCalledTimes(1);
      expect(mockOnRedo).not.toHaveBeenCalled();
    });

    it("triggers onRedo when Ctrl+Shift+Z is pressed", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      dispatchKeyboardEvent({ key: "Z", ctrlKey: true, shiftKey: true });

      expect(mockOnRedo).toHaveBeenCalledTimes(1);
      expect(mockOnUndo).not.toHaveBeenCalled();
    });

    it("triggers onRedo when Ctrl+Y is pressed", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      dispatchKeyboardEvent({ key: "y", ctrlKey: true });

      expect(mockOnRedo).toHaveBeenCalledTimes(1);
      expect(mockOnUndo).not.toHaveBeenCalled();
    });
  });

  describe("input field exclusion", () => {
    it("does not trigger shortcuts in input fields", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      const input = document.createElement("input");
      dispatchKeyboardEvent({ key: "z", metaKey: true, target: input });

      expect(mockOnUndo).not.toHaveBeenCalled();
      expect(mockOnRedo).not.toHaveBeenCalled();
    });

    it("does not trigger shortcuts in textarea fields", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      const textarea = document.createElement("textarea");
      dispatchKeyboardEvent({ key: "z", metaKey: true, target: textarea });

      expect(mockOnUndo).not.toHaveBeenCalled();
      expect(mockOnRedo).not.toHaveBeenCalled();
    });

    it("does not trigger shortcuts in contenteditable elements", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      // Create element with isContentEditable property (required for the check)
      const div = document.createElement("div");
      Object.defineProperty(div, "isContentEditable", {
        value: true,
        configurable: true,
      });
      dispatchKeyboardEvent({ key: "z", metaKey: true, target: div });

      expect(mockOnUndo).not.toHaveBeenCalled();
      expect(mockOnRedo).not.toHaveBeenCalled();
    });
  });

  describe("enabled flag", () => {
    it("does not trigger shortcuts when disabled", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
          enabled: false,
        })
      );

      dispatchKeyboardEvent({ key: "z", metaKey: true });

      expect(mockOnUndo).not.toHaveBeenCalled();
      expect(mockOnRedo).not.toHaveBeenCalled();
    });

    it("triggers shortcuts when explicitly enabled", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
          enabled: true,
        })
      );

      dispatchKeyboardEvent({ key: "z", metaKey: true });

      expect(mockOnUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe("modifier key requirements", () => {
    it("does not trigger without modifier key", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      dispatchKeyboardEvent({ key: "z" });

      expect(mockOnUndo).not.toHaveBeenCalled();
      expect(mockOnRedo).not.toHaveBeenCalled();
    });

    it("does not trigger on wrong modifier (Ctrl on Mac)", () => {
      renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      dispatchKeyboardEvent({ key: "z", ctrlKey: true });

      expect(mockOnUndo).not.toHaveBeenCalled();
    });
  });

  describe("cleanup", () => {
    it("removes event listener on unmount", () => {
      const addSpy = vi.spyOn(window, "addEventListener");
      const removeSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() =>
        useUndoShortcuts({
          onUndo: mockOnUndo,
          onRedo: mockOnRedo,
        })
      );

      expect(addSpy).toHaveBeenCalledWith("keydown", expect.any(Function));

      unmount();

      expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    });
  });
});
