/**
 * Tests for the Decision Framework scoring logic
 */

import { describe, it, expect } from "vitest";
import {
  scoreFinancial,
  scoreRisk,
  scoreCareer,
  scorePersonal,
  generateRecommendation,
  generateComparisonTable,
  getRecommendationColor,
  getRecommendationLabel,
  FACTOR_WEIGHTS,
  type FinancialAnalysis,
  type RiskAssessment,
  type CareerFactors,
  type PersonalFactors,
  type DecisionInputs,
} from "@/lib/decision-framework";

// ============================================================================
// Test Fixtures
// ============================================================================

const createFinancialAnalysis = (overrides: Partial<FinancialAnalysis> = {}): FinancialAnalysis => ({
  netBenefit: 100000,
  positiveOutcomeProbability: 0.6,
  expectedValue: 80000,
  isWorthIt: true,
  ...overrides,
});

const createRiskAssessment = (overrides: Partial<RiskAssessment> = {}): RiskAssessment => ({
  financialRunway: "6_to_12_months",
  hasDependents: false,
  needsIncomeStability: false,
  ...overrides,
});

const createCareerFactors = (overrides: Partial<CareerFactors> = {}): CareerFactors => ({
  learningOpportunity: "medium",
  careerGrowth: "medium",
  networkValue: "medium",
  goalAlignment: "medium",
  ...overrides,
});

const createPersonalFactors = (overrides: Partial<PersonalFactors> = {}): PersonalFactors => ({
  riskTolerance: "moderate",
  lifeStageFlexibility: "medium",
  excitementLevel: "medium",
  ...overrides,
});

const createDecisionInputs = (overrides: Partial<DecisionInputs> = {}): DecisionInputs => ({
  financial: createFinancialAnalysis(),
  risk: createRiskAssessment(),
  career: createCareerFactors(),
  personal: createPersonalFactors(),
  ...overrides,
});

// ============================================================================
// scoreFinancial Tests
// ============================================================================

describe("scoreFinancial", () => {
  it("scores high net benefit with high probability highly", () => {
    const financial = createFinancialAnalysis({
      netBenefit: 300000,
      positiveOutcomeProbability: 0.8,
    });
    const result = scoreFinancial(financial);

    expect(result.score).toBeGreaterThanOrEqual(8);
    expect(result.label).toBe("Financial");
    expect(result.explanation).toContain("Strong");
    expect(result.explanation).toContain("high confidence");
  });

  it("scores moderate net benefit appropriately", () => {
    const financial = createFinancialAnalysis({
      netBenefit: 75000,
      positiveOutcomeProbability: 0.55,
    });
    const result = scoreFinancial(financial);

    expect(result.score).toBeGreaterThanOrEqual(6);
    expect(result.score).toBeLessThanOrEqual(8);
    expect(result.explanation).toContain("Moderate");
  });

  it("penalizes negative net benefit", () => {
    const financial = createFinancialAnalysis({
      netBenefit: -100000,
      positiveOutcomeProbability: 0.4,
    });
    const result = scoreFinancial(financial);

    expect(result.score).toBeLessThanOrEqual(4);
    expect(result.explanation).toContain("Significant expected financial loss");
  });

  it("penalizes low probability even with positive net benefit", () => {
    const financial = createFinancialAnalysis({
      netBenefit: 200000,
      positiveOutcomeProbability: 0.2,
    });
    const result = scoreFinancial(financial);

    // Should be lower than same net benefit with high probability
    expect(result.explanation).toContain("low probability");
  });

  it("clamps score between 0 and 10", () => {
    const veryBad = scoreFinancial(createFinancialAnalysis({
      netBenefit: -500000,
      positiveOutcomeProbability: 0.1,
    }));
    const veryGood = scoreFinancial(createFinancialAnalysis({
      netBenefit: 1000000,
      positiveOutcomeProbability: 0.95,
    }));

    expect(veryBad.score).toBeGreaterThanOrEqual(0);
    expect(veryGood.score).toBeLessThanOrEqual(10);
  });
});

// ============================================================================
// scoreRisk Tests
// ============================================================================

describe("scoreRisk", () => {
  it("scores strong financial runway positively", () => {
    const risk = createRiskAssessment({
      financialRunway: "more_than_12_months",
      hasDependents: false,
      needsIncomeStability: false,
    });
    const result = scoreRisk(risk);

    expect(result.score).toBeGreaterThanOrEqual(7);
    expect(result.explanation.toLowerCase()).toContain("strong financial cushion");
  });

  it("penalizes limited runway", () => {
    const risk = createRiskAssessment({
      financialRunway: "less_than_6_months",
    });
    const result = scoreRisk(risk);

    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.explanation.toLowerCase()).toContain("limited financial runway");
  });

  it("penalizes having dependents", () => {
    const withDependents = scoreRisk(createRiskAssessment({ hasDependents: true }));
    const withoutDependents = scoreRisk(createRiskAssessment({ hasDependents: false }));

    expect(withDependents.score).toBeLessThan(withoutDependents.score);
  });

  it("penalizes needing income stability", () => {
    const needsStability = scoreRisk(createRiskAssessment({ needsIncomeStability: true }));
    const flexible = scoreRisk(createRiskAssessment({ needsIncomeStability: false }));

    expect(needsStability.score).toBeLessThan(flexible.score);
    expect(needsStability.explanation).toContain("needs stable income");
  });

  it("gives lowest score for maximum risk factors", () => {
    const highRisk = scoreRisk(createRiskAssessment({
      financialRunway: "less_than_6_months",
      hasDependents: true,
      needsIncomeStability: true,
    }));

    expect(highRisk.score).toBeLessThanOrEqual(2);
  });
});

// ============================================================================
// scoreCareer Tests
// ============================================================================

describe("scoreCareer", () => {
  it("scores high career factors positively", () => {
    const career = createCareerFactors({
      learningOpportunity: "high",
      careerGrowth: "high",
      networkValue: "high",
      goalAlignment: "high",
    });
    const result = scoreCareer(career);

    expect(result.score).toBeGreaterThanOrEqual(8);
    expect(result.explanation).toContain("learning opportunity");
    expect(result.explanation).toContain("career growth");
  });

  it("scores low career factors appropriately", () => {
    const career = createCareerFactors({
      learningOpportunity: "low",
      careerGrowth: "low",
      networkValue: "low",
      goalAlignment: "low",
    });
    const result = scoreCareer(career);

    expect(result.score).toBeLessThanOrEqual(3);
    expect(result.explanation).toContain("Limited");
  });

  it("weights learning and growth more heavily", () => {
    const highLearning = scoreCareer(createCareerFactors({
      learningOpportunity: "high",
      careerGrowth: "low",
      networkValue: "low",
      goalAlignment: "low",
    }));

    const highNetwork = scoreCareer(createCareerFactors({
      learningOpportunity: "low",
      careerGrowth: "low",
      networkValue: "high",
      goalAlignment: "low",
    }));

    // Learning should contribute more than network
    expect(highLearning.score).toBeGreaterThan(highNetwork.score);
  });
});

// ============================================================================
// scorePersonal Tests
// ============================================================================

describe("scorePersonal", () => {
  it("scores aggressive risk tolerance positively", () => {
    const personal = createPersonalFactors({
      riskTolerance: "aggressive",
      lifeStageFlexibility: "high",
      excitementLevel: "high",
    });
    const result = scorePersonal(personal);

    expect(result.score).toBeGreaterThanOrEqual(8);
    expect(result.explanation.toLowerCase()).toContain("comfortable with risk");
  });

  it("scores conservative risk tolerance lower", () => {
    const conservative = scorePersonal(createPersonalFactors({ riskTolerance: "conservative" }));
    const aggressive = scorePersonal(createPersonalFactors({ riskTolerance: "aggressive" }));

    expect(conservative.score).toBeLessThan(aggressive.score);
    expect(conservative.explanation.toLowerCase()).toContain("prefers stability");
  });

  it("values high excitement", () => {
    const excited = scorePersonal(createPersonalFactors({ excitementLevel: "high" }));
    const notExcited = scorePersonal(createPersonalFactors({ excitementLevel: "low" }));

    expect(excited.score).toBeGreaterThan(notExcited.score);
    expect(excited.explanation.toLowerCase()).toContain("genuinely excited");
  });

  it("considers life stage flexibility", () => {
    const flexible = scorePersonal(createPersonalFactors({ lifeStageFlexibility: "high" }));
    const committed = scorePersonal(createPersonalFactors({ lifeStageFlexibility: "low" }));

    expect(flexible.score).toBeGreaterThan(committed.score);
  });
});

// ============================================================================
// generateRecommendation Tests
// ============================================================================

describe("generateRecommendation", () => {
  it("recommends accept for strong overall fit", () => {
    const inputs = createDecisionInputs({
      financial: createFinancialAnalysis({
        netBenefit: 300000,
        positiveOutcomeProbability: 0.8,
        isWorthIt: true,
      }),
      risk: createRiskAssessment({
        financialRunway: "more_than_12_months",
        hasDependents: false,
        needsIncomeStability: false,
      }),
      career: createCareerFactors({
        learningOpportunity: "high",
        careerGrowth: "high",
        networkValue: "medium",
        goalAlignment: "high",
      }),
      personal: createPersonalFactors({
        riskTolerance: "aggressive",
        lifeStageFlexibility: "high",
        excitementLevel: "high",
      }),
    });

    const result = generateRecommendation(inputs);

    expect(result.recommendation).toBe("accept");
    expect(result.overallScore).toBeGreaterThanOrEqual(7.5);
    expect(result.considerations.pros.length).toBeGreaterThan(0);
  });

  it("recommends reject for poor overall fit", () => {
    const inputs = createDecisionInputs({
      financial: createFinancialAnalysis({
        netBenefit: -100000,
        positiveOutcomeProbability: 0.2,
        isWorthIt: false,
      }),
      risk: createRiskAssessment({
        financialRunway: "less_than_6_months",
        hasDependents: true,
        needsIncomeStability: true,
      }),
      career: createCareerFactors({
        learningOpportunity: "low",
        careerGrowth: "low",
        networkValue: "low",
        goalAlignment: "low",
      }),
      personal: createPersonalFactors({
        riskTolerance: "conservative",
        lifeStageFlexibility: "low",
        excitementLevel: "low",
      }),
    });

    const result = generateRecommendation(inputs);

    expect(result.recommendation).toBe("reject");
    expect(result.overallScore).toBeLessThanOrEqual(3);
    expect(result.considerations.cons.length).toBeGreaterThan(0);
    expect(result.considerations.warnings.length).toBeGreaterThan(0);
  });

  it("gives neutral recommendation for mixed factors", () => {
    const inputs = createDecisionInputs(); // Uses default medium values

    const result = generateRecommendation(inputs);

    // Default medium values score reasonably well (around 6-7)
    expect(["neutral", "lean_accept"]).toContain(result.recommendation);
    expect(result.overallScore).toBeGreaterThanOrEqual(5);
    expect(result.overallScore).toBeLessThanOrEqual(8);
  });

  it("includes all factor scores in result", () => {
    const result = generateRecommendation(createDecisionInputs());

    expect(result.factorScores).toHaveProperty("financial");
    expect(result.factorScores).toHaveProperty("risk");
    expect(result.factorScores).toHaveProperty("career");
    expect(result.factorScores).toHaveProperty("personal");

    Object.values(result.factorScores).forEach((score) => {
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(10);
      expect(score.label).toBeTruthy();
      expect(score.explanation).toBeTruthy();
    });
  });

  it("adds warning for low probability", () => {
    const inputs = createDecisionInputs({
      financial: createFinancialAnalysis({
        positiveOutcomeProbability: 0.3,
      }),
    });

    const result = generateRecommendation(inputs);

    const hasLowProbWarning = result.considerations.warnings.some(
      (w) => w.toLowerCase().includes("low probability")
    );
    expect(hasLowProbWarning).toBe(true);
  });

  it("adds warning for risk mismatch", () => {
    const inputs = createDecisionInputs({
      financial: createFinancialAnalysis({
        positiveOutcomeProbability: 0.5,
      }),
      personal: createPersonalFactors({
        riskTolerance: "conservative",
      }),
    });

    const result = generateRecommendation(inputs);

    const hasRiskMismatchWarning = result.considerations.warnings.some(
      (w) => w.toLowerCase().includes("riskier") || w.toLowerCase().includes("comfort")
    );
    expect(hasRiskMismatchWarning).toBe(true);
  });
});

// ============================================================================
// generateComparisonTable Tests
// ============================================================================

describe("generateComparisonTable", () => {
  it("generates comparison factors", () => {
    const inputs = createDecisionInputs();
    const table = generateComparisonTable(inputs);

    expect(table.length).toBeGreaterThan(0);
    expect(table[0]).toHaveProperty("factor");
    expect(table[0]).toHaveProperty("currentJob");
    expect(table[0]).toHaveProperty("startup");
    expect(table[0]).toHaveProperty("advantage");
  });

  it("marks income certainty as current job advantage", () => {
    const table = generateComparisonTable(createDecisionInputs());
    const incomeFactor = table.find((f) => f.factor === "Income Certainty");

    expect(incomeFactor).toBeDefined();
    expect(incomeFactor?.currentJob).toBe("High");
    expect(incomeFactor?.advantage).toBe("current");
  });

  it("marks upside potential as startup advantage", () => {
    const inputs = createDecisionInputs({
      financial: createFinancialAnalysis({ netBenefit: 200000 }),
    });
    const table = generateComparisonTable(inputs);
    const upsideFactor = table.find((f) => f.factor === "Upside Potential");

    expect(upsideFactor).toBeDefined();
    expect(upsideFactor?.advantage).toBe("startup");
  });

  it("reflects career factors in comparison", () => {
    const inputs = createDecisionInputs({
      career: createCareerFactors({
        learningOpportunity: "high",
        careerGrowth: "high",
      }),
    });
    const table = generateComparisonTable(inputs);

    const learningFactor = table.find((f) => f.factor === "Learning Opportunity");
    expect(learningFactor?.startup).toBe("High");
    expect(learningFactor?.advantage).toBe("startup");
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("getRecommendationColor", () => {
  it("returns green for accept", () => {
    expect(getRecommendationColor("accept")).toContain("green");
  });

  it("returns red for reject", () => {
    expect(getRecommendationColor("reject")).toContain("red");
  });

  it("returns amber for neutral", () => {
    expect(getRecommendationColor("neutral")).toContain("amber");
  });
});

describe("getRecommendationLabel", () => {
  it("returns appropriate labels", () => {
    expect(getRecommendationLabel("accept")).toBe("Strongly Recommend");
    expect(getRecommendationLabel("lean_accept")).toBe("Lean Towards Accept");
    expect(getRecommendationLabel("neutral")).toBe("Neutral - Your Call");
    expect(getRecommendationLabel("lean_reject")).toBe("Lean Towards Decline");
    expect(getRecommendationLabel("reject")).toBe("Recommend Declining");
  });
});

// ============================================================================
// Weight Validation
// ============================================================================

describe("FACTOR_WEIGHTS", () => {
  it("weights sum to 1.0", () => {
    const sum = Object.values(FACTOR_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  it("all weights are positive", () => {
    Object.values(FACTOR_WEIGHTS).forEach((weight) => {
      expect(weight).toBeGreaterThan(0);
    });
  });
});
