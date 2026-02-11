import { describe, expect, it } from "vitest";
import { BerkusFormSchema } from "@/lib/schemas";

describe("BerkusFormSchema", () => {
  it("accepts the safe mvp field used by the form", () => {
    const result = BerkusFormSchema.safeParse({
      soundIdea: 250_000,
      mvp: 200_000,
      qualityTeam: 300_000,
      strategicRelationships: 150_000,
      productRollout: 100_000,
      maxPerCriterion: 500_000,
    });

    expect(result.success).toBe(true);
  });

  it("rejects legacy prototype key to prevent silent missing payload fields", () => {
    const result = BerkusFormSchema.safeParse({
      soundIdea: 250_000,
      prototype: 200_000,
      qualityTeam: 300_000,
      strategicRelationships: 150_000,
      productRollout: 100_000,
      maxPerCriterion: 500_000,
    });

    expect(result.success).toBe(false);
  });
});
