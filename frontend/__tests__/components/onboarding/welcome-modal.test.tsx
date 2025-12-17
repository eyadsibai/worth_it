/**
 * Tests for WelcomeModal onboarding component
 * TDD: Tests written first
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";

// Mock the store
const mockSetAppMode = vi.fn();
vi.mock("@/lib/store", () => ({
  useAppStore: (selector: (state: { setAppMode: typeof mockSetAppMode }) => unknown) => {
    const state = { setAppMode: mockSetAppMode };
    return selector ? selector(state) : state;
  },
}));

describe("WelcomeModal", () => {
  const defaultProps = {
    open: true,
    onComplete: vi.fn(),
    onSkip: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Step 1: Welcome", () => {
    it("renders welcome message on first step", () => {
      render(<WelcomeModal {...defaultProps} />);

      expect(screen.getByText(/welcome to worth it/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /get started/i })).toBeInTheDocument();
    });

    it("shows skip button", () => {
      render(<WelcomeModal {...defaultProps} />);

      expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
    });

    it("calls onSkip when skip button is clicked", async () => {
      const user = userEvent.setup();
      render(<WelcomeModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /skip/i }));

      expect(defaultProps.onSkip).toHaveBeenCalled();
    });

    it("advances to step 2 when Get Started is clicked", async () => {
      const user = userEvent.setup();
      render(<WelcomeModal {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /get started/i }));

      // Should now show mode selection
      expect(screen.getByText(/employee or founder/i)).toBeInTheDocument();
    });
  });

  describe("Step 2: Mode Selection", () => {
    it("shows Employee and Founder mode options", async () => {
      const user = userEvent.setup();
      render(<WelcomeModal {...defaultProps} />);

      // Advance to step 2
      await user.click(screen.getByRole("button", { name: /get started/i }));

      expect(screen.getByRole("button", { name: /employee/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /founder/i })).toBeInTheDocument();
    });

    it("sets app mode to employee when Employee is selected", async () => {
      const user = userEvent.setup();
      render(<WelcomeModal {...defaultProps} />);

      // Advance to step 2
      await user.click(screen.getByRole("button", { name: /get started/i }));

      // Select Employee
      await user.click(screen.getByRole("button", { name: /employee/i }));

      expect(mockSetAppMode).toHaveBeenCalledWith("employee");
    });

    it("sets app mode to founder when Founder is selected", async () => {
      const user = userEvent.setup();
      render(<WelcomeModal {...defaultProps} />);

      // Advance to step 2
      await user.click(screen.getByRole("button", { name: /get started/i }));

      // Select Founder
      await user.click(screen.getByRole("button", { name: /founder/i }));

      expect(mockSetAppMode).toHaveBeenCalledWith("founder");
    });

    it("advances to step 3 after mode selection", async () => {
      const user = userEvent.setup();
      render(<WelcomeModal {...defaultProps} />);

      // Advance to step 2
      await user.click(screen.getByRole("button", { name: /get started/i }));

      // Select a mode
      await user.click(screen.getByRole("button", { name: /employee/i }));

      // Should now show quick tour step
      expect(screen.getByText(/got it/i)).toBeInTheDocument();
    });
  });

  describe("Step 3: Quick Tour", () => {
    it("shows final step with Got it button", async () => {
      const user = userEvent.setup();
      render(<WelcomeModal {...defaultProps} />);

      // Advance through steps
      await user.click(screen.getByRole("button", { name: /get started/i }));
      await user.click(screen.getByRole("button", { name: /employee/i }));

      expect(screen.getByRole("button", { name: /got it/i })).toBeInTheDocument();
    });

    it("calls onComplete when Got it is clicked", async () => {
      const user = userEvent.setup();
      render(<WelcomeModal {...defaultProps} />);

      // Advance through all steps
      await user.click(screen.getByRole("button", { name: /get started/i }));
      await user.click(screen.getByRole("button", { name: /employee/i }));
      await user.click(screen.getByRole("button", { name: /got it/i }));

      expect(defaultProps.onComplete).toHaveBeenCalled();
    });
  });

  describe("Progress indicator", () => {
    it("shows progress dots for all 3 steps", () => {
      render(<WelcomeModal {...defaultProps} />);

      // Should have 3 step indicators
      const stepIndicators = screen.getAllByTestId("step-indicator");
      expect(stepIndicators).toHaveLength(3);
    });

    it("highlights current step", async () => {
      const user = userEvent.setup();
      render(<WelcomeModal {...defaultProps} />);

      // Step 1 should be active
      const indicators = screen.getAllByTestId("step-indicator");
      expect(indicators[0]).toHaveAttribute("data-active", "true");
      expect(indicators[1]).toHaveAttribute("data-active", "false");

      // Advance to step 2
      await user.click(screen.getByRole("button", { name: /get started/i }));

      const updatedIndicators = screen.getAllByTestId("step-indicator");
      expect(updatedIndicators[0]).toHaveAttribute("data-active", "false");
      expect(updatedIndicators[1]).toHaveAttribute("data-active", "true");
    });
  });

  describe("Modal behavior", () => {
    it("does not render when open is false", () => {
      render(<WelcomeModal {...defaultProps} open={false} />);

      expect(screen.queryByText(/welcome to worth it/i)).not.toBeInTheDocument();
    });
  });
});
