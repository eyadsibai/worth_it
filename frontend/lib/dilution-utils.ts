import type { Stakeholder } from "@/lib/schemas";

export interface DilutionData {
  name: string;
  type: "founder" | "employee" | "investor" | "advisor" | "option_pool" | "new_investor";
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
