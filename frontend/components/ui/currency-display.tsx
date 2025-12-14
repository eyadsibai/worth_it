"use client";

import * as React from "react";
import { formatCurrencyWithDecimals, formatCurrencyCompact } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/lib/hooks";

interface CurrencyDisplayProps {
  value: number;
  className?: string;
  showDecimals?: boolean;
  /**
   * When true, uses compact notation ($123K) on smaller viewports
   * and full notation ($123,456.00) on larger viewports
   */
  responsive?: boolean;
}

/**
 * Fundcy-style currency display component
 * Shows the decimal portion (.00) in a lighter color
 *
 * When responsive=true, shows compact format ($123K) at tablet/mobile
 * to prevent text truncation in tight layouts
 */
export function CurrencyDisplay({
  value,
  className,
  showDecimals = true,
  responsive = false,
}: CurrencyDisplayProps) {
  // Use compact format below lg breakpoint (1024px)
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const useCompact = responsive && !isLargeScreen;

  if (useCompact) {
    return (
      <span className={cn("tabular-nums", className)}>
        {formatCurrencyCompact(value)}
      </span>
    );
  }

  const { main, decimal } = formatCurrencyWithDecimals(value);

  return (
    <span className={cn("tabular-nums", className)}>
      {main}
      {showDecimals && <span className="currency-decimal">{decimal}</span>}
    </span>
  );
}
