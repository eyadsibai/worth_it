import * as React from "react";
import { cn } from "@/lib/utils";

interface DataLabelProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * DataLabel - Uppercase muted label for data displays.
 *
 * Follows the Fundcy design pattern for small uppercase labels
 * that appear above values in metric cards and data displays.
 *
 * @example
 * <DataLabel>Total Balance</DataLabel>
 * <p className="text-2xl font-semibold">$74,503.00</p>
 */
export function DataLabel({ children, className }: DataLabelProps) {
  return (
    <span className={cn("text-muted-foreground text-xs tracking-wide uppercase", className)}>
      {children}
    </span>
  );
}
