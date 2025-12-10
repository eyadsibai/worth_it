import { describe, it, expect } from "vitest";
import { calculateDilution } from "@/lib/dilution-utils";
import type { Stakeholder } from "@/lib/schemas";

describe("calculateDilution", () => {
  const baseStakeholders: Stakeholder[] = [
    {
      id: "founder-1",
      name: "Founder 1",
      type: "founder",
      shares: 4000000,
      ownership_pct: 40,
      share_class: "common",
    },
    {
      id: "founder-2",
      name: "Founder 2",
      type: "founder",
      shares: 4000000,
      ownership_pct: 40,
      share_class: "common",
    },
  ];

  describe("basic dilution calculation", () => {
    it("calculates correct post-money ownership for existing stakeholders", () => {
      // Pre-money: $10M, Amount raised: $2M
      // Post-money: $12M
      // Dilution factor: 10/12 = 0.8333
      // New investor: 2/12 = 16.67%
      const result = calculateDilution(
        baseStakeholders,
        20, // option pool
        10_000_000, // pre-money
        2_000_000, // amount raised
        "Series A Investor"
      );

      // Find Founder 1
      const founder1 = result.find((d) => d.name === "Founder 1");
      expect(founder1).toBeDefined();
      expect(founder1!.beforePct).toBe(40);
      expect(founder1!.afterPct).toBeCloseTo(33.33, 1);
      expect(founder1!.dilutionPct).toBeCloseTo(-16.67, 1);
      expect(founder1!.isNew).toBe(false);
    });

    it("calculates correct ownership for new investor", () => {
      const result = calculateDilution(
        baseStakeholders,
        20,
        10_000_000,
        2_000_000,
        "Series A Investor"
      );

      const newInvestor = result.find((d) => d.name === "Series A Investor");
      expect(newInvestor).toBeDefined();
      expect(newInvestor!.beforePct).toBe(0);
      expect(newInvestor!.afterPct).toBeCloseTo(16.67, 1);
      expect(newInvestor!.isNew).toBe(true);
    });

    it("includes option pool in dilution calculation", () => {
      const result = calculateDilution(
        baseStakeholders,
        20,
        10_000_000,
        2_000_000,
        "Series A Investor"
      );

      const optionPool = result.find((d) => d.name === "Option Pool");
      expect(optionPool).toBeDefined();
      expect(optionPool!.beforePct).toBe(20);
      expect(optionPool!.afterPct).toBeCloseTo(16.67, 1);
      expect(optionPool!.type).toBe("option_pool");
    });

    it("all percentages sum to 100 after dilution", () => {
      const result = calculateDilution(
        baseStakeholders,
        20,
        10_000_000,
        2_000_000,
        "Series A Investor"
      );

      const totalAfter = result.reduce((sum, d) => sum + d.afterPct, 0);
      expect(totalAfter).toBeCloseTo(100, 1);
    });
  });

  describe("edge cases", () => {
    it("handles zero option pool", () => {
      // Use stakeholders that sum to 100%
      const fullOwnership: Stakeholder[] = [
        { id: "f1", name: "Founder 1", type: "founder", shares: 0, ownership_pct: 50, share_class: "common" },
        { id: "f2", name: "Founder 2", type: "founder", shares: 0, ownership_pct: 50, share_class: "common" },
      ];

      const result = calculateDilution(
        fullOwnership,
        0, // no option pool
        10_000_000,
        2_000_000,
        "Investor"
      );

      const optionPool = result.find((d) => d.name === "Option Pool");
      expect(optionPool).toBeUndefined();

      // Total should still be 100%
      const totalAfter = result.reduce((sum, d) => sum + d.afterPct, 0);
      expect(totalAfter).toBeCloseTo(100, 1);
    });

    it("handles single stakeholder", () => {
      const singleStakeholder: Stakeholder[] = [
        {
          id: "solo",
          name: "Solo Founder",
          type: "founder",
          shares: 10000000,
          ownership_pct: 100,
          share_class: "common",
        },
      ];

      const result = calculateDilution(
        singleStakeholder,
        0,
        5_000_000,
        5_000_000, // 50% dilution
        "Angel"
      );

      const founder = result.find((d) => d.name === "Solo Founder");
      expect(founder!.beforePct).toBe(100);
      expect(founder!.afterPct).toBe(50);
      expect(founder!.dilutionPct).toBe(-50);

      const angel = result.find((d) => d.name === "Angel");
      expect(angel!.afterPct).toBe(50);
    });

    it("handles empty stakeholders list", () => {
      const result = calculateDilution([], 0, 10_000_000, 2_000_000, "Investor");

      expect(result.length).toBe(1); // Only new investor
      expect(result[0].name).toBe("Investor");
      expect(result[0].afterPct).toBeCloseTo(16.67, 1);
    });

    it("uses default investor name when not provided", () => {
      const result = calculateDilution(
        baseStakeholders,
        20,
        10_000_000,
        2_000_000
      );

      const newInvestor = result.find((d) => d.isNew);
      expect(newInvestor!.name).toBe("New Investor");
    });
  });

  describe("dilution percentage calculation", () => {
    it("calculates negative dilution percentage for existing holders", () => {
      const result = calculateDilution(
        baseStakeholders,
        20,
        10_000_000,
        2_000_000,
        "Investor"
      );

      // All existing stakeholders should have negative dilution
      const existingHolders = result.filter((d) => !d.isNew);
      existingHolders.forEach((holder) => {
        expect(holder.dilutionPct).toBeLessThan(0);
      });
    });

    it("calculates uniform dilution percentage for all existing holders", () => {
      const result = calculateDilution(
        baseStakeholders,
        20,
        10_000_000,
        2_000_000,
        "Investor"
      );

      // All existing stakeholders should have same dilution %
      const existingHolders = result.filter((d) => !d.isNew);
      const dilutionPcts = existingHolders.map((d) => d.dilutionPct);
      const firstDilution = dilutionPcts[0];

      dilutionPcts.forEach((pct) => {
        expect(pct).toBeCloseTo(firstDilution, 1);
      });
    });
  });

  describe("type assignments", () => {
    it("preserves stakeholder types", () => {
      const mixedStakeholders: Stakeholder[] = [
        { id: "f", name: "Founder", type: "founder", shares: 0, ownership_pct: 50, share_class: "common" },
        { id: "e", name: "Employee", type: "employee", shares: 0, ownership_pct: 10, share_class: "common" },
        { id: "i", name: "Existing Investor", type: "investor", shares: 0, ownership_pct: 30, share_class: "preferred" },
        { id: "a", name: "Advisor", type: "advisor", shares: 0, ownership_pct: 10, share_class: "common" },
      ];

      const result = calculateDilution(mixedStakeholders, 0, 10_000_000, 2_000_000, "New VC");

      expect(result.find((d) => d.name === "Founder")!.type).toBe("founder");
      expect(result.find((d) => d.name === "Employee")!.type).toBe("employee");
      expect(result.find((d) => d.name === "Existing Investor")!.type).toBe("investor");
      expect(result.find((d) => d.name === "Advisor")!.type).toBe("advisor");
      expect(result.find((d) => d.name === "New VC")!.type).toBe("new_investor");
    });
  });
});
