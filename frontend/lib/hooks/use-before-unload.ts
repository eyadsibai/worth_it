"use client";

import * as React from "react";

/**
 * Hook to warn users before leaving the page with unsaved changes.
 * Shows the browser's native "Leave site?" dialog.
 *
 * @param hasUnsavedChanges - Whether there are unsaved changes
 * @param _message - Custom message (note: modern browsers ignore this for security)
 *
 * @example
 * ```tsx
 * useBeforeUnload(isDirty);
 * ```
 */
export function useBeforeUnload(hasUnsavedChanges: boolean, _message?: string): void {
  React.useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Modern browsers ignore custom messages for security reasons
      // but setting returnValue is still required to trigger the dialog
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
}
