/**
 * Cap Table Wizard Types
 *
 * Types for the quick-start wizard that helps founders
 * set up their cap table in 5 simple steps.
 */

export type WizardStep =
  | "founders"
  | "option-pool"
  | "advisors-ask"
  | "advisors-form"
  | "funding-ask"
  | "funding-form"
  | "complete";

export interface FounderEntry {
  id: string;
  name: string;
  ownershipPct: number;
}

export interface AdvisorEntry {
  id: string;
  name: string;
  ownershipPct: number;
}

export type FundingType = "SAFE" | "CONVERTIBLE_NOTE" | "PRICED_ROUND";

export interface FundingEntry {
  id: string;
  type: FundingType;
  investorName: string;
  amount: number;
  valuationCap?: number;
}

export interface WizardData {
  founders: FounderEntry[];
  optionPoolPct: number;
  advisors: AdvisorEntry[];
  funding: FundingEntry[];
}

export interface WizardStepProps {
  data: WizardData;
  onDataChange: (data: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  onSkipWizard: () => void;
}

export const OPTION_POOL_OPTIONS = [
  { value: 10, label: "10%", description: "Conservative - smaller team expected" },
  { value: 15, label: "15%", description: "Typical for seed stage startups" },
  { value: 20, label: "20%", description: "Generous - expect heavy hiring" },
] as const;

export const DEFAULT_WIZARD_DATA: WizardData = {
  founders: [
    { id: "founder-1", name: "", ownershipPct: 50 },
    { id: "founder-2", name: "", ownershipPct: 50 },
  ],
  optionPoolPct: 15,
  advisors: [],
  funding: [],
};

/**
 * Standard advisor vesting: 4 years with 1 year cliff
 */
export const ADVISOR_VESTING = {
  vestingMonths: 48,
  cliffMonths: 12,
} as const;
