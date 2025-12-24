import type { GlobalSettingsForm, CurrentJobForm, RSUForm, StockOptionsForm } from "@/lib/schemas";

export type ExampleStage = "early" | "growth" | "late" | "big-tech";

export interface ExampleScenario {
  id: string;
  name: string;
  description: string;
  stage: ExampleStage;
  globalSettings: GlobalSettingsForm;
  currentJob: CurrentJobForm;
  equityDetails: RSUForm | StockOptionsForm;
}

/**
 * Pre-configured example scenarios for quick exploration.
 * Each represents a typical startup stage with realistic values.
 *
 * Funding rounds have a `status` field:
 * - "completed": Past rounds that already happened (dilution applied to starting equity)
 * - "upcoming": Future rounds that will dilute your equity going forward
 */
export const EXAMPLE_SCENARIOS: ExampleScenario[] = [
  {
    id: "early-stage",
    name: "Early-stage Startup (Seed)",
    description: "$8K salary, 0.5% equity, joining post-Seed",
    stage: "early",
    globalSettings: {
      exit_year: 5,
    },
    currentJob: {
      monthly_salary: 12000,
      annual_salary_growth_rate: 5,
      assumed_annual_roi: 8,
      investment_frequency: "Monthly",
    },
    equityDetails: {
      equity_type: "RSU",
      monthly_salary: 8000,
      total_equity_grant_pct: 0.5,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: true,
      company_stage: "seed",
      dilution_rounds: [
        // COMPLETED: Historical rounds (company already raised these)
        {
          round_name: "Pre-Seed",
          round_type: "SAFE_NOTE",
          year: -2,
          dilution_pct: 10,
          pre_money_valuation: 3000000,
          amount_raised: 300000,
          salary_change: 0,
          enabled: true,
          status: "completed",
        },
        {
          round_name: "Seed",
          round_type: "SAFE_NOTE",
          year: -1,
          dilution_pct: 15,
          pre_money_valuation: 8000000,
          amount_raised: 1500000,
          salary_change: 0,
          enabled: true,
          status: "completed",
        },
        // UPCOMING: Future rounds to model
        {
          round_name: "Series A",
          round_type: "PRICED_ROUND",
          year: 2,
          dilution_pct: 20,
          pre_money_valuation: 20000000,
          amount_raised: 5000000,
          salary_change: 1000,
          enabled: true,
          status: "upcoming",
        },
        {
          round_name: "Series B",
          round_type: "PRICED_ROUND",
          year: 4,
          dilution_pct: 15,
          pre_money_valuation: 80000000,
          amount_raised: 15000000,
          salary_change: 2000,
          enabled: true,
          status: "upcoming",
        },
      ],
      exit_valuation: 100000000,
    },
  },
  {
    id: "growth-stage",
    name: "Growth-stage (Series B)",
    description: "$12K salary, 0.1% equity, joining post-Series B",
    stage: "growth",
    globalSettings: {
      exit_year: 4,
    },
    currentJob: {
      monthly_salary: 15000,
      annual_salary_growth_rate: 4,
      assumed_annual_roi: 7,
      investment_frequency: "Monthly",
    },
    equityDetails: {
      equity_type: "RSU",
      monthly_salary: 12000,
      total_equity_grant_pct: 0.1,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: true,
      company_stage: "series-b",
      dilution_rounds: [
        // COMPLETED: Historical rounds (company already raised these)
        {
          round_name: "Seed",
          round_type: "SAFE_NOTE",
          year: -3,
          dilution_pct: 15,
          pre_money_valuation: 8000000,
          amount_raised: 1500000,
          salary_change: 0,
          enabled: true,
          status: "completed",
        },
        {
          round_name: "Series A",
          round_type: "PRICED_ROUND",
          year: -2,
          dilution_pct: 20,
          pre_money_valuation: 25000000,
          amount_raised: 6000000,
          salary_change: 0,
          enabled: true,
          status: "completed",
        },
        {
          round_name: "Series B",
          round_type: "PRICED_ROUND",
          year: -1,
          dilution_pct: 18,
          pre_money_valuation: 80000000,
          amount_raised: 18000000,
          salary_change: 0,
          enabled: true,
          status: "completed",
        },
        // UPCOMING: Future rounds to model
        {
          round_name: "Series C",
          round_type: "PRICED_ROUND",
          year: 2,
          dilution_pct: 12,
          pre_money_valuation: 400000000,
          amount_raised: 50000000,
          salary_change: 1500,
          enabled: true,
          status: "upcoming",
        },
        {
          round_name: "Series D",
          round_type: "PRICED_ROUND",
          year: 4,
          dilution_pct: 10,
          pre_money_valuation: 800000000,
          amount_raised: 80000000,
          salary_change: 2000,
          enabled: false,
          status: "upcoming",
        },
      ],
      exit_valuation: 500000000,
    },
  },
  {
    id: "late-stage",
    name: "Late-stage (Pre-IPO)",
    description: "$16K salary, 0.05% equity, joining pre-IPO",
    stage: "late",
    globalSettings: {
      exit_year: 2,
    },
    currentJob: {
      monthly_salary: 18000,
      annual_salary_growth_rate: 3,
      assumed_annual_roi: 6,
      investment_frequency: "Monthly",
    },
    equityDetails: {
      equity_type: "RSU",
      monthly_salary: 16000,
      total_equity_grant_pct: 0.05,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: true,
      company_stage: "pre-ipo",
      dilution_rounds: [
        // COMPLETED: Historical rounds (company already raised these)
        {
          round_name: "Seed",
          round_type: "SAFE_NOTE",
          year: -6,
          dilution_pct: 15,
          pre_money_valuation: 10000000,
          amount_raised: 2000000,
          salary_change: 0,
          enabled: true,
          status: "completed",
        },
        {
          round_name: "Series A",
          round_type: "PRICED_ROUND",
          year: -5,
          dilution_pct: 20,
          pre_money_valuation: 50000000,
          amount_raised: 12000000,
          salary_change: 0,
          enabled: true,
          status: "completed",
        },
        {
          round_name: "Series B",
          round_type: "PRICED_ROUND",
          year: -4,
          dilution_pct: 18,
          pre_money_valuation: 200000000,
          amount_raised: 45000000,
          salary_change: 0,
          enabled: true,
          status: "completed",
        },
        {
          round_name: "Series C",
          round_type: "PRICED_ROUND",
          year: -2,
          dilution_pct: 15,
          pre_money_valuation: 600000000,
          amount_raised: 100000000,
          salary_change: 0,
          enabled: true,
          status: "completed",
        },
        {
          round_name: "Series D",
          round_type: "PRICED_ROUND",
          year: -1,
          dilution_pct: 10,
          pre_money_valuation: 1500000000,
          amount_raised: 150000000,
          salary_change: 0,
          enabled: true,
          status: "completed",
        },
        // UPCOMING: No more dilution expected before IPO
      ],
      exit_valuation: 2000000000,
    },
  },
  {
    id: "big-tech",
    name: "Big Tech / FAANG Offer",
    description: "$20K salary, standard RSU package",
    stage: "big-tech",
    globalSettings: {
      exit_year: 4,
    },
    currentJob: {
      monthly_salary: 18000,
      annual_salary_growth_rate: 4,
      assumed_annual_roi: 8,
      investment_frequency: "Monthly",
    },
    equityDetails: {
      equity_type: "RSU",
      monthly_salary: 20000,
      total_equity_grant_pct: 0.002, // Very small % but of large public company
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: false, // Public companies - no dilution modeling
      company_stage: "pre-ipo", // Schema has no "public" option; pre-ipo used since dilution is disabled
      dilution_rounds: [], // No dilution for public company RSUs
      exit_valuation: 500000000000, // $500B market cap (typical FAANG)
    },
  },
];

/**
 * Get an example scenario by its ID
 */
export function getExampleById(id: string): ExampleScenario | undefined {
  return EXAMPLE_SCENARIOS.find((scenario) => scenario.id === id);
}

/**
 * Field hints providing context for typical value ranges.
 * Used in form fields to help users understand what values are reasonable.
 */
export const FIELD_HINTS = {
  // Current Job Form
  monthly_salary: "Tech average: $8K-18K",
  annual_salary_growth_rate: "Typical: 3-7% annually",
  assumed_annual_roi: "S&P 500 avg: 7-10%",

  // Startup Offer - Common
  startup_monthly_salary: "Usually 10-30% below market",
  vesting_period: "Standard: 4 years",
  cliff_period: "Standard: 1 year",

  // RSU specific
  total_equity_grant_pct: "Early: 0.1-2%, Growth: 0.01-0.1%",
  exit_valuation: "Seed: $50-200M, Series B: $200M-1B",

  // Stock Options specific
  strike_price: "Usually: company's 409A valuation",
  current_share_price: "Based on latest funding round",
  exit_price_per_share: "Target: 3-10x current price at exit",
  number_of_options: "Typical early hire: 10K-100K options",
  shares_outstanding: "Check cap table or ask HR",
} as const;

/**
 * Example values for form field placeholders.
 * Shown as "e.g. X" when field is empty.
 */
export const FIELD_EXAMPLES = {
  // Current Job Form
  monthly_salary: 12000,
  annual_salary_growth_rate: 5,
  assumed_annual_roi: 8,

  // Startup Offer - Common
  startup_monthly_salary: 10000,
  vesting_period: 4,
  cliff_period: 1,

  // RSU specific
  total_equity_grant_pct: 0.5,
  exit_valuation: 100000000,

  // Stock Options specific
  strike_price: 1.5,
  current_share_price: 5,
  exit_price_per_share: 15, // Higher than current, reflects expected growth at exit
  number_of_options: 50000,
  shares_outstanding: 10000000,
} as const;
