/**
 * Shared formatting utilities for the frontend
 */

/**
 * Format a number as SAR currency with full notation
 * @param value - The number to format
 * @returns Formatted currency string (e.g., "SAR 10,000")
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as SAR currency with compact notation
 * @param value - The number to format
 * @returns Formatted currency string (e.g., "SAR 10K")
 */
export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);
}
