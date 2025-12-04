/**
 * Default funding round configurations for dilution simulation.
 *
 * These values represent typical startup funding patterns based on industry data.
 * Dilution percentages and valuations are approximations and vary significantly
 * by sector, geography, and market conditions.
 */

import type { DilutionRoundForm } from "@/lib/schemas";

type DilutionRound = DilutionRoundForm;

/**
 * Default funding rounds for RSU dilution simulation.
 *
 * Round Types:
 * - SAFE_NOTE: Simple Agreement for Future Equity (early stage)
 * - PRICED_ROUND: Equity financing with set valuation (Series A+)
 *
 * Typical dilution ranges by stage:
 * - Pre-Seed: 5-20% (avg 10%)
 * - Seed: 10-25% (avg 15%)
 * - Series A: 15-30% (avg 20%)
 * - Series B: 10-25% (avg 15-18%)
 * - Series C+: 5-20% (avg 10-15%)
 */
export const DEFAULT_DILUTION_ROUNDS: DilutionRound[] = [
  {
    round_name: "Pre-Seed",
    round_type: "SAFE_NOTE",
    year: 0,
    enabled: false,
    dilution_pct: 10,
    pre_money_valuation: 5_000_000,
    amount_raised: 500_000,
    salary_change: 0,
  },
  {
    round_name: "Seed",
    round_type: "SAFE_NOTE",
    year: 1,
    enabled: false,
    dilution_pct: 15,
    pre_money_valuation: 8_000_000,
    amount_raised: 1_500_000,
    salary_change: 0,
  },
  {
    round_name: "Series A",
    round_type: "PRICED_ROUND",
    year: 2,
    enabled: false,
    dilution_pct: 20,
    pre_money_valuation: 15_000_000,
    amount_raised: 5_000_000,
    salary_change: 0,
  },
  {
    round_name: "Series B",
    round_type: "PRICED_ROUND",
    year: 3,
    enabled: false,
    dilution_pct: 18,
    pre_money_valuation: 40_000_000,
    amount_raised: 10_000_000,
    salary_change: 0,
  },
  {
    round_name: "Series C",
    round_type: "PRICED_ROUND",
    year: 4,
    enabled: false,
    dilution_pct: 15,
    pre_money_valuation: 80_000_000,
    amount_raised: 15_000_000,
    salary_change: 0,
  },
  {
    round_name: "Series D",
    round_type: "PRICED_ROUND",
    year: 5,
    enabled: false,
    dilution_pct: 12,
    pre_money_valuation: 150_000_000,
    amount_raised: 20_000_000,
    salary_change: 0,
  },
];

/**
 * Industry typical dilution percentages by funding round.
 * Useful for validation and user guidance.
 */
export const TYPICAL_DILUTION_BY_ROUND = {
  PRE_SEED: { min: 5, typical: 10, max: 20 },
  SEED: { min: 10, typical: 15, max: 25 },
  SERIES_A: { min: 15, typical: 20, max: 30 },
  SERIES_B: { min: 10, typical: 18, max: 25 },
  SERIES_C: { min: 5, typical: 15, max: 20 },
  SERIES_D: { min: 5, typical: 12, max: 15 },
} as const;
