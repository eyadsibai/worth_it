import type { Stakeholder, StakeholderType } from "@/lib/schemas";

/**
 * Extended type for dilution calculations.
 * Extends StakeholderType with additional categories that appear in dilution previews
 * but are not individual stakeholders in the cap table:
 * - "option_pool": Represents the company's unallocated option pool
 * - "new_investor": Represents the incoming investor in a funding round
 */
type DilutionPartyType = StakeholderType | "option_pool" | "new_investor";

export interface DilutionData {
  name: string;
  type: DilutionPartyType;
  beforePct: number;
  afterPct: number;
  dilutionPct: number;
  isNew: boolean;
}

/**
 * Calculate dilution impact of a new funding round on existing stakeholders.
 *
 * @param stakeholders - Current cap table stakeholders
 * @param optionPoolPct - Current option pool percentage
 * @param preMoneyValuation - Pre-money valuation in dollars
 * @param amountRaised - Amount being raised in dollars
 * @param investorName - Name for the new investor (defaults to "New Investor")
 * @returns Array of DilutionData showing before/after ownership for each party
 */
export function calculateDilution(
  stakeholders: Stakeholder[],
  optionPoolPct: number,
  preMoneyValuation: number,
  amountRaised: number,
  investorName: string = "New Investor"
): DilutionData[] {
  // Guard against invalid inputs that would cause division by zero or NaN
  if (preMoneyValuation <= 0 || amountRaised <= 0) {
    return [];
  }

  const postMoney = preMoneyValuation + amountRaised;
  const dilutionFactor = preMoneyValuation / postMoney;
  const newInvestorPct = (amountRaised / postMoney) * 100;

  const results: DilutionData[] = [];

  // Process existing stakeholders
  for (const s of stakeholders) {
    const afterPct = s.ownership_pct * dilutionFactor;
    const dilutionPct = ((afterPct - s.ownership_pct) / s.ownership_pct) * 100;
    results.push({
      name: s.name,
      type: s.type,
      beforePct: s.ownership_pct,
      afterPct,
      dilutionPct,
      isNew: false,
    });
  }

  // Process option pool if it exists
  if (optionPoolPct > 0) {
    const afterPct = optionPoolPct * dilutionFactor;
    const dilutionPct = ((afterPct - optionPoolPct) / optionPoolPct) * 100;
    results.push({
      name: "Option Pool",
      type: "option_pool",
      beforePct: optionPoolPct,
      afterPct,
      dilutionPct,
      isNew: false,
    });
  }

  // Add new investor
  results.push({
    name: investorName,
    type: "new_investor",
    beforePct: 0,
    afterPct: newInvestorPct,
    dilutionPct: 0,
    isNew: true,
  });

  return results;
}
