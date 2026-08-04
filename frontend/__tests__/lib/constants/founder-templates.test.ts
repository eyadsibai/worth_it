import { describe, it, expect, vi } from "vitest";
import { FOUNDER_TEMPLATES, getFounderTemplateById } from "@/lib/constants/founder-templates";
import type { FounderTemplate } from "@/lib/constants/founder-templates";
import { CapTableSchema, FundingInstrumentSchema, PreferenceTierSchema } from "@/lib/schemas";

/** Every id the templates hand to the store, in a stable order. */
function allIds(templates: readonly FounderTemplate[]): string[] {
  return templates.flatMap((t) => [
    t.id,
    ...t.capTable.stakeholders.map((s) => s.id),
    ...(t.instruments ?? []).map((i) => i.id),
    ...(t.preferenceTiers ?? []).flatMap((tier) => [tier.id, ...tier.stakeholder_ids]),
  ]);
}

describe("FOUNDER_TEMPLATES", () => {
  it("contains exactly 4 templates", () => {
    expect(FOUNDER_TEMPLATES).toHaveLength(4);
  });

  /**
   * Template data is static, so its ids must be too. A module evaluated once per
   * server render, once per browser tab and again on every Fast Refresh cannot
   * mint its ids at load time: the same template would then describe a different
   * cap table in each of them, and nothing saved from one would line up with the
   * constants in the next.
   */
  it("carries the same ids in every module evaluation", async () => {
    vi.resetModules();
    const first = await import("@/lib/constants/founder-templates");
    const firstIds = allIds(first.FOUNDER_TEMPLATES);

    vi.resetModules();
    const second = await import("@/lib/constants/founder-templates");

    expect(allIds(second.FOUNDER_TEMPLATES)).toEqual(firstIds);
  });

  /**
   * Literal ids trade one hazard for another: a copy-paste collision would make
   * two stakeholders indistinguishable, and a preference tier assigned to one
   * would silently claim the other's shares.
   */
  it("never reuses an id across templates", () => {
    const stakeholderIds = FOUNDER_TEMPLATES.flatMap((t) =>
      t.capTable.stakeholders.map((s) => s.id)
    );
    expect(new Set(stakeholderIds).size).toBe(stakeholderIds.length);

    const instrumentIds = FOUNDER_TEMPLATES.flatMap((t) => (t.instruments ?? []).map((i) => i.id));
    expect(new Set(instrumentIds).size).toBe(instrumentIds.length);

    const tierIds = FOUNDER_TEMPLATES.flatMap((t) => (t.preferenceTiers ?? []).map((x) => x.id));
    expect(new Set(tierIds).size).toBe(tierIds.length);
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

        /**
         * A tier with no holders claims a liquidation preference for nobody: the
         * backend has nothing to pay it to, so the preference silently vanishes.
         */
        it("never ships a preference tier with no assigned holders", () => {
          for (const tier of template.preferenceTiers ?? []) {
            expect(tier.stakeholder_ids.length).toBeGreaterThan(0);
          }
        });

        it("assigns every preference tier to stakeholders that exist in the template", () => {
          const knownIds = new Set(template.capTable.stakeholders.map((s) => s.id));
          for (const tier of template.preferenceTiers ?? []) {
            for (const id of tier.stakeholder_ids) {
              expect(knownIds.has(id)).toBe(true);
            }
          }
        });

        it("only grants liquidation preference to preferred shareholders", () => {
          const shareClassById = new Map(
            template.capTable.stakeholders.map((s) => [s.id, s.share_class])
          );
          for (const tier of template.preferenceTiers ?? []) {
            for (const id of tier.stakeholder_ids) {
              expect(shareClassById.get(id)).toBe("preferred");
            }
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
