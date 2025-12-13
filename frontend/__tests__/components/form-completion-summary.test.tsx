import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FormCompletionSummary } from "@/components/forms/form-completion-summary";
import type { FormStatus } from "@/lib/hooks/use-form-status";

const createMockStatus = (overrides: Partial<FormStatus> = {}): FormStatus => ({
  totalSections: 3,
  completedSections: 1,
  sectionsWithWarnings: 1,
  sectionsWithErrors: 1,
  isAllComplete: false,
  summaryText: "1 of 3 forms complete",
  sections: {
    "Global Settings": {
      isValid: true,
      isTouched: true,
      isDirty: true,
      hasErrors: false,
      hasWarnings: false,
      errorCount: 0,
      status: "complete",
    },
    "Current Job": {
      isValid: true,
      isTouched: true,
      isDirty: true,
      hasErrors: false,
      hasWarnings: true,
      errorCount: 0,
      status: "has_warnings",
    },
    "Startup Offer": {
      isValid: false,
      isTouched: true,
      isDirty: true,
      hasErrors: true,
      hasWarnings: false,
      errorCount: 1,
      firstError: "Exit valuation is required",
      status: "incomplete",
    },
  },
  ...overrides,
});

describe("FormCompletionSummary", () => {
  it("renders summary text", () => {
    const status = createMockStatus();
    render(<FormCompletionSummary status={status} />);
    expect(screen.getByText("1 of 3 forms complete")).toBeInTheDocument();
  });

  it("renders 'Form Status' title", () => {
    const status = createMockStatus();
    render(<FormCompletionSummary status={status} />);
    expect(screen.getByText("Form Status")).toBeInTheDocument();
  });

  it("shows section names with status icons when expanded", () => {
    const status = createMockStatus();
    render(<FormCompletionSummary status={status} defaultExpanded={true} />);

    expect(screen.getByText("Global Settings")).toBeInTheDocument();
    expect(screen.getByText("Current Job")).toBeInTheDocument();
    expect(screen.getByText("Startup Offer")).toBeInTheDocument();
  });

  it("toggles expansion on click", () => {
    const status = createMockStatus();
    render(<FormCompletionSummary status={status} />);

    // Initially collapsed
    expect(screen.queryByText("Global Settings")).not.toBeInTheDocument();

    // Click to expand
    const summaryText = screen.getByText("1 of 3 forms complete");
    fireEvent.click(summaryText);

    expect(screen.getByText("Global Settings")).toBeInTheDocument();
  });

  it("shows first error for incomplete sections", () => {
    const status = createMockStatus();
    render(<FormCompletionSummary status={status} defaultExpanded={true} />);

    expect(screen.getByText("Exit valuation is required")).toBeInTheDocument();
  });

  it("displays checkmark icon for complete sections", () => {
    const status = createMockStatus();
    render(<FormCompletionSummary status={status} defaultExpanded={true} />);

    // Check for aria-label on the status indicator
    const completeSections = screen.getAllByLabelText(/complete/i);
    expect(completeSections.length).toBeGreaterThan(0);
  });

  it("displays all complete message when all sections complete", () => {
    const status = createMockStatus({
      isAllComplete: true,
      completedSections: 3,
      sectionsWithErrors: 0,
      sectionsWithWarnings: 0,
      summaryText: "All forms complete",
      sections: {
        "Global Settings": {
          isValid: true,
          isTouched: true,
          isDirty: true,
          hasErrors: false,
          hasWarnings: false,
          errorCount: 0,
          status: "complete",
        },
        "Current Job": {
          isValid: true,
          isTouched: true,
          isDirty: true,
          hasErrors: false,
          hasWarnings: false,
          errorCount: 0,
          status: "complete",
        },
        "Startup Offer": {
          isValid: true,
          isTouched: true,
          isDirty: true,
          hasErrors: false,
          hasWarnings: false,
          errorCount: 0,
          status: "complete",
        },
      },
    });

    render(<FormCompletionSummary status={status} />);
    expect(screen.getByText("All forms complete")).toBeInTheDocument();
  });

  it("accepts custom className", () => {
    const status = createMockStatus();
    const { container } = render(
      <FormCompletionSummary status={status} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass("custom-class");
  });
});
