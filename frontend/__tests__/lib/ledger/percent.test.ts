import { describe, it, expect } from "vitest";
import { formatStakePercent } from "@/lib/ledger/percent";

describe("formatStakePercent", () => {
  it("keeps a decimal place for sub-1% stakes instead of rounding them away", () => {
    // 0.002601 is the early-stage sample's real diluted stake (see
    // lib/constants/examples.ts): Math.round(0.002601 * 100) collapses this
    // to a bare "0", which is what shipped as "Diluted to 0% by exit".
    expect(formatStakePercent(0.002601)).toBe("0.3");
  });

  it("formats a whole-percent fraction with one trailing decimal place", () => {
    expect(formatStakePercent(0.72)).toBe("72.0");
  });

  it("formats zero as zero, not an empty or negative string", () => {
    expect(formatStakePercent(0)).toBe("0.0");
  });
});
