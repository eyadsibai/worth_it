"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronLeft,
  DollarSign,
  Shield,
  Briefcase,
  User,
  Check,
  Sparkles,
} from "lucide-react";
import type {
  FinancialAnalysis,
  RiskAssessment,
  CareerFactors,
  PersonalFactors,
  DecisionInputs,
  DecisionRecommendation,
  RunwayLevel,
  FactorLevel,
  RiskToleranceLevel,
} from "@/lib/decision-framework";
import { generateRecommendation } from "@/lib/decision-framework";

// ============================================================================
// Types
// ============================================================================

interface DecisionWizardProps {
  /** Financial analysis from the app's calculations */
  financialAnalysis: FinancialAnalysis;
  /** Called when recommendation is generated */
  onComplete: (recommendation: DecisionRecommendation, inputs: DecisionInputs) => void;
  /** Called when user skips the wizard */
  onSkip?: () => void;
  /** Optional class name */
  className?: string;
}

type WizardStep = "financial" | "risk" | "career" | "personal";

const STEPS: WizardStep[] = ["financial", "risk", "career", "personal"];

// ============================================================================
// Step Option Components
// ============================================================================

interface OptionButtonProps {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}

function OptionButton({ selected, onClick, children, className }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-xl border-2 px-4 py-3 text-left transition-all",
        "hover:border-primary/50 hover:bg-primary/5",
        "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-card text-muted-foreground",
        className
      )}
    >
      <div
        className={cn(
          "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2",
          selected ? "border-primary bg-primary" : "border-muted-foreground"
        )}
      >
        {selected && <Check className="text-primary-foreground h-3 w-3" />}
      </div>
      <span className="text-sm font-medium">{children}</span>
    </button>
  );
}

interface ToggleButtonProps {
  selected: boolean;
  onClick: () => void;
  label: string;
}

function ToggleButton({ selected, onClick, label }: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-4 py-2 text-sm font-medium transition-all",
        "focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/50"
      )}
    >
      {label}
    </button>
  );
}

// ============================================================================
// Step Content Components
// ============================================================================

interface FinancialStepProps {
  financial: FinancialAnalysis;
}

function FinancialStep({ financial }: FinancialStepProps) {
  const formatCurrency = (value: number) => {
    const absValue = Math.abs(value);
    const formatted =
      absValue >= 1000 ? `$${(absValue / 1000).toFixed(0)}K` : `$${absValue.toFixed(0)}`;
    return value >= 0 ? formatted : `-${formatted}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-muted-foreground mb-2 text-sm">
          Based on your inputs, the financial analysis shows:
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">
            Expected Net Benefit
          </p>
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              financial.netBenefit >= 0 ? "text-terminal" : "text-destructive"
            )}
          >
            {formatCurrency(financial.netBenefit)}
          </p>
        </div>
        <div className="bg-muted/50 rounded-xl p-4">
          <p className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">
            Success Probability
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {(financial.positiveOutcomeProbability * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <Badge
          variant={financial.isWorthIt ? "default" : "destructive"}
          className={cn(
            "px-4 py-1.5 text-sm",
            financial.isWorthIt && "bg-terminal hover:bg-terminal/90"
          )}
        >
          {financial.isWorthIt ? "Financially Worth It" : "Financially Not Worth It"}
        </Badge>
      </div>

      <p className="text-muted-foreground text-center text-xs">
        But finances aren&apos;t everything. Let&apos;s explore other factors that matter.
      </p>
    </div>
  );
}

interface RiskStepProps {
  risk: RiskAssessment;
  onChange: (risk: RiskAssessment) => void;
}

function RiskStep({ risk, onChange }: RiskStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium">What&apos;s your financial runway?</label>
        <div className="grid grid-cols-1 gap-2">
          {[
            { value: "less_than_6_months" as RunwayLevel, label: "Less than 6 months" },
            { value: "6_to_12_months" as RunwayLevel, label: "6-12 months" },
            { value: "more_than_12_months" as RunwayLevel, label: "More than 12 months" },
          ].map((option) => (
            <OptionButton
              key={option.value}
              selected={risk.financialRunway === option.value}
              onClick={() => onChange({ ...risk, financialRunway: option.value })}
            >
              {option.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">
          Do you have dependents relying on your income?
        </label>
        <div className="flex gap-2">
          <ToggleButton
            selected={risk.hasDependents}
            onClick={() => onChange({ ...risk, hasDependents: true })}
            label="Yes"
          />
          <ToggleButton
            selected={!risk.hasDependents}
            onClick={() => onChange({ ...risk, hasDependents: false })}
            label="No"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">
          Is income stability critical for you right now?
        </label>
        <div className="flex gap-2">
          <ToggleButton
            selected={risk.needsIncomeStability}
            onClick={() => onChange({ ...risk, needsIncomeStability: true })}
            label="Yes"
          />
          <ToggleButton
            selected={!risk.needsIncomeStability}
            onClick={() => onChange({ ...risk, needsIncomeStability: false })}
            label="No"
          />
        </div>
      </div>
    </div>
  );
}

interface FactorSelectorProps {
  label: string;
  value: FactorLevel;
  onSelect: (level: FactorLevel) => void;
}

function FactorSelector({ label, value, onSelect }: FactorSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        {(["low", "medium", "high"] as const).map((level) => (
          <ToggleButton
            key={level}
            selected={value === level}
            onClick={() => onSelect(level)}
            label={level.charAt(0).toUpperCase() + level.slice(1)}
          />
        ))}
      </div>
    </div>
  );
}

interface CareerStepProps {
  career: CareerFactors;
  onChange: (career: CareerFactors) => void;
}

function CareerStep({ career, onChange }: CareerStepProps) {
  return (
    <div className="space-y-6">
      <FactorSelector
        label="Learning opportunity at the startup"
        value={career.learningOpportunity}
        onSelect={(v) => onChange({ ...career, learningOpportunity: v })}
      />
      <FactorSelector
        label="Career growth potential"
        value={career.careerGrowth}
        onSelect={(v) => onChange({ ...career, careerGrowth: v })}
      />
      <FactorSelector
        label="Network/industry exposure value"
        value={career.networkValue}
        onSelect={(v) => onChange({ ...career, networkValue: v })}
      />
      <FactorSelector
        label="Alignment with long-term career goals"
        value={career.goalAlignment}
        onSelect={(v) => onChange({ ...career, goalAlignment: v })}
      />
    </div>
  );
}

interface PersonalStepProps {
  personal: PersonalFactors;
  onChange: (personal: PersonalFactors) => void;
}

function PersonalStep({ personal, onChange }: PersonalStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <label className="text-sm font-medium">What&apos;s your risk tolerance?</label>
        <div className="grid grid-cols-1 gap-2">
          {[
            {
              value: "conservative" as RiskToleranceLevel,
              label: "Conservative - I prefer stability",
            },
            { value: "moderate" as RiskToleranceLevel, label: "Moderate - Balanced approach" },
            { value: "aggressive" as RiskToleranceLevel, label: "Aggressive - I embrace risk" },
          ].map((option) => (
            <OptionButton
              key={option.value}
              selected={personal.riskTolerance === option.value}
              onClick={() => onChange({ ...personal, riskTolerance: option.value })}
            >
              {option.label}
            </OptionButton>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">How flexible is your life situation?</label>
        <p className="text-muted-foreground text-xs">
          Consider: location flexibility, family obligations, financial commitments
        </p>
        <div className="flex gap-2">
          {(["low", "medium", "high"] as const).map((level) => (
            <ToggleButton
              key={level}
              selected={personal.lifeStageFlexibility === level}
              onClick={() => onChange({ ...personal, lifeStageFlexibility: level })}
              label={level.charAt(0).toUpperCase() + level.slice(1)}
            />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">How excited are you about this opportunity?</label>
        <div className="flex gap-2">
          {(["low", "medium", "high"] as const).map((level) => (
            <ToggleButton
              key={level}
              selected={personal.excitementLevel === level}
              onClick={() => onChange({ ...personal, excitementLevel: level })}
              label={level.charAt(0).toUpperCase() + level.slice(1)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

const STEP_CONFIG = {
  financial: {
    icon: DollarSign,
    title: "Financial Analysis",
    description: "Your calculated financial outcomes",
  },
  risk: {
    icon: Shield,
    title: "Risk Assessment",
    description: "Evaluate your risk capacity",
  },
  career: {
    icon: Briefcase,
    title: "Career Factors",
    description: "Consider career implications",
  },
  personal: {
    icon: User,
    title: "Personal Factors",
    description: "Your personal preferences",
  },
};

export function DecisionWizard({
  financialAnalysis,
  onComplete,
  onSkip,
  className,
}: DecisionWizardProps) {
  const [currentStep, setCurrentStep] = React.useState<WizardStep>("financial");
  const [riskAssessment, setRiskAssessment] = React.useState<RiskAssessment>({
    financialRunway: "6_to_12_months",
    hasDependents: false,
    needsIncomeStability: false,
  });
  const [careerFactors, setCareerFactors] = React.useState<CareerFactors>({
    learningOpportunity: "medium",
    careerGrowth: "medium",
    networkValue: "medium",
    goalAlignment: "medium",
  });
  const [personalFactors, setPersonalFactors] = React.useState<PersonalFactors>({
    riskTolerance: "moderate",
    lifeStageFlexibility: "medium",
    excitementLevel: "medium",
  });

  const currentIndex = STEPS.indexOf(currentStep);
  const progress = ((currentIndex + 1) / STEPS.length) * 100;
  const isLastStep = currentStep === STEPS[STEPS.length - 1];
  const isFirstStep = currentStep === STEPS[0];

  const handleNext = () => {
    if (isLastStep) {
      const inputs: DecisionInputs = {
        financial: financialAnalysis,
        risk: riskAssessment,
        career: careerFactors,
        personal: personalFactors,
      };
      const recommendation = generateRecommendation(inputs);
      onComplete(recommendation, inputs);
    } else {
      setCurrentStep(STEPS[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentIndex - 1]);
    }
  };

  const stepConfig = STEP_CONFIG[currentStep];
  const StepIcon = stepConfig.icon;

  return (
    <Card className={cn("mx-auto w-full max-w-2xl", className)}>
      <CardHeader className="pb-4">
        <div className="mb-4 flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="text-primary h-5 w-5" />
            Decision Framework
          </CardTitle>
          {onSkip && (
            <Button variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
              Skip
            </Button>
          )}
        </div>

        <Progress value={progress} className="h-2" />

        <div className="mt-4 flex justify-between">
          {STEPS.map((step, idx) => {
            const config = STEP_CONFIG[step];
            const Icon = config.icon;
            const isCompleted = idx < currentIndex;
            const isCurrent = step === currentStep;

            return (
              <button
                key={step}
                onClick={() => idx <= currentIndex && setCurrentStep(step)}
                className={cn(
                  "flex flex-col items-center gap-1 transition-colors",
                  idx <= currentIndex ? "cursor-pointer" : "cursor-not-allowed",
                  isCurrent
                    ? "text-primary"
                    : isCompleted
                      ? "text-terminal"
                      : "text-muted-foreground"
                )}
                disabled={idx > currentIndex}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2",
                    isCurrent
                      ? "border-primary bg-primary/10"
                      : isCompleted
                        ? "border-terminal bg-terminal/10"
                        : "border-muted"
                  )}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="hidden text-[10px] sm:block">{config.title.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="bg-primary/10 rounded-lg p-2">
            <StepIcon className="text-primary h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium">{stepConfig.title}</h3>
            <CardDescription>{stepConfig.description}</CardDescription>
          </div>
        </div>

        {currentStep === "financial" && <FinancialStep financial={financialAnalysis} />}
        {currentStep === "risk" && <RiskStep risk={riskAssessment} onChange={setRiskAssessment} />}
        {currentStep === "career" && (
          <CareerStep career={careerFactors} onChange={setCareerFactors} />
        )}
        {currentStep === "personal" && (
          <PersonalStep personal={personalFactors} onChange={setPersonalFactors} />
        )}

        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isFirstStep}
            className={cn(isFirstStep && "invisible")}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button onClick={handleNext}>
            {isLastStep ? (
              <>
                <Sparkles className="mr-1 h-4 w-4" />
                Generate Recommendation
              </>
            ) : (
              <>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default DecisionWizard;
