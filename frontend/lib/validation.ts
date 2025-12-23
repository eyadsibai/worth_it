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
  return data.total_equity_grant_pct > 0 && data.exit_valuation > 0 && data.monthly_salary > 0;
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

/**
 * Field name type for equity forms
 * Used for programmatic focus targeting
 */
export type EquityFieldName =
  | "total_equity_grant_pct"
  | "exit_valuation"
  | "monthly_salary"
  | "num_options"
  | "strike_price"
  | "exit_price_per_share";

/**
 * Returns the name of the first invalid/missing equity field.
 * Used by ActionableEmptyState to focus the first missing field.
 *
 * @param data The equity form data (RSU or Stock Options)
 * @returns The field name string, or null if all fields are valid or data is null
 */
export function getFirstInvalidEquityField(
  data: RSUForm | StockOptionsForm | null
): EquityFieldName | null {
  if (!data) return null;

  if (isStockOptionsForm(data)) {
    // Check Stock Options fields in priority order
    if (!data.num_options || data.num_options <= 0) return "num_options";
    if (!data.strike_price || data.strike_price <= 0) return "strike_price";
    if (!data.exit_price_per_share || data.exit_price_per_share <= 0) return "exit_price_per_share";
    if (!data.monthly_salary || data.monthly_salary <= 0) return "monthly_salary";
  } else if (isRSUForm(data)) {
    // Check RSU fields in priority order
    if (!data.total_equity_grant_pct || data.total_equity_grant_pct <= 0)
      return "total_equity_grant_pct";
    if (!data.exit_valuation || data.exit_valuation <= 0) return "exit_valuation";
    if (!data.monthly_salary || data.monthly_salary <= 0) return "monthly_salary";
  }

  return null;
}
