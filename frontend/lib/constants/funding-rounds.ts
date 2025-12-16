/**
 * Default funding round configurations and industry benchmarks.
 *
 * These constants provide standard templates for modeling equity dilution
 * across typical startup funding rounds.
 */

import type { DilutionRoundForm } from "@/lib/schemas";

/**
 * Default dilution rounds for RSU calculations.
 *
 * Each round includes:
 * - round_name: Standard funding round nomenclature
 * - round_type: SAFE_NOTE for early stage, PRICED_ROUND for later stages
 * - year: Years from present when the round is expected
 * - enabled: Whether this round is active in calculations (default: false)
 * - dilution_pct: Percentage of equity dilution from this round
 * - pre_money_valuation: Company valuation before the round
 * - amount_raised: Capital raised in this round
 * - salary_change: Monthly salary adjustment after this round (SAR)
 *
 * Default valuations and dilution percentages are based on industry averages
 * for tech startups. Users should adjust these based on their specific situation.
 */
export const DEFAULT_DILUTION_ROUNDS: DilutionRoundForm[] = [
  {
    round_name: "Pre-Seed",
    round_type: "SAFE_NOTE",
    year: 0,
    enabled: false,
    dilution_pct: 10, // Typical range: 5-20%
    pre_money_valuation: 5_000_000, // SAR 5M
    amount_raised: 500_000, // SAR 500K
    salary_change: 0,
    status: "upcoming",
  },
  {
    round_name: "Seed",
    round_type: "SAFE_NOTE",
    year: 1,
    enabled: false,
    dilution_pct: 15, // Typical range: 10-25%
    pre_money_valuation: 8_000_000, // SAR 8M
    amount_raised: 1_500_000, // SAR 1.5M
    salary_change: 0,
    status: "upcoming",
  },
  {
    round_name: "Series A",
    round_type: "PRICED_ROUND",
    year: 2,
    enabled: false,
    dilution_pct: 20, // Typical range: 15-30%
    pre_money_valuation: 15_000_000, // SAR 15M
    amount_raised: 5_000_000, // SAR 5M
    salary_change: 0,
    status: "upcoming",
  },
  {
    round_name: "Series B",
    round_type: "PRICED_ROUND",
    year: 3,
    enabled: false,
    dilution_pct: 18, // Typical range: 15-25%
    pre_money_valuation: 40_000_000, // SAR 40M
    amount_raised: 10_000_000, // SAR 10M
    salary_change: 0,
    status: "upcoming",
  },
  {
    round_name: "Series C",
    round_type: "PRICED_ROUND",
    year: 4,
    enabled: false,
    dilution_pct: 15, // Typical range: 10-20%
    pre_money_valuation: 80_000_000, // SAR 80M
    amount_raised: 15_000_000, // SAR 15M
    salary_change: 0,
    status: "upcoming",
  },
  {
    round_name: "Series D",
    round_type: "PRICED_ROUND",
    year: 5,
    enabled: false,
    dilution_pct: 12, // Typical range: 10-15%
    pre_money_valuation: 150_000_000, // SAR 150M
    amount_raised: 20_000_000, // SAR 20M
    salary_change: 0,
    status: "upcoming",
  },
];

/**
 * Industry benchmarks for typical dilution percentages by funding round.
 *
 * These ranges are based on market data and can help users understand
 * whether their dilution scenarios are typical, aggressive, or conservative.
 *
 * Source: Industry averages from venture capital publications and startup databases.
 */
export const TYPICAL_DILUTION_RANGES = {
  PRE_SEED: {
    min: 5,
    typical: 10,
    max: 20,
    description: "Early-stage SAFE notes or convertible notes",
  },
  SEED: {
    min: 10,
    typical: 15,
    max: 25,
    description: "First institutional funding round",
  },
  SERIES_A: {
    min: 15,
    typical: 20,
    max: 30,
    description: "First priced equity round with lead investor",
  },
  SERIES_B: {
    min: 15,
    typical: 18,
    max: 25,
    description: "Growth funding to scale operations",
  },
  SERIES_C: {
    min: 10,
    typical: 15,
    max: 20,
    description: "Late-stage growth capital",
  },
  SERIES_D: {
    min: 10,
    typical: 12,
    max: 15,
    description: "Pre-IPO or significant expansion round",
  },
} as const;

/**
 * Typical valuation multipliers between funding rounds.
 *
 * These multipliers represent how much a company's valuation typically
 * increases between funding rounds, assuming healthy growth.
 */
export const TYPICAL_VALUATION_MULTIPLIERS = {
  PRE_SEED_TO_SEED: 1.6, // 5M to 8M
  SEED_TO_SERIES_A: 1.875, // 8M to 15M
  SERIES_A_TO_SERIES_B: 2.67, // 15M to 40M
  SERIES_B_TO_SERIES_C: 2.0, // 40M to 80M
  SERIES_C_TO_SERIES_D: 1.875, // 80M to 150M
} as const;
