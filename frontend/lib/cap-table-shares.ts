/**
 * Share-count derivation for cap tables.
 *
 * The waterfall engine distributes proceeds strictly by `shares / total_shares`, so a
 * stakeholder captured as an ownership percentage still has to carry real shares or it
 * is paid nothing. Every place that builds a stakeholder shares this one implementation
 * so the manual form, the wizard, and the founder dashboard cannot drift apart.
 */

const PERCENT_BASIS = 100;

/** Translate an ownership percentage into a share count against a given total. */
export function sharesForOwnership(ownershipPct: number, totalShares: number): number {
  if (!Number.isFinite(ownershipPct) || !Number.isFinite(totalShares) || totalShares <= 0) {
    return 0;
  }
  return Math.round((ownershipPct / PERCENT_BASIS) * totalShares);
}

/**
 * Grow `total_shares` so it covers every share actually issued.
 *
 * Ownership percentages entered independently can sum past 100% - two 50% founders plus
 * a 0.5% advisor is an ordinary way to fill the wizard. Issuing more shares than the
 * total would distribute more than the exit produced, which the backend rejects
 * outright, so the total expands to match rather than the payouts silently overflowing.
 *
 * A non-finite `totalShares` is discarded rather than carried into the result: NaN would
 * make every `shares / total_shares` payout NaN and Infinity would zero them all, so the
 * issued count is the only total that still pays stakeholders what they hold.
 */
export function totalSharesCovering(
  stakeholders: readonly { shares: number }[],
  totalShares: number
): number {
  const issued = stakeholders.reduce(
    (sum, s) => sum + (Number.isFinite(s.shares) ? s.shares : 0),
    0
  );
  return Math.max(Number.isFinite(totalShares) ? totalShares : 0, issued);
}
