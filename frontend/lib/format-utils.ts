/**
 * Shared formatting utilities for the frontend
 */

/**
 * Multipliers for shorthand suffixes (case-insensitive)
 */
const SHORTHAND_MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
};

/**
 * Parse a string with shorthand notation (K, M, B) into a number.
 * Handles:
 * - Plain numbers: "50000" → 50000
 * - Thousands: "50K" or "50k" → 50000
 * - Millions: "10M" or "10m" → 10000000
 * - Billions: "1B" or "1b" → 1000000000
 * - Decimals: "1.5M" → 1500000
 * - Currency prefix: "$50K" → 50000
 * - Commas: "1,000,000" → 1000000
 * - Whitespace: " 50 K " → 50000
 *
 * @param input - The string to parse
 * @returns The parsed number, or NaN if invalid
 */
export function parseShorthand(input: string): number {
  // Normalize: trim whitespace, remove $ and commas, collapse internal spaces
  const normalized = input
    .trim()
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

  if (!normalized) {
    return NaN;
  }

  // Check for suffix (last character)
  const lastChar = normalized.slice(-1);
  const multiplier = SHORTHAND_MULTIPLIERS[lastChar];

  if (multiplier) {
    const numPart = normalized.slice(0, -1);
    const num = parseFloat(numPart);
    return isNaN(num) ? NaN : num * multiplier;
  }

  // No suffix - parse as plain number
  return parseFloat(normalized);
}

/**
 * Format a number with thousand separators (no currency symbol)
 * @param value - The number to format
 * @returns Formatted string with commas (e.g., "1,000,000")
 */
export function formatNumberWithSeparators(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 10, // Preserve decimals
  }).format(value);
}

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
 * Format a large number with a suffix (M, B, K) without trailing .00
 * @param value - The number to format
 * @param prefix - Currency prefix (default: "$")
 * @returns Formatted string (e.g., "$10M", "$1.5B")
 */
export function formatLargeNumber(value: number, prefix: string = "$"): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_000_000_000) {
    const num = absValue / 1_000_000_000;
    const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(2).replace(/\.?0+$/, "");
    return `${sign}${prefix}${formatted}B`;
  }
  if (absValue >= 1_000_000) {
    const num = absValue / 1_000_000;
    const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(2).replace(/\.?0+$/, "");
    return `${sign}${prefix}${formatted}M`;
  }
  if (absValue >= 1_000) {
    const num = absValue / 1_000;
    const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(1).replace(/\.?0+$/, "");
    return `${sign}${prefix}${formatted}K`;
  }
  return `${sign}${prefix}${absValue.toFixed(0)}`;
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
