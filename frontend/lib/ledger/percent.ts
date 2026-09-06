import { FORMATTING } from "@/lib/constants/formatting";

/**
 * Converts a 0-1 fraction into a display percentage string with
 * `FORMATTING.DECIMAL_PLACES_PERCENT` decimal places, e.g. `0.002601` ->
 * `"0.3"`. Employee equity grants are typically sub-1% fractions, so
 * `Math.round` collapses them to a bare `0` - every ledger surface that
 * prints a stake-sized fraction as a percentage must go through this one
 * helper instead of its own rounding, so the conversion can't drift or
 * disagree between call sites again.
 */
export function formatStakePercent(fraction: number): string {
  return (fraction * FORMATTING.PERCENTAGE_MULTIPLIER).toFixed(FORMATTING.DECIMAL_PLACES_PERCENT);
}
