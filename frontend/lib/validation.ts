/**
 * Validation utilities for form data
 * Used to prevent API calls with invalid/incomplete data
 */

import type { StockOptionsForm, RSUForm } from "@/lib/schemas";

/**
 * Helper to check if Stock Options form data has meaningful values
 * All critical fields must be > 0 to prevent 400 errors from the backend
 */
export function isValidStockOptionsData(data: StockOptionsForm): boolean {
  return (
    data.num_options > 0 &&
    data.strike_price > 0 &&
    data.exit_price_per_share > 0 &&
    data.monthly_salary > 0
  );
}

/**
 * Helper to check if RSU form data has meaningful values
 * All critical fields must be > 0 to prevent 400 errors from the backend
 */
export function isValidRSUData(data: RSUForm): boolean {
  return (
    data.total_equity_grant_pct > 0 &&
    data.exit_valuation > 0 &&
    data.monthly_salary > 0
  );
}

/**
 * Type guard to check if equity data is StockOptionsForm
 */
export function isStockOptionsForm(data: RSUForm | StockOptionsForm): data is StockOptionsForm {
  return data.equity_type === "STOCK_OPTIONS";
}

/**
 * Type guard to check if equity data is RSUForm
 */
export function isRSUForm(data: RSUForm | StockOptionsForm): data is RSUForm {
  return data.equity_type === "RSU";
}

/**
 * Validates equity details based on type
 * Returns true if the data is complete and ready for API calls
 */
export function isValidEquityData(data: RSUForm | StockOptionsForm | null): boolean {
  if (!data) return false;

  if (isStockOptionsForm(data)) {
    return isValidStockOptionsData(data);
  }

  if (isRSUForm(data)) {
    return isValidRSUData(data);
  }

  return false;
}
