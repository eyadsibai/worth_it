/**
 * Formatting constants for number display, currency formatting,
 * and value thresholds throughout the application.
 */

export const FORMATTING = {
  // === Large number thresholds ===
  THOUSAND: 1_000,
  MILLION: 1_000_000,
  BILLION: 1_000_000_000,

  // === Percentage conversion ===
  PERCENTAGE_MULTIPLIER: 100,

  // === Decimal places ===
  DECIMAL_PLACES_DEFAULT: 2,
  DECIMAL_PLACES_PERCENT: 1,

  // === Intl fraction digits ===
  MAX_FRACTION_DIGITS_PRESERVE: 10,

  // === Time units ===
  MONTHS_PER_YEAR: 12,
  HOURS_PER_DAY: 24,
  MINUTES_PER_HOUR: 60,
  SECONDS_PER_MINUTE: 60,
  MS_PER_SECOND: 1000,
  DAYS_PER_WEEK: 7,

  // === Debounce ===
  DEBOUNCE_MS: 300,
} as const;
