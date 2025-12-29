"use client";

import { AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

interface BenchmarkWarningProps extends ComponentPropsWithoutRef<"div"> {
  /** Validation severity: "ok" (hidden), "warning" (amber), or "error" (red) */
  severity: "ok" | "warning" | "error";
  /** Human-readable warning message */
  message: string;
  /** Industry median value for comparison */
  median?: number;
  /** Suggested typical range [low, high] */
  suggestedRange?: [number, number] | null;
  /** Unit for display (e.g., "x", "%", "$") */
  unit?: string;
}

/**
 * BenchmarkWarning displays validation feedback for valuation inputs.
 *
 * Shows nothing for "ok" severity, amber warning for "warning",
 * and red error for "error" severity. Optionally shows industry
 * median and typical range for context.
 */
export function BenchmarkWarning({
  severity,
  message,
  median,
  suggestedRange,
  unit = "",
  className,
  ...props
}: BenchmarkWarningProps) {
  // Don't render anything for ok severity
  if (severity === "ok") return null;

  const Icon = severity === "error" ? AlertCircle : AlertTriangle;
  const colorClass =
    severity === "error"
      ? "text-destructive bg-destructive/10 border-destructive/20"
      : "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900";

  return (
    <div
      className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", colorClass, className)}
      {...props}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-1">
        <p>{message}</p>
        {median !== undefined && median > 0 && (
          <p className="text-xs opacity-75">
            Industry median: {median}
            {unit}
          </p>
        )}
        {suggestedRange && (
          <p className="text-xs opacity-75">
            Typical range: {suggestedRange[0]}
            {unit} - {suggestedRange[1]}
            {unit}
          </p>
        )}
      </div>
    </div>
  );
}
