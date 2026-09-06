import type { PricedRound } from "@/lib/schemas";

/**
 * One rule for "which round came last".
 *
 * The waterfall reads it as seniority - the newest round is paid first - and the
 * cap table reads it as the anchor valuation. Two copies of the tie-break would
 * eventually disagree, and then the chart would sweep around one round while the
 * preference stack is ordered by another.
 */

/** A round paired with the order it was declared in, which breaks date ties. */
interface OrderedRound {
  round: PricedRound;
  index: number;
}

function roundTimestamp(round: PricedRound): number {
  return round.date ? new Date(round.date).getTime() : NaN;
}

/** Most recent first; declaration order breaks ties and covers missing dates. */
function compareSeniority(a: OrderedRound, b: OrderedRound): number {
  const aTime = roundTimestamp(a.round);
  const bTime = roundTimestamp(b.round);
  if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
    return bTime - aTime;
  }
  return b.index - a.index;
}

/** Newest round first. The input is not mutated. */
export function orderBySeniority(rounds: PricedRound[]): PricedRound[] {
  return rounds
    .map((round, index) => ({ round, index }))
    .sort(compareSeniority)
    .map(({ round }) => round);
}

/** The newest round, by the same rule that orders the preference stack. */
export function latestPricedRound(rounds: PricedRound[]): PricedRound | undefined {
  return orderBySeniority(rounds)[0];
}
