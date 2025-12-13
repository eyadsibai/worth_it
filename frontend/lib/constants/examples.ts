import type {
  GlobalSettingsForm,
  CurrentJobForm,
  RSUForm,
  StockOptionsForm,
} from "@/lib/schemas";

export type ExampleStage = "early" | "growth" | "late";

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
 */
export const EXAMPLE_SCENARIOS: ExampleScenario[] = [
  {
    id: "early-stage",
    name: "Early-stage Startup (Seed)",
    description: "$8K salary, 0.5% equity",
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
      dilution_rounds: [
        {
          round_name: "Series A",
          round_type: "PRICED_ROUND",
          year: 2,
          dilution_pct: 20,
          pre_money_valuation: 20000000,
          amount_raised: 5000000,
          salary_change: 1000,
          enabled: true,
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
        },
      ],
      exit_valuation: 100000000,
    },
  },
  {
    id: "growth-stage",
    name: "Growth-stage (Series B)",
    description: "$12K salary, 0.1% equity",
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
      dilution_rounds: [
        {
          round_name: "Series C",
          round_type: "PRICED_ROUND",
          year: 2,
          dilution_pct: 12,
          pre_money_valuation: 400000000,
          amount_raised: 50000000,
          salary_change: 1500,
          enabled: true,
        },
      ],
      exit_valuation: 500000000,
    },
  },
  {
    id: "late-stage",
    name: "Late-stage (Pre-IPO)",
    description: "$16K salary, 0.05% equity",
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
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 2000000000,
    },
  },
];

/**
 * Get an example scenario by its ID
 */
export function getExampleById(id: string): ExampleScenario | undefined {
  return EXAMPLE_SCENARIOS.find((scenario) => scenario.id === id);
}
