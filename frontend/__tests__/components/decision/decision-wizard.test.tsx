/**
 * Tests for the DecisionWizard component
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecisionWizard } from "@/components/decision/decision-wizard";
import type { FinancialAnalysis, DecisionRecommendation, DecisionInputs } from "@/lib/decision-framework";

// Mock financial analysis
const mockFinancialAnalysis: FinancialAnalysis = {
  netBenefit: 150000,
  positiveOutcomeProbability: 0.65,
  expectedValue: 120000,
  isWorthIt: true,
};

// Default props
const defaultProps = {
  financialAnalysis: mockFinancialAnalysis,
  onComplete: vi.fn(),
  onSkip: vi.fn(),
};

describe("DecisionWizard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the wizard with initial step", () => {
      render(<DecisionWizard {...defaultProps} />);

      expect(screen.getByText("Decision Framework")).toBeInTheDocument();
      expect(screen.getByText("Financial Analysis")).toBeInTheDocument();
      expect(screen.getByText("Based on your inputs, the financial analysis shows:")).toBeInTheDocument();
    });

    it("displays financial metrics on first step", () => {
      render(<DecisionWizard {...defaultProps} />);

      expect(screen.getByText("Expected Net Benefit")).toBeInTheDocument();
      expect(screen.getByText("Success Probability")).toBeInTheDocument();
      expect(screen.getByText("65%")).toBeInTheDocument();
    });

    it("shows skip button when onSkip is provided", () => {
      render(<DecisionWizard {...defaultProps} />);

      expect(screen.getByText("Skip")).toBeInTheDocument();
    });

    it("hides skip button when onSkip is not provided", () => {
      render(<DecisionWizard {...defaultProps} onSkip={undefined} />);

      expect(screen.queryByText("Skip")).not.toBeInTheDocument();
    });

    it("shows progress indicator with step icons", () => {
      render(<DecisionWizard {...defaultProps} />);

      // Should have 4 step indicators (progress dots/icons)
      const stepButtons = screen.getAllByRole("button").filter((btn) =>
        btn.className.includes("flex flex-col items-center")
      );
      expect(stepButtons).toHaveLength(4);
    });
  });

  describe("navigation", () => {
    it("advances to next step when clicking Next", async () => {
      const user = userEvent.setup();
      render(<DecisionWizard {...defaultProps} />);

      // Should be on financial step
      expect(screen.getByText("Financial Analysis")).toBeInTheDocument();

      // Click next
      await user.click(screen.getByText("Next"));

      // Should be on risk step
      await waitFor(() => {
        expect(screen.getByText("Risk Assessment")).toBeInTheDocument();
      });
    });

    it("goes back when clicking Back", async () => {
      const user = userEvent.setup();
      render(<DecisionWizard {...defaultProps} />);

      // Go to step 2
      await user.click(screen.getByText("Next"));
      await waitFor(() => {
        expect(screen.getByText("Risk Assessment")).toBeInTheDocument();
      });

      // Go back
      await user.click(screen.getByText("Back"));

      await waitFor(() => {
        expect(screen.getByText("Financial Analysis")).toBeInTheDocument();
      });
    });

    it("disables back button on first step", () => {
      render(<DecisionWizard {...defaultProps} />);

      // Back button should be hidden/invisible on first step
      const backButton = screen.getByText("Back").closest("button");
      expect(backButton).toHaveClass("invisible");
    });

    it("shows Generate Recommendation on last step", async () => {
      const user = userEvent.setup();
      render(<DecisionWizard {...defaultProps} />);

      // Navigate to last step (4 steps total)
      await user.click(screen.getByText("Next")); // Financial -> Risk
      await waitFor(() => {
        expect(screen.getByText("Risk Assessment")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Next")); // Risk -> Career
      await waitFor(() => {
        expect(screen.getByText("Career Factors")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Next")); // Career -> Personal
      await waitFor(() => {
        expect(screen.getByText("Personal Factors")).toBeInTheDocument();
      });

      // Should show Generate Recommendation button
      expect(screen.getByText("Generate Recommendation")).toBeInTheDocument();
    });
  });

  describe("risk assessment step", () => {
    it("renders runway options", async () => {
      const user = userEvent.setup();
      render(<DecisionWizard {...defaultProps} />);

      await user.click(screen.getByText("Next"));

      await waitFor(() => {
        expect(screen.getByText("What's your financial runway?")).toBeInTheDocument();
        expect(screen.getByText("Less than 6 months")).toBeInTheDocument();
        expect(screen.getByText("6-12 months")).toBeInTheDocument();
        expect(screen.getByText("More than 12 months")).toBeInTheDocument();
      });
    });

    it("renders dependents and stability questions", async () => {
      const user = userEvent.setup();
      render(<DecisionWizard {...defaultProps} />);

      await user.click(screen.getByText("Next"));

      await waitFor(() => {
        expect(screen.getByText("Do you have dependents relying on your income?")).toBeInTheDocument();
        expect(screen.getByText("Is income stability critical for you right now?")).toBeInTheDocument();
      });
    });

    it("allows selecting runway option", async () => {
      const user = userEvent.setup();
      render(<DecisionWizard {...defaultProps} />);

      await user.click(screen.getByText("Next"));

      await waitFor(() => {
        expect(screen.getByText("More than 12 months")).toBeInTheDocument();
      });

      await user.click(screen.getByText("More than 12 months"));

      // The option should be selected (has check icon or different styling)
      const option = screen.getByText("More than 12 months").closest("button");
      expect(option).toHaveClass("border-primary");
    });
  });

  describe("career factors step", () => {
    it("renders career factor selectors", async () => {
      const user = userEvent.setup();
      render(<DecisionWizard {...defaultProps} />);

      // Navigate to career step
      await user.click(screen.getByText("Next")); // -> Risk
      await waitFor(() => {
        expect(screen.getByText("Risk Assessment")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Next")); // -> Career

      await waitFor(() => {
        expect(screen.getByText("Career Factors")).toBeInTheDocument();
        expect(screen.getByText("Learning opportunity at the startup")).toBeInTheDocument();
        expect(screen.getByText("Career growth potential")).toBeInTheDocument();
        expect(screen.getByText("Network/industry exposure value")).toBeInTheDocument();
        expect(screen.getByText("Alignment with long-term career goals")).toBeInTheDocument();
      });
    });
  });

  describe("personal factors step", () => {
    it("renders risk tolerance options", async () => {
      const user = userEvent.setup();
      render(<DecisionWizard {...defaultProps} />);

      // Navigate to personal step
      await user.click(screen.getByText("Next")); // -> Risk
      await waitFor(() => {
        expect(screen.getByText("Risk Assessment")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Next")); // -> Career
      await waitFor(() => {
        expect(screen.getByText("Career Factors")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Next")); // -> Personal

      await waitFor(() => {
        expect(screen.getByText("Personal Factors")).toBeInTheDocument();
        expect(screen.getByText("What's your risk tolerance?")).toBeInTheDocument();
        expect(screen.getByText("Conservative - I prefer stability")).toBeInTheDocument();
        expect(screen.getByText("Moderate - Balanced approach")).toBeInTheDocument();
        expect(screen.getByText("Aggressive - I embrace risk")).toBeInTheDocument();
      });
    });
  });

  describe("completion", () => {
    it("calls onComplete with recommendation when finishing wizard", async () => {
      const onComplete = vi.fn();
      const user = userEvent.setup();
      render(<DecisionWizard {...defaultProps} onComplete={onComplete} />);

      // Navigate through all steps
      await user.click(screen.getByText("Next")); // -> Risk
      await waitFor(() => {
        expect(screen.getByText("Risk Assessment")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Next")); // -> Career
      await waitFor(() => {
        expect(screen.getByText("Career Factors")).toBeInTheDocument();
      });
      await user.click(screen.getByText("Next")); // -> Personal
      await waitFor(() => {
        expect(screen.getByText("Personal Factors")).toBeInTheDocument();
      });

      // Click generate recommendation
      await user.click(screen.getByText("Generate Recommendation"));

      // Should call onComplete with recommendation and inputs
      expect(onComplete).toHaveBeenCalledTimes(1);
      const [recommendation, inputs] = onComplete.mock.calls[0];

      expect(recommendation).toHaveProperty("overallScore");
      expect(recommendation).toHaveProperty("recommendation");
      expect(recommendation).toHaveProperty("factorScores");
      expect(inputs).toHaveProperty("financial");
      expect(inputs).toHaveProperty("risk");
      expect(inputs).toHaveProperty("career");
      expect(inputs).toHaveProperty("personal");
    });

    it("calls onSkip when skip button is clicked", async () => {
      const onSkip = vi.fn();
      const user = userEvent.setup();
      render(<DecisionWizard {...defaultProps} onSkip={onSkip} />);

      await user.click(screen.getByText("Skip"));

      expect(onSkip).toHaveBeenCalledTimes(1);
    });
  });

  describe("financial analysis display", () => {
    it("shows positive styling for worth it analysis", () => {
      render(<DecisionWizard {...defaultProps} />);

      expect(screen.getByText("Financially Worth It")).toBeInTheDocument();
    });

    it("shows negative styling for not worth it analysis", () => {
      const notWorthItAnalysis: FinancialAnalysis = {
        netBenefit: -50000,
        positiveOutcomeProbability: 0.35,
        expectedValue: -30000,
        isWorthIt: false,
      };

      render(<DecisionWizard {...defaultProps} financialAnalysis={notWorthItAnalysis} />);

      expect(screen.getByText("Financially Not Worth It")).toBeInTheDocument();
    });
  });
});
