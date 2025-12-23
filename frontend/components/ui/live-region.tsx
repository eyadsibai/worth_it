"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface LiveRegionProps {
  /** Content to announce to screen readers */
  children: React.ReactNode;
  /** Use assertive for urgent announcements (interrupts current speech) */
  assertive?: boolean;
  /** Whether to visually hide the region (default: true) */
  visuallyHidden?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Live region for announcing dynamic content changes to screen readers.
 *
 * - Use default (polite) for non-urgent updates like "Calculation complete"
 * - Use assertive for errors or urgent messages that need immediate attention
 *
 * @example
 * ```tsx
 * // Polite announcement (waits for screen reader to finish)
 * <LiveRegion>Calculation complete. Net benefit: $245,000</LiveRegion>
 *
 * // Assertive announcement (interrupts immediately)
 * <LiveRegion assertive>Error: Invalid input</LiveRegion>
 *
 * // Visible status indicator
 * <LiveRegion visuallyHidden={false}>Loading results...</LiveRegion>
 * ```
 */
export function LiveRegion({
  children,
  assertive = false,
  visuallyHidden = true,
  className,
}: LiveRegionProps) {
  return (
    <div
      role={assertive ? "alert" : "status"}
      aria-live={assertive ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn(visuallyHidden && "sr-only", className)}
    >
      {children}
    </div>
  );
}
