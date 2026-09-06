import { it, expect, vi, afterEach } from "vitest";
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
  expect(v?.kind).toBe("stay");
});

it("reports the first incomplete offer's missing field", () => {
  const v = selectVerdict([offer({ complete: false, missingField: "equity", medianNet: null })]);
  expect(v).toEqual({ kind: "incomplete", offerName: "Atlas", missingField: "equity" });
});

it("throws on an empty offer list", () => {
  expect(() => selectVerdict([])).toThrow();
});

it("states no verdict while a complete offer has no computed outcome", () => {
  // An offer can pass every field check and still have no number behind it —
  // an empty current job, or a calculation still in flight. Ranking that
  // `null` as 0 rendered "comes up $0 short" as though it had been measured.
  expect(selectVerdict([offer({ medianNet: null })])).toBeNull();
});

it("ranks only the offers that have a computed outcome", () => {
  const v = selectVerdict([
    offer({ medianNet: null }),
    offer({ id: "b", name: "Borealis", medianNet: 13442 }),
  ]);
  // Atlas has no number, so it is neither the winner nor a runner-up with a
  // fabricated delta against it.
  expect(v).toEqual({
    kind: "take-offer",
    offerName: "Borealis",
    medianNet: 13442,
    runnersUp: [],
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("warns and defaults the missing field when an incomplete offer names none", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  const v = selectVerdict([offer({ complete: false, missingField: null, medianNet: null })]);
  expect(v).toEqual({ kind: "incomplete", offerName: "Atlas", missingField: "salary" });
  expect(warn).toHaveBeenCalledTimes(1);
  expect(warn.mock.calls[0][0]).toMatch(/missingField/);
});
