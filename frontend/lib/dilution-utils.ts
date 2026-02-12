/** Multiplier to convert fraction (0-1) to percentage (0-100) */
const PERCENTAGE_MULTIPLIER = 100;

/**
 * Calculates dilution percentage from pre-money valuation and amount raised.
 *
 * Formula: dilution = (amountRaised / (preMoneyValuation + amountRaised)) * 100
 *
 * @returns Dilution as a percentage (0-100), or 0 for invalid inputs
 */
export function calculateDilutionFromValuation(
  preMoneyValuation: number,
  amountRaised: number
): number {
  if (preMoneyValuation <= 0 || amountRaised <= 0) return 0;
  return (amountRaised / (preMoneyValuation + amountRaised)) * PERCENTAGE_MULTIPLIER;
}
