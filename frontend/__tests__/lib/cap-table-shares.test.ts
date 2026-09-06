import { describe, it, expect } from "vitest";
import { sharesForOwnership, totalSharesCovering } from "@/lib/cap-table-shares";

describe("sharesForOwnership", () => {
  it("converts a percentage into a share count", () => {
    expect(sharesForOwnership(60, 10_000_000)).toBe(6_000_000);
    expect(sharesForOwnership(0.5, 10_000_000)).toBe(50_000);
  });

  it("never returns a share count a stakeholder cannot be paid on", () => {
    // The waterfall engine pays strictly by shares, so zero here means a $0 payout.
    expect(sharesForOwnership(25, 10_000_000)).toBeGreaterThan(0);
  });

  it("returns zero for inputs that cannot produce a meaningful share count", () => {
    expect(sharesForOwnership(50, 0)).toBe(0);
    expect(sharesForOwnership(Number.NaN, 10_000_000)).toBe(0);
    expect(sharesForOwnership(50, Number.NaN)).toBe(0);
  });

  it("issues at least one share for a stake too small to round up to one", () => {
    // 0.000001% of 10M is 0.1 shares. Rounding that to zero pays the holder
    // nothing at exit, which is the failure this module exists to prevent.
    expect(sharesForOwnership(0.000001, 10_000_000)).toBe(1);
  });

  it("issues nothing for a zero stake", () => {
    // The floor of one share is for holders that own something, not for rows
    // left at 0% - those must stay out of the issued total.
    expect(sharesForOwnership(0, 10_000_000)).toBe(0);
  });

  it("refuses to issue negative shares for a negative ownership percentage", () => {
    // A negative share count is not a short position: it shrinks the issued
    // total and produces a negative payout at exit.
    expect(sharesForOwnership(-10, 10_000_000)).toBe(0);
    expect(sharesForOwnership(-0.000001, 10_000_000)).toBe(0);
  });
});

describe("totalSharesCovering", () => {
  it("leaves the total alone when the issued shares fit inside it", () => {
    const stakeholders = [{ shares: 6_000_000 }, { shares: 2_000_000 }];
    expect(totalSharesCovering(stakeholders, 10_000_000)).toBe(10_000_000);
  });

  it("expands the total when independently-entered percentages exceed 100%", () => {
    // Two 50% founders plus a 0.5% advisor is an ordinary way to fill the wizard,
    // and issuing more shares than the total would over-distribute the exit.
    const stakeholders = [{ shares: 5_000_000 }, { shares: 5_000_000 }, { shares: 50_000 }];
    expect(totalSharesCovering(stakeholders, 10_000_000)).toBe(10_050_000);
  });

  it("ignores non-finite share counts rather than propagating NaN", () => {
    const stakeholders = [{ shares: 6_000_000 }, { shares: Number.NaN }];
    expect(totalSharesCovering(stakeholders, 10_000_000)).toBe(10_000_000);
  });

  it("never lets a negative share count shrink the issued total", () => {
    // A negative row would hide over-issuance: 11M real shares against a 10M
    // total must still expand the total, whatever nonsense sits beside it.
    const stakeholders = [{ shares: 11_000_000 }, { shares: -2_000_000 }];
    expect(totalSharesCovering(stakeholders, 10_000_000)).toBe(11_000_000);
  });

  it("falls back to the issued shares when the total itself is non-finite", () => {
    // A NaN total would flow into the payload as total_shares and make every
    // shares/total_shares payout NaN; Infinity would make them all zero.
    const stakeholders = [{ shares: 6_000_000 }, { shares: 2_000_000 }];
    expect(totalSharesCovering(stakeholders, Number.NaN)).toBe(8_000_000);
    expect(totalSharesCovering(stakeholders, Number.POSITIVE_INFINITY)).toBe(8_000_000);
  });
});
