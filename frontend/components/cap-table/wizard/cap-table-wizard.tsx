"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { WizardProgress } from "./wizard-progress";
import { StepFounders, StepOptionPool, StepAdvisors, StepFunding, StepComplete } from "./steps";
import { DEFAULT_WIZARD_DATA, ADVISOR_VESTING, type WizardData, type WizardStep } from "./types";
import { generateId } from "@/lib/utils";
import type {
  CapTable,
  Stakeholder,
  FundingInstrument,
  SAFE,
  ConvertibleNote,
  PricedRound,
} from "@/lib/schemas";

interface CapTableWizardProps {
  onComplete: (capTable: CapTable, instruments: FundingInstrument[]) => void;
  onSkip: () => void;
}

const STEP_LABELS = ["Founders", "Option Pool", "Advisors", "Funding", "Complete"];

export function CapTableWizard({ onComplete, onSkip }: CapTableWizardProps) {
  const [currentStep, setCurrentStep] = React.useState<WizardStep>("founders");
  const [data, setData] = React.useState<WizardData>(DEFAULT_WIZARD_DATA);

  const handleDataChange = (partial: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const getCurrentStepIndex = () => {
    // Map internal steps to display steps (1-5)
    switch (currentStep) {
      case "founders":
        return 1;
      case "option-pool":
        return 2;
      case "advisors-ask":
      case "advisors-form":
        return 3;
      case "funding-ask":
      case "funding-form":
        return 4;
      case "complete":
        return 5;
      default:
        return 1;
    }
  };

  const handleNext = () => {
    switch (currentStep) {
      case "founders":
        setCurrentStep("option-pool");
        break;
      case "option-pool":
        setCurrentStep("advisors-ask");
        break;
      case "advisors-ask":
      case "advisors-form":
        setCurrentStep("funding-ask");
        break;
      case "funding-ask":
      case "funding-form":
        setCurrentStep("complete");
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case "option-pool":
        setCurrentStep("founders");
        break;
      case "advisors-ask":
      case "advisors-form":
        setCurrentStep("option-pool");
        break;
      case "funding-ask":
      case "funding-form":
        setCurrentStep("advisors-ask");
        break;
      case "complete":
        setCurrentStep("funding-ask");
        break;
    }
  };

  const transformToCapTable = (): { capTable: CapTable; instruments: FundingInstrument[] } => {
    const stakeholders: Stakeholder[] = [];

    // Add founders
    const validFounders = data.founders.filter((f) => f.name.trim() !== "");
    for (const founder of validFounders) {
      stakeholders.push({
        id: generateId(),
        name: founder.name,
        type: "founder",
        shares: 0,
        ownership_pct: founder.ownershipPct,
        share_class: "common",
      });
    }

    // Add advisors (with vesting)
    const validAdvisors = data.advisors.filter((a) => a.name.trim() !== "");
    for (const advisor of validAdvisors) {
      stakeholders.push({
        id: generateId(),
        name: advisor.name,
        type: "advisor",
        shares: 0,
        ownership_pct: advisor.ownershipPct,
        share_class: "common",
        vesting: {
          total_shares: 0,
          vesting_months: ADVISOR_VESTING.vestingMonths,
          cliff_months: ADVISOR_VESTING.cliffMonths,
          vested_shares: 0,
        },
      });
    }

    const capTable: CapTable = {
      stakeholders,
      total_shares: 10_000_000, // Default 10M shares
      option_pool_pct: data.optionPoolPct,
    };

    // Create funding instruments
    const instruments: FundingInstrument[] = [];
    const validFunding = data.funding.filter((f) => f.investorName.trim() !== "" && f.amount > 0);

    for (const funding of validFunding) {
      const id = generateId();
      const status = "outstanding" as const;

      if (funding.type === "SAFE") {
        const safe: SAFE = {
          id,
          type: "SAFE",
          investor_name: funding.investorName,
          investment_amount: funding.amount,
          valuation_cap: funding.valuationCap, // undefined if not set
          discount_pct: undefined,
          pro_rata_rights: false,
          mfn_clause: false,
          status,
        };
        instruments.push(safe);
      } else if (funding.type === "CONVERTIBLE_NOTE") {
        const note: ConvertibleNote = {
          id,
          type: "CONVERTIBLE_NOTE",
          investor_name: funding.investorName,
          principal_amount: funding.amount,
          interest_rate: 5, // Default 5%
          interest_type: "simple",
          valuation_cap: funding.valuationCap, // undefined if not set
          discount_pct: undefined,
          maturity_months: 24, // Default 2 years
          date: new Date().toISOString().split("T")[0],
          status,
        };
        instruments.push(note);
      } else if (funding.type === "PRICED_ROUND") {
        const round: PricedRound = {
          id,
          type: "PRICED_ROUND",
          round_name: funding.investorName,
          // Use nullish coalescing to only fallback when undefined/null (not 0)
          pre_money_valuation: funding.valuationCap ?? 10_000_000,
          amount_raised: funding.amount,
          price_per_share: 1, // Will be calculated
          new_shares_issued: 0, // Will be calculated during conversion
          liquidation_multiplier: 1,
          participating: false,
        };
        instruments.push(round);
      }
    }

    return { capTable, instruments };
  };

  const handleComplete = () => {
    const { capTable, instruments } = transformToCapTable();
    onComplete(capTable, instruments);
  };

  const stepProps = {
    data,
    onDataChange: handleDataChange,
    onNext: handleNext,
    onBack: handleBack,
    onSkipWizard: onSkip,
  };

  return (
    <Card className="mx-auto max-w-2xl p-8">
      {/* Progress */}
      <div className="mb-8">
        <WizardProgress
          currentStep={getCurrentStepIndex()}
          totalSteps={5}
          stepLabels={STEP_LABELS}
        />
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === "founders" && <StepFounders {...stepProps} />}
          {currentStep === "option-pool" && <StepOptionPool {...stepProps} />}
          {(currentStep === "advisors-ask" || currentStep === "advisors-form") && (
            <StepAdvisors {...stepProps} />
          )}
          {(currentStep === "funding-ask" || currentStep === "funding-form") && (
            <StepFunding {...stepProps} />
          )}
          {currentStep === "complete" && <StepComplete data={data} onComplete={handleComplete} />}
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}
