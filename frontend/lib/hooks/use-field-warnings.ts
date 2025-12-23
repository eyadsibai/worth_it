import { useMemo } from "react";

/**
 * Context object for field warnings that may need related field values.
 */
export interface WarningContext {
  monthly_salary?: number;
  startup_monthly_salary?: number;
  [key: string]: number | undefined;
}

/**
 * Warning messages for domain-specific validation heuristics.
 * These catch likely user mistakes for values that are technically valid.
 */
const WARNING_MESSAGES = {
  lowMonthlySalary: "This seems low for monthly salary. Did you mean yearly?",
  highMonthlySalary: "This seems high for monthly salary. Did you mean yearly?",
  zeroStartupSalary: "Confirm: $0 monthly salary from startup?",
  longVesting: "This is an unusually long vesting period",
  lowExitValuation: "Exit value is lower than one year's salary",
} as const;

/**
 * Get warning message for a field based on its value and optional context.
 * Returns null if no warning applies.
 *
 * @param fieldName - The form field name
 * @param value - The current field value
 * @param context - Optional context with related field values
 */
export function getFieldWarning(
  fieldName: string,
  value: number | undefined | null,
  context?: WarningContext
): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  switch (fieldName) {
    case "monthly_salary":
    case "current_job_monthly_salary":
      if (value < 1000) {
        return WARNING_MESSAGES.lowMonthlySalary;
      }
      if (value > 100000) {
        return WARNING_MESSAGES.highMonthlySalary;
      }
      return null;

    case "startup_monthly_salary":
      if (value === 0) {
        return WARNING_MESSAGES.zeroStartupSalary;
      }
      if (value < 1000) {
        return WARNING_MESSAGES.lowMonthlySalary;
      }
      if (value > 100000) {
        return WARNING_MESSAGES.highMonthlySalary;
      }
      return null;

    case "vesting_years":
      if (value > 5) {
        return WARNING_MESSAGES.longVesting;
      }
      return null;

    case "exit_valuation":
      if (context?.monthly_salary !== undefined) {
        const annualSalary = context.monthly_salary * 12;
        if (value < annualSalary) {
          return WARNING_MESSAGES.lowExitValuation;
        }
      }
      return null;

    default:
      return null;
  }
}

/**
 * React hook that returns a warning message for a form field.
 * Memoized to prevent unnecessary recalculations.
 *
 * @param fieldName - The form field name
 * @param value - The current field value
 * @param context - Optional context with related field values
 */
export function useFieldWarnings(
  fieldName: string,
  value: number | undefined | null,
  context?: WarningContext
): string | null {
  return useMemo(() => getFieldWarning(fieldName, value, context), [fieldName, value, context]);
}
