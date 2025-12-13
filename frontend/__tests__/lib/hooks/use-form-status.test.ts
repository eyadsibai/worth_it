import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useFormStatus,
  getFormSectionStatus,
  type FormSectionState,
} from "@/lib/hooks/use-form-status";

describe("getFormSectionStatus", () => {
  it("returns 'not_started' when form is not touched", () => {
    const state: FormSectionState = {
      isValid: false,
      isTouched: false,
      isDirty: false,
      hasErrors: false,
      hasWarnings: false,
      errorCount: 0,
    };
    expect(getFormSectionStatus(state)).toBe("not_started");
  });

  it("returns 'incomplete' when form has errors", () => {
    const state: FormSectionState = {
      isValid: false,
      isTouched: true,
      isDirty: true,
      hasErrors: true,
      hasWarnings: false,
      errorCount: 2,
    };
    expect(getFormSectionStatus(state)).toBe("incomplete");
  });

  it("returns 'has_warnings' when valid but has warnings", () => {
    const state: FormSectionState = {
      isValid: true,
      isTouched: true,
      isDirty: true,
      hasErrors: false,
      hasWarnings: true,
      errorCount: 0,
    };
    expect(getFormSectionStatus(state)).toBe("has_warnings");
  });

  it("returns 'complete' when valid without warnings", () => {
    const state: FormSectionState = {
      isValid: true,
      isTouched: true,
      isDirty: true,
      hasErrors: false,
      hasWarnings: false,
      errorCount: 0,
    };
    expect(getFormSectionStatus(state)).toBe("complete");
  });

  it("prioritizes errors over warnings", () => {
    const state: FormSectionState = {
      isValid: false,
      isTouched: true,
      isDirty: true,
      hasErrors: true,
      hasWarnings: true,
      errorCount: 1,
    };
    expect(getFormSectionStatus(state)).toBe("incomplete");
  });
});

describe("useFormStatus hook", () => {
  it("aggregates multiple form sections", () => {
    const sections: Record<string, FormSectionState> = {
      "Global Settings": {
        isValid: true,
        isTouched: true,
        isDirty: true,
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
      },
      "Current Job": {
        isValid: true,
        isTouched: true,
        isDirty: true,
        hasErrors: false,
        hasWarnings: true,
        errorCount: 0,
      },
      "Startup Offer": {
        isValid: false,
        isTouched: true,
        isDirty: true,
        hasErrors: true,
        hasWarnings: false,
        errorCount: 1,
      },
    };

    const { result } = renderHook(() => useFormStatus(sections));

    expect(result.current.totalSections).toBe(3);
    expect(result.current.completedSections).toBe(1);
    expect(result.current.sectionsWithWarnings).toBe(1);
    expect(result.current.sectionsWithErrors).toBe(1);
    expect(result.current.sections["Global Settings"].status).toBe("complete");
    expect(result.current.sections["Current Job"].status).toBe("has_warnings");
    expect(result.current.sections["Startup Offer"].status).toBe("incomplete");
  });

  it("returns summary text", () => {
    const sections: Record<string, FormSectionState> = {
      "Form 1": {
        isValid: true,
        isTouched: true,
        isDirty: true,
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
      },
      "Form 2": {
        isValid: true,
        isTouched: true,
        isDirty: true,
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
      },
      "Form 3": {
        isValid: false,
        isTouched: false,
        isDirty: false,
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
      },
    };

    const { result } = renderHook(() => useFormStatus(sections));

    expect(result.current.summaryText).toBe("2 of 3 forms complete");
  });

  it("handles all complete state", () => {
    const sections: Record<string, FormSectionState> = {
      "Form 1": {
        isValid: true,
        isTouched: true,
        isDirty: true,
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
      },
    };

    const { result } = renderHook(() => useFormStatus(sections));

    expect(result.current.isAllComplete).toBe(true);
    expect(result.current.summaryText).toBe("All forms complete");
  });

  it("handles empty sections", () => {
    const { result } = renderHook(() => useFormStatus({}));

    expect(result.current.totalSections).toBe(0);
    expect(result.current.completedSections).toBe(0);
    expect(result.current.isAllComplete).toBe(true);
  });

  it("updates when sections change", () => {
    const initialSections: Record<string, FormSectionState> = {
      "Form 1": {
        isValid: false,
        isTouched: false,
        isDirty: false,
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
      },
    };

    const { result, rerender } = renderHook(
      ({ sections }) => useFormStatus(sections),
      { initialProps: { sections: initialSections } }
    );

    expect(result.current.completedSections).toBe(0);

    const updatedSections: Record<string, FormSectionState> = {
      "Form 1": {
        isValid: true,
        isTouched: true,
        isDirty: true,
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
      },
    };

    rerender({ sections: updatedSections });
    expect(result.current.completedSections).toBe(1);
  });
});
