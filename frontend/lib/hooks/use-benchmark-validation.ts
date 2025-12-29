"use client";

import { useState, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api-client";
import type { BenchmarkValidationResponse } from "@/lib/schemas";

interface ValidationState {
  [fieldKey: string]: BenchmarkValidationResponse | null;
}

/**
 * useBenchmarkValidation - Hook for validating form inputs against industry benchmarks
 *
 * Provides debounced validation of form fields against industry benchmark data.
 * Stores validation results per field key for display alongside form inputs.
 *
 * @param industryCode - Selected industry code (null disables validation)
 * @returns Object with validations state, validateField function, and clear methods
 *
 * @example
 * ```tsx
 * const { validations, validateField } = useBenchmarkValidation(selectedIndustry);
 *
 * // Validate on field blur or change
 * const handleRevenueChange = (value: number) => {
 *   setValue("revenue_multiple", value);
 *   validateField("revenue_multiple", value);
 * };
 *
 * // Display warning
 * {validations.revenue_multiple && (
 *   <BenchmarkWarning {...validations.revenue_multiple} />
 * )}
 * ```
 */
export function useBenchmarkValidation(industryCode: string | null) {
  const [validations, setValidations] = useState<ValidationState>({});
  const [isValidating, setIsValidating] = useState(false);
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const validateField = useCallback(
    (metricName: string, value: number, fieldKey?: string) => {
      const key = fieldKey || metricName;

      // Clear validation if no industry selected
      if (!industryCode) {
        setValidations((prev) => ({ ...prev, [key]: null }));
        return;
      }

      // Clear existing timer for this field
      if (debounceTimers.current[key]) {
        clearTimeout(debounceTimers.current[key]);
      }

      // Debounce validation calls (300ms)
      debounceTimers.current[key] = setTimeout(async () => {
        setIsValidating(true);
        try {
          const response = await apiClient.validateBenchmark({
            industry_code: industryCode,
            metric_name: metricName,
            value,
          });

          setValidations((prev) => ({ ...prev, [key]: response }));
        } catch {
          // On error, clear the validation for this field
          setValidations((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
          });
        } finally {
          setIsValidating(false);
        }
      }, 300);
    },
    [industryCode]
  );

  const clearValidation = useCallback((fieldKey: string) => {
    setValidations((prev) => {
      const next = { ...prev };
      delete next[fieldKey];
      return next;
    });
  }, []);

  const clearAllValidations = useCallback(() => {
    setValidations({});
  }, []);

  return {
    validations,
    validateField,
    clearValidation,
    clearAllValidations,
    isValidating,
  };
}
