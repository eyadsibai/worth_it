/**
 * Decision Framework - Types and Scoring Logic
 *
 * This module provides a structured decision-making framework that helps users
 * evaluate job offers beyond just financial analysis. It considers:
 * - Financial analysis (from the app's calculations)
 * - Risk assessment (financial runway, stability needs)
 * - Career factors (learning opportunity, growth potential)
 * - Personal factors (risk tolerance, life stage)
 */

// ============================================================================
// Types
// ============================================================================

export type RiskToleranceLevel = "conservative" | "moderate" | "aggressive";
export type FactorLevel = "low" | "medium" | "high";
export type RunwayLevel = "less_than_6_months" | "6_to_12_months" | "more_than_12_months";

export interface FinancialAnalysis {
  /** Net benefit/loss from taking the startup offer */
  netBenefit: number;
  /** Probability of positive outcome from Monte Carlo (0-1) */
  positiveOutcomeProbability: number;
  /** Expected value from Monte Carlo simulation */
  expectedValue: number;
  /** Is this financially "worth it"? */
  isWorthIt: boolean;
}

export interface RiskAssessment {
  /** How much financial runway do they have? */
  financialRunway: RunwayLevel;
  /** Do they have dependents relying on stable income? */
  hasDependents: boolean;
  /** Is income stability critical for them? */
  needsIncomeStability: boolean;
}

export interface CareerFactors {
  /** Learning opportunity at the startup */
  learningOpportunity: FactorLevel;
  /** Career growth potential */
  careerGrowth: FactorLevel;
  /** Network/industry exposure value */
  networkValue: FactorLevel;
  /** Alignment with long-term career goals */
  goalAlignment: FactorLevel;
}

export interface PersonalFactors {
  /** Overall risk tolerance */
  riskTolerance: RiskToleranceLevel;
  /** Current life stage flexibility */
  lifeStageFlexibility: FactorLevel;
  /** Excitement about the opportunity */
  excitementLevel: FactorLevel;
}

export interface DecisionInputs {
  financial: FinancialAnalysis;
  risk: RiskAssessment;
  career: CareerFactors;
  personal: PersonalFactors;
}

export interface FactorScore {
  /** Score from 0-10 */
  score: number;
  /** Maximum possible score */
  maxScore: number;
  /** Label for this factor */
  label: string;
  /** Brief explanation of the score */
  explanation: string;
}

export interface DecisionRecommendation {
  /** Overall score from 0-10 */
  overallScore: number;
  /** Recommendation: accept, lean_accept, neutral, lean_reject, reject */
  recommendation: "accept" | "lean_accept" | "neutral" | "lean_reject" | "reject";
  /** Human-readable recommendation text */
  recommendationText: string;
  /** Individual factor scores */
  factorScores: {
    financial: FactorScore;
    risk: FactorScore;
    career: FactorScore;
    personal: FactorScore;
  };
  /** Key considerations (pros and cons) */
  considerations: {
    pros: string[];
    cons: string[];
    warnings: string[];
  };
}

export interface ComparisonFactor {
  factor: string;
  currentJob: string;
  startup: string;
  advantage: "current" | "startup" | "neutral";
}

// ============================================================================
// Scoring Weights
// ============================================================================

/** Weights for each factor category (must sum to 1.0) */
export const FACTOR_WEIGHTS = {
  financial: 0.35,
  risk: 0.25,
  career: 0.25,
  personal: 0.15,
} as const;

// ============================================================================
// Scoring Functions
// ============================================================================

/**
 * Score financial analysis (0-10)
 */
export function scoreFinancial(financial: FinancialAnalysis): FactorScore {
  let score = 5; // Start neutral
  let explanation = "";

  // Net benefit scoring (-2 to +3)
  if (financial.netBenefit > 200000) {
    score += 3;
    explanation = "Strong expected financial gain";
  } else if (financial.netBenefit > 50000) {
    score += 2;
    explanation = "Moderate expected financial gain";
  } else if (financial.netBenefit > 0) {
    score += 1;
    explanation = "Slight expected financial gain";
  } else if (financial.netBenefit > -50000) {
    score -= 1;
    explanation = "Slight expected financial loss";
  } else {
    score -= 2;
    explanation = "Significant expected financial loss";
  }

  // Probability bonus/penalty (-1 to +2)
  if (financial.positiveOutcomeProbability > 0.7) {
    score += 2;
    explanation += " with high confidence";
  } else if (financial.positiveOutcomeProbability > 0.5) {
    score += 1;
    explanation += " with moderate confidence";
  } else if (financial.positiveOutcomeProbability < 0.3) {
    score -= 1;
    explanation += " but low probability of success";
  }

  // Clamp to 0-10
  score = Math.max(0, Math.min(10, score));

  return {
    score,
    maxScore: 10,
    label: "Financial",
    explanation,
  };
}

/**
 * Score risk assessment (0-10)
 * Higher score = better risk alignment (safer to take the startup)
 */
export function scoreRisk(risk: RiskAssessment): FactorScore {
  let score = 5; // Start neutral
  const factors: string[] = [];

  // Financial runway
  if (risk.financialRunway === "more_than_12_months") {
    score += 2;
    factors.push("strong financial cushion");
  } else if (risk.financialRunway === "6_to_12_months") {
    score += 0;
    factors.push("adequate runway");
  } else {
    score -= 2;
    factors.push("limited financial runway");
  }

  // Dependents
  if (risk.hasDependents) {
    score -= 1;
    factors.push("family financial obligations");
  } else {
    score += 1;
    factors.push("flexible financial situation");
  }

  // Income stability needs
  if (risk.needsIncomeStability) {
    score -= 2;
    factors.push("needs stable income");
  } else {
    score += 1;
    factors.push("can handle income variability");
  }

  // Clamp to 0-10
  score = Math.max(0, Math.min(10, score));

  const explanation = factors.length > 0
    ? factors.join(", ")
    : "Neutral risk profile";

  return {
    score,
    maxScore: 10,
    label: "Risk Profile",
    explanation: explanation.charAt(0).toUpperCase() + explanation.slice(1),
  };
}

/**
 * Score career factors (0-10)
 */
export function scoreCareer(career: CareerFactors): FactorScore {
  const levelScores: Record<FactorLevel, number> = {
    low: 0,
    medium: 1,
    high: 2,
  };

  let score = 2; // Base score
  const highlights: string[] = [];

  // Learning opportunity (weight: 1.5)
  const learningScore = levelScores[career.learningOpportunity] * 1.5;
  score += learningScore;
  if (career.learningOpportunity === "high") {
    highlights.push("excellent learning opportunity");
  }

  // Career growth (weight: 1.5)
  const growthScore = levelScores[career.careerGrowth] * 1.5;
  score += growthScore;
  if (career.careerGrowth === "high") {
    highlights.push("strong career growth potential");
  }

  // Network value (weight: 1)
  score += levelScores[career.networkValue];
  if (career.networkValue === "high") {
    highlights.push("valuable network exposure");
  }

  // Goal alignment (weight: 1)
  score += levelScores[career.goalAlignment];
  if (career.goalAlignment === "high") {
    highlights.push("aligns with long-term goals");
  }

  // Clamp to 0-10
  score = Math.max(0, Math.min(10, score));

  const explanation = highlights.length > 0
    ? highlights.join(", ")
    : career.learningOpportunity === "low" && career.careerGrowth === "low"
      ? "Limited career advancement opportunity"
      : "Moderate career opportunity";

  return {
    score,
    maxScore: 10,
    label: "Career",
    explanation: explanation.charAt(0).toUpperCase() + explanation.slice(1),
  };
}

/**
 * Score personal factors (0-10)
 */
export function scorePersonal(personal: PersonalFactors): FactorScore {
  let score = 5; // Start neutral
  const factors: string[] = [];

  // Risk tolerance
  if (personal.riskTolerance === "aggressive") {
    score += 2;
    factors.push("comfortable with risk");
  } else if (personal.riskTolerance === "conservative") {
    score -= 2;
    factors.push("prefers stability");
  }

  // Life stage flexibility
  const flexScores: Record<FactorLevel, number> = { low: -1, medium: 0, high: 1 };
  score += flexScores[personal.lifeStageFlexibility];
  if (personal.lifeStageFlexibility === "high") {
    factors.push("flexible life situation");
  } else if (personal.lifeStageFlexibility === "low") {
    factors.push("significant life commitments");
  }

  // Excitement level
  const exciteScores: Record<FactorLevel, number> = { low: -1, medium: 0, high: 2 };
  score += exciteScores[personal.excitementLevel];
  if (personal.excitementLevel === "high") {
    factors.push("genuinely excited about opportunity");
  } else if (personal.excitementLevel === "low") {
    factors.push("not particularly excited");
  }

  // Clamp to 0-10
  score = Math.max(0, Math.min(10, score));

  const explanation = factors.length > 0
    ? factors.join(", ")
    : "Neutral personal fit";

  return {
    score,
    maxScore: 10,
    label: "Personal Fit",
    explanation: explanation.charAt(0).toUpperCase() + explanation.slice(1),
  };
}

// ============================================================================
// Main Decision Function
// ============================================================================

/**
 * Generate a comprehensive decision recommendation based on all inputs
 */
export function generateRecommendation(inputs: DecisionInputs): DecisionRecommendation {
  // Calculate individual scores
  const financialScore = scoreFinancial(inputs.financial);
  const riskScore = scoreRisk(inputs.risk);
  const careerScore = scoreCareer(inputs.career);
  const personalScore = scorePersonal(inputs.personal);

  // Calculate weighted overall score
  const overallScore =
    financialScore.score * FACTOR_WEIGHTS.financial +
    riskScore.score * FACTOR_WEIGHTS.risk +
    careerScore.score * FACTOR_WEIGHTS.career +
    personalScore.score * FACTOR_WEIGHTS.personal;

  // Determine recommendation
  let recommendation: DecisionRecommendation["recommendation"];
  let recommendationText: string;

  if (overallScore >= 7.5) {
    recommendation = "accept";
    recommendationText = "This looks like a strong opportunity for you. The numbers and personal factors align well.";
  } else if (overallScore >= 6) {
    recommendation = "lean_accept";
    recommendationText = "The opportunity has merit. Consider the warnings below, but overall it leans positive.";
  } else if (overallScore >= 4.5) {
    recommendation = "neutral";
    recommendationText = "This is a close call. Weigh the pros and cons carefully based on what matters most to you.";
  } else if (overallScore >= 3) {
    recommendation = "lean_reject";
    recommendationText = "There are some concerns. The opportunity may not be the best fit given your situation.";
  } else {
    recommendation = "reject";
    recommendationText = "This opportunity doesn't align well with your current situation and priorities.";
  }

  // Generate considerations
  const pros: string[] = [];
  const cons: string[] = [];
  const warnings: string[] = [];

  // Financial considerations
  if (inputs.financial.isWorthIt) {
    pros.push("Positive expected financial value");
  } else {
    cons.push("Negative expected financial value");
  }

  if (inputs.financial.positiveOutcomeProbability < 0.4) {
    warnings.push("Low probability of positive outcome - high uncertainty");
  }

  // Risk considerations
  if (inputs.risk.financialRunway === "less_than_6_months") {
    warnings.push("Limited financial runway increases stress risk");
  }
  if (inputs.risk.hasDependents && inputs.risk.needsIncomeStability) {
    warnings.push("Family financial obligations require careful consideration");
  }

  // Career considerations
  if (inputs.career.learningOpportunity === "high") {
    pros.push("Strong learning and skill development opportunity");
  }
  if (inputs.career.careerGrowth === "high") {
    pros.push("Excellent career advancement potential");
  }
  if (inputs.career.goalAlignment === "low") {
    cons.push("May not align with your long-term career goals");
  }

  // Personal considerations
  if (inputs.personal.excitementLevel === "high") {
    pros.push("You're genuinely excited about this opportunity");
  }
  if (inputs.personal.excitementLevel === "low") {
    cons.push("Lack of excitement may affect long-term satisfaction");
  }
  if (inputs.personal.riskTolerance === "conservative" && inputs.financial.positiveOutcomeProbability < 0.6) {
    warnings.push("This may be riskier than your typical comfort level");
  }

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    recommendation,
    recommendationText,
    factorScores: {
      financial: financialScore,
      risk: riskScore,
      career: careerScore,
      personal: personalScore,
    },
    considerations: {
      pros,
      cons,
      warnings,
    },
  };
}

// ============================================================================
// Comparison Table Generator
// ============================================================================

/**
 * Generate comparison factors for the decision table
 */
export function generateComparisonTable(inputs: DecisionInputs): ComparisonFactor[] {
  const factors: ComparisonFactor[] = [];

  // Income certainty
  factors.push({
    factor: "Income Certainty",
    currentJob: "High",
    startup: inputs.financial.positiveOutcomeProbability > 0.6 ? "Medium" : "Low",
    advantage: "current",
  });

  // Upside potential
  factors.push({
    factor: "Upside Potential",
    currentJob: "Low",
    startup: inputs.financial.netBenefit > 100000 ? "High" : "Medium",
    advantage: "startup",
  });

  // Learning opportunity
  factors.push({
    factor: "Learning Opportunity",
    currentJob: "Medium", // Assume medium for current job
    startup: capitalize(inputs.career.learningOpportunity),
    advantage: inputs.career.learningOpportunity === "high" ? "startup"
      : inputs.career.learningOpportunity === "low" ? "current" : "neutral",
  });

  // Career growth
  factors.push({
    factor: "Career Growth",
    currentJob: "Medium",
    startup: capitalize(inputs.career.careerGrowth),
    advantage: inputs.career.careerGrowth === "high" ? "startup"
      : inputs.career.careerGrowth === "low" ? "current" : "neutral",
  });

  // Risk level
  factors.push({
    factor: "Risk Level",
    currentJob: "Low",
    startup: "High",
    advantage: inputs.personal.riskTolerance === "aggressive" ? "neutral" : "current",
  });

  // Financial fit
  const runwayLabel = inputs.risk.financialRunway === "more_than_12_months" ? "Strong"
    : inputs.risk.financialRunway === "6_to_12_months" ? "Adequate" : "Tight";
  factors.push({
    factor: "Financial Fit",
    currentJob: "Safe",
    startup: runwayLabel,
    advantage: inputs.risk.financialRunway === "more_than_12_months" ? "neutral" : "current",
  });

  return factors;
}

// ============================================================================
// Helpers
// ============================================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Get recommendation color for UI styling
 */
export function getRecommendationColor(recommendation: DecisionRecommendation["recommendation"]): string {
  switch (recommendation) {
    case "accept":
      return "text-green-600 dark:text-green-400";
    case "lean_accept":
      return "text-lime-600 dark:text-lime-400";
    case "neutral":
      return "text-amber-600 dark:text-amber-400";
    case "lean_reject":
      return "text-orange-600 dark:text-orange-400";
    case "reject":
      return "text-red-600 dark:text-red-400";
  }
}

/**
 * Get recommendation label for display
 */
export function getRecommendationLabel(recommendation: DecisionRecommendation["recommendation"]): string {
  switch (recommendation) {
    case "accept":
      return "Strongly Recommend";
    case "lean_accept":
      return "Lean Towards Accept";
    case "neutral":
      return "Neutral - Your Call";
    case "lean_reject":
      return "Lean Towards Decline";
    case "reject":
      return "Recommend Declining";
  }
}
