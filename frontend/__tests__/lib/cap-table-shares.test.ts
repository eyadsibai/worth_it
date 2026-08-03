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

  it("falls back to the issued shares when the total itself is non-finite", () => {
    // A NaN total would flow into the payload as total_shares and make every
    // shares/total_shares payout NaN; Infinity would make them all zero.
    const stakeholders = [{ shares: 6_000_000 }, { shares: 2_000_000 }];
    expect(totalSharesCovering(stakeholders, Number.NaN)).toBe(8_000_000);
    expect(totalSharesCovering(stakeholders, Number.POSITIVE_INFINITY)).toBe(8_000_000);
  });
});
