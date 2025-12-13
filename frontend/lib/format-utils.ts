/**
 * Shared formatting utilities for the frontend
 */

/**
 * Format a number as USD currency with full notation
 * @param value - The number to format
 * @returns Formatted currency string (e.g., "$10,000")
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as USD currency with compact notation
 * @param value - The number to format
 * @returns Formatted currency string (e.g., "$10K")
 */
export function formatCurrencyCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);
}

/**
 * Format a number as USD currency with decimals (for Fundcy-style display)
 * Returns an object with main part and decimal part for styled rendering
 * @param value - The number to format
 * @returns Object with main and decimal parts
 */
export function formatCurrencyWithDecimals(value: number): { main: string; decimal: string } {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  // Split at the decimal point
  const parts = formatted.split(".");
  return {
    main: parts[0],
    decimal: parts[1] ? `.${parts[1]}` : ".00",
  };
}
