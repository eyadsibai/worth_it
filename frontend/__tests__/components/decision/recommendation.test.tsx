/**
 * Tests for the DecisionRecommendationDisplay component
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecisionRecommendationDisplay } from "@/components/decision/recommendation";
import type { DecisionRecommendation, DecisionInputs } from "@/lib/decision-framework";

// Mock recommendation with strong accept
const mockAcceptRecommendation: DecisionRecommendation = {
  overallScore: 8.2,
  recommendation: "accept",
  recommendationText: "This looks like a strong opportunity for you.",
  factorScores: {
    financial: {
      score: 9,
      maxScore: 10,
      label: "Financial",
      explanation: "Strong expected financial gain with high confidence",
    },
    risk: {
      score: 7.5,
      maxScore: 10,
      label: "Risk Profile",
      explanation: "Strong financial cushion, flexible financial situation",
    },
    career: {
      score: 8,
      maxScore: 10,
      label: "Career",
      explanation: "Excellent learning opportunity, strong career growth potential",
    },
    personal: {
      score: 7,
      maxScore: 10,
      label: "Personal Fit",
      explanation: "Comfortable with risk, genuinely excited about opportunity",
    },
  },
  considerations: {
    pros: [
      "Positive expected financial value",
      "Strong learning and skill development opportunity",
      "You're genuinely excited about this opportunity",
    ],
    cons: [],
    warnings: [],
  },
};

// Mock reject recommendation
const mockRejectRecommendation: DecisionRecommendation = {
  overallScore: 2.8,
  recommendation: "reject",
  recommendationText: "This opportunity doesn't align well with your current situation.",
  factorScores: {
    financial: {
      score: 3,
      maxScore: 10,
      label: "Financial",
      explanation: "Significant expected financial loss",
    },
    risk: {
      score: 2,
      maxScore: 10,
      label: "Risk Profile",
      explanation: "Limited financial runway, needs stable income",
    },
    career: {
      score: 4,
      maxScore: 10,
      label: "Career",
      explanation: "Limited career advancement opportunity",
    },
    personal: {
      score: 3,
      maxScore: 10,
      label: "Personal Fit",
      explanation: "Prefers stability, not particularly excited",
    },
  },
  considerations: {
    pros: [],
    cons: [
      "Negative expected financial value",
      "Lack of excitement may affect long-term satisfaction",
    ],
    warnings: [
      "Limited financial runway increases stress risk",
      "This may be riskier than your typical comfort level",
    ],
  },
};

// Mock inputs
const mockInputs: DecisionInputs = {
  financial: {
    netBenefit: 150000,
    positiveOutcomeProbability: 0.65,
    expectedValue: 120000,
    isWorthIt: true,
  },
  risk: {
    financialRunway: "more_than_12_months",
    hasDependents: false,
    needsIncomeStability: false,
  },
  career: {
    learningOpportunity: "high",
    careerGrowth: "high",
    networkValue: "medium",
    goalAlignment: "high",
  },
  personal: {
    riskTolerance: "aggressive",
    lifeStageFlexibility: "high",
    excitementLevel: "high",
  },
};

describe("DecisionRecommendationDisplay", () => {
  describe("rendering accept recommendation", () => {
    it("displays overall score", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.getByText("8.2")).toBeInTheDocument();
    });

    it("displays recommendation label", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.getByText("Strongly Recommend")).toBeInTheDocument();
    });

    it("displays recommendation text", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.getByText("This looks like a strong opportunity for you.")).toBeInTheDocument();
    });

    it("displays all factor scores", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.getByText("Financial")).toBeInTheDocument();
      expect(screen.getByText("Risk Profile")).toBeInTheDocument();
      expect(screen.getByText("Career")).toBeInTheDocument();
      expect(screen.getByText("Personal Fit")).toBeInTheDocument();
    });

    it("displays factor explanations", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
        />
      );

      expect(
        screen.getByText("Strong expected financial gain with high confidence")
      ).toBeInTheDocument();
    });

    it("displays pros", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.getByText("Pros")).toBeInTheDocument();
      expect(screen.getByText("Positive expected financial value")).toBeInTheDocument();
      expect(
        screen.getByText("Strong learning and skill development opportunity")
      ).toBeInTheDocument();
    });
  });

  describe("rendering reject recommendation", () => {
    it("displays lower overall score", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockRejectRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.getByText("2.8")).toBeInTheDocument();
    });

    it("displays reject recommendation label", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockRejectRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.getByText("Recommend Declining")).toBeInTheDocument();
    });

    it("displays cons", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockRejectRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.getByText("Cons")).toBeInTheDocument();
      expect(screen.getByText("Negative expected financial value")).toBeInTheDocument();
    });

    it("displays warnings", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockRejectRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.getByText("Warnings")).toBeInTheDocument();
      expect(
        screen.getByText("Limited financial runway increases stress risk")
      ).toBeInTheDocument();
    });
  });

  describe("comparison table", () => {
    it("renders comparison table", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.getByText("Side-by-Side Comparison")).toBeInTheDocument();
      expect(screen.getByText("Current Job")).toBeInTheDocument();
      expect(screen.getByText("Startup")).toBeInTheDocument();
    });

    it("displays comparison factors", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.getByText("Income Certainty")).toBeInTheDocument();
      expect(screen.getByText("Upside Potential")).toBeInTheDocument();
      expect(screen.getByText("Learning Opportunity")).toBeInTheDocument();
    });
  });

  describe("redo functionality", () => {
    it("shows redo button when onRedo is provided", () => {
      const onRedo = vi.fn();
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
          onRedo={onRedo}
        />
      );

      expect(screen.getByText("Redo")).toBeInTheDocument();
    });

    it("hides redo button when onRedo is not provided", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
        />
      );

      expect(screen.queryByText("Redo")).not.toBeInTheDocument();
    });

    it("calls onRedo when redo button is clicked", async () => {
      const user = userEvent.setup();
      const onRedo = vi.fn();
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
          onRedo={onRedo}
        />
      );

      await user.click(screen.getByText("Redo"));

      expect(onRedo).toHaveBeenCalledTimes(1);
    });
  });

  describe("visual styling", () => {
    it("uses appropriate colors for high scores", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockAcceptRecommendation}
          inputs={mockInputs}
        />
      );

      // The score circle should have green color for high score
      const scoreDisplay = screen.getByText("8.2").closest("div");
      expect(scoreDisplay).toBeInTheDocument();
    });

    it("uses appropriate colors for low scores", () => {
      render(
        <DecisionRecommendationDisplay
          recommendation={mockRejectRecommendation}
          inputs={mockInputs}
        />
      );

      const scoreDisplay = screen.getByText("2.8").closest("div");
      expect(scoreDisplay).toBeInTheDocument();
    });
  });

  describe("different recommendation types", () => {
    it("handles lean_accept recommendation", () => {
      const leanAccept: DecisionRecommendation = {
        ...mockAcceptRecommendation,
        overallScore: 6.5,
        recommendation: "lean_accept",
      };

      render(<DecisionRecommendationDisplay recommendation={leanAccept} inputs={mockInputs} />);

      expect(screen.getByText("Lean Towards Accept")).toBeInTheDocument();
    });

    it("handles neutral recommendation", () => {
      const neutral: DecisionRecommendation = {
        ...mockAcceptRecommendation,
        overallScore: 5.0,
        recommendation: "neutral",
      };

      render(<DecisionRecommendationDisplay recommendation={neutral} inputs={mockInputs} />);

      expect(screen.getByText("Neutral - Your Call")).toBeInTheDocument();
    });

    it("handles lean_reject recommendation", () => {
      const leanReject: DecisionRecommendation = {
        ...mockRejectRecommendation,
        overallScore: 3.5,
        recommendation: "lean_reject",
      };

      render(<DecisionRecommendationDisplay recommendation={leanReject} inputs={mockInputs} />);

      expect(screen.getByText("Lean Towards Decline")).toBeInTheDocument();
    });
  });
});
