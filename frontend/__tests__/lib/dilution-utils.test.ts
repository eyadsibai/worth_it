import { describe, it, expect } from "vitest";
import { calculateDilutionFromValuation } from "@/lib/dilution-utils";

describe("calculateDilutionFromValuation", () => {
  it("calculates correct dilution for standard case", () => {
    // $10M pre-money + $2.5M raised = 2.5 / 12.5 = 20%
    expect(calculateDilutionFromValuation(10_000_000, 2_500_000)).toBe(20);
  });

  it("calculates correct dilution for seed round", () => {
    // $5M pre-money + $1M raised = 1 / 6 ≈ 16.67%
    const result = calculateDilutionFromValuation(5_000_000, 1_000_000);
    expect(result).toBeCloseTo(16.67, 1);
  });

  it("calculates correct dilution for large series round", () => {
    // $100M pre-money + $25M raised = 25 / 125 = 20%
    expect(calculateDilutionFromValuation(100_000_000, 25_000_000)).toBe(20);
  });

  it("returns 0 when pre-money valuation is zero", () => {
    expect(calculateDilutionFromValuation(0, 1_000_000)).toBe(0);
  });

  it("returns 0 when amount raised is zero", () => {
    expect(calculateDilutionFromValuation(10_000_000, 0)).toBe(0);
  });

  it("returns 0 when pre-money valuation is negative", () => {
    expect(calculateDilutionFromValuation(-5_000_000, 1_000_000)).toBe(0);
  });

  it("returns 0 when amount raised is negative", () => {
    expect(calculateDilutionFromValuation(10_000_000, -1_000_000)).toBe(0);
  });

  it("returns 0 when both inputs are zero", () => {
    expect(calculateDilutionFromValuation(0, 0)).toBe(0);
  });

  it("handles billion-scale valuations with precision", () => {
    // $1B pre-money + $200M raised = 200 / 1200 ≈ 16.67%
    const result = calculateDilutionFromValuation(1_000_000_000, 200_000_000);
    expect(result).toBeCloseTo(16.67, 1);
  });

  it("handles equal pre-money and amount raised", () => {
    // $10M pre-money + $10M raised = 10 / 20 = 50%
    expect(calculateDilutionFromValuation(10_000_000, 10_000_000)).toBe(50);
  });

  it("handles very small amount raised relative to valuation", () => {
    // $100M pre-money + $100K raised = 0.1 / 100.1 ≈ 0.1%
    const result = calculateDilutionFromValuation(100_000_000, 100_000);
    expect(result).toBeCloseTo(0.1, 1);
  });
});
