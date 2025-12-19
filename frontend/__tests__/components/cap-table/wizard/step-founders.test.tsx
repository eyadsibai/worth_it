import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepFounders } from "@/components/cap-table/wizard/steps/step-founders";
import { DEFAULT_WIZARD_DATA, type WizardData } from "@/components/cap-table/wizard/types";

describe("StepFounders", () => {
  const mockOnDataChange = vi.fn();
  const mockOnNext = vi.fn();
  const mockOnBack = vi.fn();
  const mockOnSkipWizard = vi.fn();

  const defaultProps = {
    data: DEFAULT_WIZARD_DATA,
    onDataChange: mockOnDataChange,
    onNext: mockOnNext,
    onBack: mockOnBack,
    onSkipWizard: mockOnSkipWizard,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial Render", () => {
    it("renders the founders form", () => {
      render(<StepFounders {...defaultProps} />);

      expect(screen.getByText(/who are the founders/i)).toBeInTheDocument();
    });

    it("shows default two founder entries", () => {
      render(<StepFounders {...defaultProps} />);

      const nameInputs = screen.getAllByPlaceholderText(/founder name/i);
      expect(nameInputs).toHaveLength(2);
    });

    it("shows ownership percentage inputs", () => {
      render(<StepFounders {...defaultProps} />);

      const percentInputs = screen.getAllByLabelText(/ownership/i);
      expect(percentInputs).toHaveLength(2);
    });

    it("shows add founder button", () => {
      render(<StepFounders {...defaultProps} />);

      expect(screen.getByRole("button", { name: /add founder/i })).toBeInTheDocument();
    });
  });

  describe("Founder Management", () => {
    it("calls onDataChange when founder name is updated", () => {
      render(<StepFounders {...defaultProps} />);

      const nameInputs = screen.getAllByPlaceholderText(/founder name/i);
      fireEvent.change(nameInputs[0], { target: { value: "John Doe" } });

      expect(mockOnDataChange).toHaveBeenCalled();
      const callArg = mockOnDataChange.mock.calls[0][0];
      expect(callArg.founders[0].name).toBe("John Doe");
    });

    it("calls onDataChange when ownership percentage is updated", () => {
      render(<StepFounders {...defaultProps} />);

      const percentInputs = screen.getAllByLabelText(/ownership/i);
      fireEvent.change(percentInputs[0], { target: { value: "60" } });

      expect(mockOnDataChange).toHaveBeenCalled();
      const callArg = mockOnDataChange.mock.calls[0][0];
      expect(callArg.founders[0].ownershipPct).toBe(60);
    });

    it("adds a new founder entry when add button is clicked", () => {
      render(<StepFounders {...defaultProps} />);

      fireEvent.click(screen.getByRole("button", { name: /add founder/i }));

      expect(mockOnDataChange).toHaveBeenCalled();
      const callArg = mockOnDataChange.mock.calls[0][0];
      expect(callArg.founders).toHaveLength(3);
    });

    it("removes a founder entry when remove button is clicked", () => {
      const dataWithThreeFounders: WizardData = {
        ...DEFAULT_WIZARD_DATA,
        founders: [
          { id: "1", name: "John", ownershipPct: 40 },
          { id: "2", name: "Jane", ownershipPct: 30 },
          { id: "3", name: "Bob", ownershipPct: 30 },
        ],
      };

      render(<StepFounders {...defaultProps} data={dataWithThreeFounders} />);

      const removeButtons = screen.getAllByRole("button", { name: /remove/i });
      fireEvent.click(removeButtons[0]);

      expect(mockOnDataChange).toHaveBeenCalled();
      const callArg = mockOnDataChange.mock.calls[0][0];
      expect(callArg.founders).toHaveLength(2);
    });

    it("does not show remove button when only one founder exists", () => {
      const dataWithOneFounder: WizardData = {
        ...DEFAULT_WIZARD_DATA,
        founders: [{ id: "1", name: "John", ownershipPct: 100 }],
      };

      render(<StepFounders {...defaultProps} data={dataWithOneFounder} />);

      expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
    });
  });

  describe("Validation", () => {
    it("shows total ownership percentage", () => {
      render(<StepFounders {...defaultProps} />);

      expect(screen.getByText(/total/i)).toBeInTheDocument();
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it("shows warning when total exceeds 100%", () => {
      const dataOver100: WizardData = {
        ...DEFAULT_WIZARD_DATA,
        founders: [
          { id: "1", name: "John", ownershipPct: 60 },
          { id: "2", name: "Jane", ownershipPct: 60 },
        ],
      };

      render(<StepFounders {...defaultProps} data={dataOver100} />);

      expect(screen.getByText(/exceeds 100%/i)).toBeInTheDocument();
    });

    it("disables next button when no founder names are entered", () => {
      render(<StepFounders {...defaultProps} />);

      expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
    });

    it("enables next button when at least one founder has a name", () => {
      const dataWithNames: WizardData = {
        ...DEFAULT_WIZARD_DATA,
        founders: [
          { id: "1", name: "John Doe", ownershipPct: 50 },
          { id: "2", name: "Jane Smith", ownershipPct: 50 },
        ],
      };

      render(<StepFounders {...defaultProps} data={dataWithNames} />);

      expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
    });
  });

  describe("Navigation", () => {
    it("calls onNext when next button is clicked with valid data", () => {
      const validData: WizardData = {
        ...DEFAULT_WIZARD_DATA,
        founders: [
          { id: "1", name: "John Doe", ownershipPct: 50 },
          { id: "2", name: "Jane Smith", ownershipPct: 50 },
        ],
      };

      render(<StepFounders {...defaultProps} data={validData} />);

      fireEvent.click(screen.getByRole("button", { name: /next/i }));

      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it("does not show back button (first step)", () => {
      render(<StepFounders {...defaultProps} />);

      expect(screen.queryByRole("button", { name: /back/i })).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has accessible labels for all inputs", () => {
      render(<StepFounders {...defaultProps} />);

      const nameInputs = screen.getAllByPlaceholderText(/founder name/i);
      nameInputs.forEach((input) => {
        expect(input).toHaveAccessibleName();
      });
    });
  });
});
