import { describe, it, expect } from "vitest";
import {
  EXAMPLE_SCENARIOS,
  getExampleById,
} from "@/lib/constants/examples";
import {
  GlobalSettingsFormSchema,
  CurrentJobFormSchema,
  RSUFormSchema,
  StockOptionsFormSchema,
} from "@/lib/schemas";

describe("EXAMPLE_SCENARIOS", () => {
  it("contains exactly 4 scenarios", () => {
    expect(EXAMPLE_SCENARIOS).toHaveLength(4);
  });

  it("has unique IDs", () => {
    const ids = EXAMPLE_SCENARIOS.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("covers all stages: early, growth, late, big-tech", () => {
    const stages = EXAMPLE_SCENARIOS.map((s) => s.stage);
    expect(stages).toContain("early");
    expect(stages).toContain("growth");
    expect(stages).toContain("late");
    expect(stages).toContain("big-tech");
  });

  describe("each scenario has valid data", () => {
    EXAMPLE_SCENARIOS.forEach((scenario) => {
      describe(`${scenario.name}`, () => {
        it("has valid globalSettings", () => {
          const result = GlobalSettingsFormSchema.safeParse(scenario.globalSettings);
          expect(result.success).toBe(true);
        });

        it("has valid currentJob", () => {
          const result = CurrentJobFormSchema.safeParse(scenario.currentJob);
          expect(result.success).toBe(true);
        });

        it("has valid equityDetails", () => {
          const equitySchema =
            scenario.equityDetails.equity_type === "RSU"
              ? RSUFormSchema
              : StockOptionsFormSchema;
          const result = equitySchema.safeParse(scenario.equityDetails);
          expect(result.success).toBe(true);
        });

        it("has meaningful salary values", () => {
          // Big Tech offers may pay more than current job
          // Startup offers typically pay less
          if (scenario.stage === "big-tech") {
            expect(scenario.equityDetails.monthly_salary).toBeGreaterThanOrEqual(
              scenario.currentJob.monthly_salary
            );
          } else {
            expect(scenario.equityDetails.monthly_salary).toBeLessThanOrEqual(
              scenario.currentJob.monthly_salary
            );
          }
        });

        it("has positive exit valuation", () => {
          if (scenario.equityDetails.equity_type === "RSU") {
            expect(scenario.equityDetails.exit_valuation).toBeGreaterThan(0);
          }
        });
      });
    });
  });
});

describe("big-tech template specific tests", () => {
  const bigTech = getExampleById("big-tech");

  it("uses RSU equity type", () => {
    expect(bigTech?.equityDetails.equity_type).toBe("RSU");
  });

  it("has dilution simulation disabled (public company)", () => {
    if (bigTech?.equityDetails.equity_type === "RSU") {
      expect(bigTech.equityDetails.simulate_dilution).toBe(false);
    }
  });

  it("has empty dilution rounds (no future funding)", () => {
    if (bigTech?.equityDetails.equity_type === "RSU") {
      expect(bigTech.equityDetails.dilution_rounds).toHaveLength(0);
    }
  });

  it("has large exit valuation (public company market cap)", () => {
    if (bigTech?.equityDetails.equity_type === "RSU") {
      // FAANG market caps are typically $500B+
      expect(bigTech.equityDetails.exit_valuation).toBeGreaterThanOrEqual(100_000_000_000);
    }
  });
});

describe("getExampleById", () => {
  it("returns scenario when ID exists", () => {
    const scenario = getExampleById("early-stage");
    expect(scenario).toBeDefined();
    expect(scenario?.id).toBe("early-stage");
  });

  it("returns undefined for unknown ID", () => {
    const scenario = getExampleById("nonexistent");
    expect(scenario).toBeUndefined();
  });

  it("returns correct scenario for each ID", () => {
    expect(getExampleById("early-stage")?.stage).toBe("early");
    expect(getExampleById("growth-stage")?.stage).toBe("growth");
    expect(getExampleById("late-stage")?.stage).toBe("late");
    expect(getExampleById("big-tech")?.stage).toBe("big-tech");
  });
});
