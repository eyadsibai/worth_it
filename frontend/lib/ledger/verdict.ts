export interface OfferOutcome {
  id: string;
  name: string;
  complete: boolean;
  missingField: "salary" | "equity" | "exit" | null;
  /** MC p50 when available, deterministic net benefit otherwise. */
  medianNet: number | null;
}

export type VerdictState =
  | { kind: "incomplete"; offerName: string; missingField: "salary" | "equity" | "exit" }
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
 * wins outright (in input order); otherwise the complete offer with the
 * highest median net benefit either beats staying (`take-offer`, ranked
 * against every other complete offer) or doesn't (`stay`).
 */
export function selectVerdict(offers: OfferOutcome[]): VerdictState {
  if (offers.length === 0) {
    throw new Error("selectVerdict requires at least one offer");
  }

  const firstIncomplete = offers.find((candidate) => !candidate.complete);
  if (firstIncomplete) {
    return {
      kind: "incomplete",
      offerName: firstIncomplete.name,
      missingField: firstIncomplete.missingField ?? DEFAULT_MISSING_FIELD,
    };
  }

  const ranked = [...offers].sort((a, b) => (b.medianNet ?? 0) - (a.medianNet ?? 0));
  const best = ranked[0];
  const bestNet = best.medianNet ?? 0;

  if (bestNet <= STAY_THRESHOLD) {
    return { kind: "stay", bestOfferName: best.name, bestMedianNet: bestNet };
  }

  return {
    kind: "take-offer",
    offerName: best.name,
    medianNet: bestNet,
    runnersUp: ranked.slice(1).map((runnerUp) => ({
      name: runnerUp.name,
      delta: bestNet - (runnerUp.medianNet ?? 0),
    })),
  };
}
