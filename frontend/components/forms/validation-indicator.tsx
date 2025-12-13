"use client";

import { Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationIndicatorProps {
  isValid: boolean;
  hasError: boolean;
  hasWarning: boolean;
  isTouched: boolean;
  isDirty: boolean;
  className?: string;
}

/**
 * Visual indicator for form field validation state.
 * Shows checkmark (valid), X (error), or warning triangle based on state.
 * Only displays after user interaction (touched + dirty).
 */
export function ValidationIndicator({
  isValid,
  hasError,
  hasWarning,
  isTouched,
  isDirty,
  className,
}: ValidationIndicatorProps) {
  // Only show indicator after user interaction
  if (!isTouched || !isDirty) {
    return null;
  }

  // Priority: error > warning > valid
  if (hasError) {
    return (
      <span
        aria-label="Field has error"
        className={cn(
          "inline-flex items-center justify-center text-destructive animate-in fade-in duration-200",
          className
        )}
      >
        <X className="h-4 w-4" />
      </span>
    );
  }

  if (hasWarning) {
    return (
      <span
        aria-label="Field has warning"
        className={cn(
          "inline-flex items-center justify-center text-amber-500 animate-in fade-in duration-200",
          className
        )}
      >
        <AlertTriangle className="h-4 w-4" />
      </span>
    );
  }

  if (isValid) {
    return (
      <span
        aria-label="Field is valid"
        className={cn(
          "inline-flex items-center justify-center text-chart-3 animate-in fade-in duration-200",
          className
        )}
      >
        <Check className="h-4 w-4" />
      </span>
    );
  }

  return null;
}
