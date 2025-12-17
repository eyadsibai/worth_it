import { describe, it, expect } from "vitest";
import {
  FOUNDER_TEMPLATES,
  getFounderTemplateById,
  type FounderTemplate,
} from "@/lib/constants/founder-templates";
import {
  CapTableSchema,
  FundingInstrumentSchema,
  PreferenceTierSchema,
} from "@/lib/schemas";

describe("FOUNDER_TEMPLATES", () => {
  it("contains exactly 4 templates", () => {
    expect(FOUNDER_TEMPLATES).toHaveLength(4);
  });

  it("has unique IDs", () => {
    const ids = FOUNDER_TEMPLATES.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("covers expected template types", () => {
    const ids = FOUNDER_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("two-founders");
    expect(ids).toContain("solo-founder");
    expect(ids).toContain("post-seed");
    expect(ids).toContain("series-a-ready");
  });

  describe("each template has valid data", () => {
    FOUNDER_TEMPLATES.forEach((template) => {
      describe(`${template.name}`, () => {
        it("has required fields", () => {
          expect(template.id).toBeDefined();
          expect(template.name).toBeDefined();
          expect(template.description).toBeDefined();
          expect(template.capTable).toBeDefined();
        });

        it("has valid capTable structure", () => {
          const result = CapTableSchema.safeParse(template.capTable);
          expect(result.success).toBe(true);
        });

        it("has stakeholders summing to ~100% ownership", () => {
          const totalOwnership = template.capTable.stakeholders.reduce(
            (sum, s) => sum + s.ownership_pct,
            0
          );
          // Allow for option pool (up to 20%) and rounding
          expect(totalOwnership).toBeGreaterThanOrEqual(80);
          expect(totalOwnership).toBeLessThanOrEqual(100);
        });

        it("has valid funding instruments if provided", () => {
          if (template.instruments && template.instruments.length > 0) {
            template.instruments.forEach((instrument) => {
              const result = FundingInstrumentSchema.safeParse(instrument);
              expect(result.success).toBe(true);
            });
          }
        });

        it("has valid preference tiers if provided", () => {
          if (template.preferenceTiers && template.preferenceTiers.length > 0) {
            template.preferenceTiers.forEach((tier) => {
              const result = PreferenceTierSchema.safeParse(tier);
              expect(result.success).toBe(true);
            });
          }
        });
      });
    });
  });
});

describe("getFounderTemplateById", () => {
  it("returns template when ID exists", () => {
    const template = getFounderTemplateById("two-founders");
    expect(template).toBeDefined();
    expect(template?.id).toBe("two-founders");
  });

  it("returns undefined for unknown ID", () => {
    const template = getFounderTemplateById("nonexistent");
    expect(template).toBeUndefined();
  });

  it("returns correct template for each ID", () => {
    expect(getFounderTemplateById("two-founders")?.name).toContain("2");
    expect(getFounderTemplateById("solo-founder")?.name).toContain("Solo");
    expect(getFounderTemplateById("post-seed")?.name).toContain("Seed");
    expect(getFounderTemplateById("series-a-ready")?.name).toContain("Series A");
  });
});
