import { useMemo } from "react";
import { useFormStatus, type FormSectionState } from "./use-form-status";
import type { GlobalSettingsForm, CurrentJobForm, RSUForm, StockOptionsForm } from "@/lib/schemas";

/**
 * Derives form section states from store data.
 * Since form onChange only fires when valid, we can infer:
 * - Data exists = complete
 * - Data is null = not started
 */
export function useSidebarFormStatus(
  globalSettings: GlobalSettingsForm | null,
  currentJob: CurrentJobForm | null,
  equityDetails: RSUForm | StockOptionsForm | null
) {
  const sections = useMemo(() => {
    const result: Record<string, FormSectionState> = {};

    // Global Settings
    result["Global Settings"] = {
      isValid: globalSettings !== null,
      isTouched: globalSettings !== null,
      isDirty: globalSettings !== null,
      hasErrors: false,
      hasWarnings: false,
      errorCount: 0,
    };

    // Current Job
    const hasLowSalary = currentJob?.monthly_salary !== undefined && currentJob.monthly_salary < 1000 && currentJob.monthly_salary > 0;
    result["Current Job"] = {
      isValid: currentJob !== null,
      isTouched: currentJob !== null,
      isDirty: currentJob !== null,
      hasErrors: false,
      hasWarnings: hasLowSalary,
      errorCount: 0,
    };

    // Startup Offer
    const hasLowStartupSalary = equityDetails?.monthly_salary !== undefined && equityDetails.monthly_salary < 1000 && equityDetails.monthly_salary > 0;
    const hasZeroStartupSalary = equityDetails?.monthly_salary === 0;
    result["Startup Offer"] = {
      isValid: equityDetails !== null,
      isTouched: equityDetails !== null,
      isDirty: equityDetails !== null,
      hasErrors: false,
      hasWarnings: hasLowStartupSalary || hasZeroStartupSalary,
      errorCount: 0,
    };

    return result;
  }, [globalSettings, currentJob, equityDetails]);

  return useFormStatus(sections);
}
