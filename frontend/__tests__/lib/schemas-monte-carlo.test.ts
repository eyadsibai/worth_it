import { describe, it, expect } from "vitest";
import { MonteCarloResponseSchema } from "@/lib/schemas";

const percentiles = { p10: -82985, p25: -40185, p50: 22542, p75: 127215, p90: 289615 };

describe("MonteCarloResponseSchema", () => {
  it("accepts the enriched backend payload", () => {
    const parsed = MonteCarloResponseSchema.parse({
      net_outcomes: [1, 2],
      simulated_valuations: [3, 4],
      seed: 20260820,
      net_outcome_percentiles: percentiles,
      payout_percentiles: { ...percentiles, p10: 0 },
      probability_offer_wins: 0.64,
    });
    expect(parsed.net_outcome_percentiles?.p50).toBe(22542);
    expect(parsed.probability_offer_wins).toBe(0.64);
  });
  it("still accepts the legacy two-field payload", () => {
    const parsed = MonteCarloResponseSchema.parse({ net_outcomes: [], simulated_valuations: [] });
    expect(parsed.seed ?? null).toBeNull();
  });
});
