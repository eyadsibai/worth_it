/**
 * The single source of truth for which required field an incomplete offer is
 * missing. `Field`'s `dataField` prop and `handleFocusMissing`'s DOM query
 * (in `app/[locale]/page.tsx`) both key off this exact union — see
 * `deriveMissingField` in `offer-column.tsx`, which is the only place that
 * produces one.
 */
export type MissingField = "salary" | "equity" | "exit";

export interface OfferOutcome {
  id: string;
  name: string;
  complete: boolean;
  missingField: MissingField | null;
  /** MC p50 when available, deterministic net benefit otherwise. */
  medianNet: number | null;
}

export type VerdictState =
  | { kind: "incomplete"; offerName: string; missingField: MissingField }
  | {
      kind: "take-offer";
      offerName: string;
      medianNet: number;
      runnersUp: { name: string; delta: number }[];
    }
  | { kind: "stay"; bestOfferName: string; bestMedianNet: number };

/** Net benefit below which an offer no longer beats staying. */
const STAY_THRESHOLD = 0;
/** `missingField` invariant fallback for a caller that marks `complete: false` without naming a field. */
const DEFAULT_MISSING_FIELD = "salary";

/**
 * Picks the headline verdict for a set of offers: the first incomplete offer
 * wins outright (in input order); otherwise the offer with the highest median
 * net benefit either beats staying (`take-offer`, ranked against every other
 * offer that has a number) or doesn't (`stay`).
 *
 * Returns `null` when no offer has a computed net benefit yet — an offer whose
 * every field is filled can still have `medianNet: null` (an empty current job,
 * a calculation in flight, a request that failed). There is no verdict to state
 * in that case, and stating one anyway is how "comes up $0 short" reached the
 * page as though it had been measured.
 */
export function selectVerdict(offers: OfferOutcome[]): VerdictState | null {
  if (offers.length === 0) {
    throw new Error("selectVerdict requires at least one offer");
  }

  const firstIncomplete = offers.find((candidate) => !candidate.complete);
  if (firstIncomplete) {
    if (firstIncomplete.missingField === null) {
      console.warn(
        `selectVerdict: offer "${firstIncomplete.name}" is marked incomplete but names no ` +
          `missingField; defaulting to "${DEFAULT_MISSING_FIELD}". The caller should always ` +
          "name the missing field for an incomplete offer."
      );
    }
    return {
      kind: "incomplete",
      offerName: firstIncomplete.name,
      missingField: firstIncomplete.missingField ?? DEFAULT_MISSING_FIELD,
    };
  }

  // Only offers carrying a real number can be ranked: a `null` is an absent
  // measurement, not a zero, and a delta computed against one would be invented.
  const measured = offers.filter(
    (candidate): candidate is OfferOutcome & { medianNet: number } => candidate.medianNet !== null
  );
  if (measured.length === 0) return null;

  const ranked = [...measured].sort((a, b) => b.medianNet - a.medianNet);
  const best = ranked[0];
  const bestNet = best.medianNet;

  if (bestNet <= STAY_THRESHOLD) {
    return { kind: "stay", bestOfferName: best.name, bestMedianNet: bestNet };
  }

  return {
    kind: "take-offer",
    offerName: best.name,
    medianNet: bestNet,
    runnersUp: ranked.slice(1).map((runnerUp) => ({
      name: runnerUp.name,
      delta: bestNet - runnerUp.medianNet,
    })),
  };
}
