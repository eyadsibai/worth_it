import { useMemo } from "react";

/**
 * Status of a form section
 */
export type SectionStatus = "not_started" | "incomplete" | "has_warnings" | "complete";

/**
 * State for a single form section
 */
export interface FormSectionState {
  isValid: boolean;
  isTouched: boolean;
  isDirty: boolean;
  hasErrors: boolean;
  hasWarnings: boolean;
  errorCount: number;
  firstError?: string;
}

/**
 * Processed section with computed status
 */
export interface ProcessedSection extends FormSectionState {
  status: SectionStatus;
}

/**
 * Aggregated form status across all sections
 */
export interface FormStatus {
  totalSections: number;
  completedSections: number;
  sectionsWithWarnings: number;
  sectionsWithErrors: number;
  isAllComplete: boolean;
  summaryText: string;
  sections: Record<string, ProcessedSection>;
}

/**
 * Determine the status of a form section based on its state
 */
export function getFormSectionStatus(state: FormSectionState): SectionStatus {
  // Not started if never touched
  if (!state.isTouched && !state.isDirty) {
    return "not_started";
  }

  // Has errors takes priority
  if (state.hasErrors) {
    return "incomplete";
  }

  // Valid but has warnings
  if (state.isValid && state.hasWarnings) {
    return "has_warnings";
  }

  // Valid without warnings
  if (state.isValid) {
    return "complete";
  }

  // Touched but not valid (shouldn't happen if hasErrors is correct)
  return "incomplete";
}

/**
 * Hook to aggregate form status across multiple form sections.
 * Provides summary information for the form completion summary component.
 *
 * @param sections - Record of section name to section state
 */
export function useFormStatus(sections: Record<string, FormSectionState>): FormStatus {
  return useMemo(() => {
    const sectionNames = Object.keys(sections);
    const totalSections = sectionNames.length;

    if (totalSections === 0) {
      return {
        totalSections: 0,
        completedSections: 0,
        sectionsWithWarnings: 0,
        sectionsWithErrors: 0,
        isAllComplete: true,
        summaryText: "All forms complete",
        sections: {},
      };
    }

    // Process each section
    const processedSections: Record<string, ProcessedSection> = {};
    let completedSections = 0;
    let sectionsWithWarnings = 0;
    let sectionsWithErrors = 0;

    for (const name of sectionNames) {
      const state = sections[name];
      const status = getFormSectionStatus(state);

      processedSections[name] = {
        ...state,
        status,
      };

      if (status === "complete") {
        completedSections++;
      } else if (status === "has_warnings") {
        sectionsWithWarnings++;
      } else if (status === "incomplete") {
        sectionsWithErrors++;
      }
    }

    const isAllComplete = completedSections === totalSections;
    const summaryText = isAllComplete
      ? "All forms complete"
      : `${completedSections} of ${totalSections} forms complete`;

    return {
      totalSections,
      completedSections,
      sectionsWithWarnings,
      sectionsWithErrors,
      isAllComplete,
      summaryText,
      sections: processedSections,
    };
  }, [sections]);
}
