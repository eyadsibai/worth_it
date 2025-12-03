import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number as SAR currency with compact notation (e.g., "SAR 1.5M", "SAR 500K")
 * Best for charts and visualizations where space is limited.
 */
export function formatCurrencyCompact(value: number): string {
  if (!Number.isFinite(value)) {
    return "SAR --";
  }
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);
}

/**
 * Format a number as SAR currency with full notation (e.g., "SAR 1,500,000")
 * Best for displaying exact values in tables and cards.
 */
export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return "SAR --";
  }
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as a percentage (e.g., "25.5%")
 */
export function formatPercentage(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) {
    return "--%";
  }
  return `${(value * 100).toFixed(decimals)}%`;
}
