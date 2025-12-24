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
  /**
   * Color variant for the display
   * - "default": No color applied (inherits from parent)
   * - "positive": Green color (text-terminal) for gains
   * - "negative": Red color (text-destructive) for losses
   */
  variant?: "default" | "positive" | "negative";
  /**
   * When true, shows "+" prefix for positive values
   * Useful for displaying gains/losses where sign matters
   */
  showSign?: boolean;
}

/**
 * Fundcy-style currency display component
 * Shows the decimal portion (.00) in a lighter color
 *
 * When responsive=true, shows compact format ($123K) at tablet/mobile
 * to prevent text truncation in tight layouts
 */
const variantClasses = {
  default: "",
  positive: "text-terminal",
  negative: "text-destructive",
} as const;

export function CurrencyDisplay({
  value,
  className,
  showDecimals = false,
  responsive = false,
  variant = "default",
  showSign = false,
}: CurrencyDisplayProps) {
  // Use compact format below lg breakpoint (1024px)
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const useCompact = responsive && !isLargeScreen;

  const variantClass = variantClasses[variant];
  const signPrefix = showSign && value > 0 ? "+" : "";

  if (useCompact) {
    return (
      <span className={cn("tabular-nums", variantClass, className)}>
        {signPrefix}
        {formatCurrencyCompact(value)}
      </span>
    );
  }

  const { main, decimal } = formatCurrencyWithDecimals(value);

  return (
    <span className={cn("tabular-nums", variantClass, className)}>
      {signPrefix}
      {main}
      {showDecimals && <span className="currency-decimal">{decimal}</span>}
    </span>
  );
}
