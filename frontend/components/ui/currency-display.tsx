"use client";

import * as React from "react";
import { formatCurrencyWithDecimals } from "@/lib/format-utils";
import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  value: number;
  className?: string;
  showDecimals?: boolean;
}

/**
 * Fundcy-style currency display component
 * Shows the decimal portion (.00) in a lighter color
 */
export function CurrencyDisplay({ value, className, showDecimals = true }: CurrencyDisplayProps) {
  const { main, decimal } = formatCurrencyWithDecimals(value);

  return (
    <span className={cn("tabular-nums", className)}>
      {main}
      {showDecimals && <span className="currency-decimal">{decimal}</span>}
    </span>
  );
}
