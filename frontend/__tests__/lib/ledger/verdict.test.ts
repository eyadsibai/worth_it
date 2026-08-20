import { it, expect } from "vitest";
import { selectVerdict, type OfferOutcome } from "@/lib/ledger/verdict";

const offer = (over: Partial<OfferOutcome>): OfferOutcome => ({
  id: "a",
  name: "Atlas",
  complete: true,
  missingField: null,
  medianNet: 22542,
  ...over,
});

it("takes the best offer and ranks the rest", () => {
  const v = selectVerdict([offer({}), offer({ id: "b", name: "Borealis", medianNet: 13442 })]);
  expect(v).toEqual({
    kind: "take-offer",
    offerName: "Atlas",
    medianNet: 22542,
    runnersUp: [{ name: "Borealis", delta: 9100 }],
  });
});

it("stays when every offer loses", () => {
  const v = selectVerdict([offer({ medianNet: -5000 })]);
  expect(v.kind).toBe("stay");
});

it("reports the first incomplete offer's missing field", () => {
  const v = selectVerdict([offer({ complete: false, missingField: "equity", medianNet: null })]);
  expect(v).toEqual({ kind: "incomplete", offerName: "Atlas", missingField: "equity" });
});

it("throws on an empty offer list", () => {
  expect(() => selectVerdict([])).toThrow();
});
