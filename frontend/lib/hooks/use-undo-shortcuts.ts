/**
 * Keyboard shortcut handler for Undo/Redo
 *
 * Listens for:
 * - Cmd+Z (Mac) / Ctrl+Z (Windows): Undo
 * - Cmd+Shift+Z (Mac) / Ctrl+Shift+Z (Windows): Redo
 * - Cmd+Y (Mac) / Ctrl+Y (Windows): Redo (alternative)
 */

import { useEffect, useCallback } from "react";

interface UseUndoShortcutsOptions {
  onUndo: () => void;
  onRedo: () => void;
  enabled?: boolean;
}

export function useUndoShortcuts({
  onUndo,
  onRedo,
  enabled = true,
}: UseUndoShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check if user is typing in an input field
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Let browser handle native undo/redo in text fields
        return;
      }

      // Use modern userAgentData API with fallback to deprecated navigator.platform
      const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
      const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
      const isMac = /mac/i.test(platform) || navigator.userAgent?.includes("Mac");
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (!modifier) return;

      // Redo: Cmd/Ctrl+Shift+Z or Cmd/Ctrl+Y
      // Note: With Shift pressed, event.key returns uppercase "Z"
      if (
        (event.key.toLowerCase() === "z" && event.shiftKey) ||
        event.key === "y"
      ) {
        event.preventDefault();
        onRedo();
        return;
      }

      // Undo: Cmd/Ctrl+Z
      if (event.key === "z" && !event.shiftKey) {
        event.preventDefault();
        onUndo();
        return;
      }
    },
    [onUndo, onRedo, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown, enabled]);
}
