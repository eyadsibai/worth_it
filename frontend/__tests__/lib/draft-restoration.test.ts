/**
 * TDD tests for Bug #7: Draft restoration should use Zod validation
 * instead of unsafe `as` type casting.
 */

import { describe, it, expect } from "vitest";
import {
  GlobalSettingsFormSchema,
  CurrentJobFormSchema,
  RSUFormSchema,
  StockOptionsFormSchema,
} from "@/lib/schemas";
import { safeParseDraftData } from "@/lib/hooks/use-draft-auto-save";

describe("Draft restoration Zod validation", () => {
  describe("GlobalSettingsFormSchema", () => {
    it("should accept valid global settings", () => {
      const result = GlobalSettingsFormSchema.safeParse({ exit_year: 5 });
      expect(result.success).toBe(true);
    });

    it("should reject invalid global settings", () => {
      const result = GlobalSettingsFormSchema.safeParse({ exit_year: "not a number" });
      expect(result.success).toBe(false);
    });

    it("should reject out-of-range exit_year", () => {
      const result = GlobalSettingsFormSchema.safeParse({ exit_year: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe("CurrentJobFormSchema", () => {
    it("should accept valid current job data", () => {
      const result = CurrentJobFormSchema.safeParse({
        monthly_salary: 15000,
        annual_salary_growth_rate: 0.05,
        assumed_annual_roi: 0.08,
        investment_frequency: "Monthly",
      });
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const result = CurrentJobFormSchema.safeParse({ monthly_salary: 15000 });
      expect(result.success).toBe(false);
    });
  });

  describe("Equity schemas", () => {
    it("should accept valid RSU form data", () => {
      const result = RSUFormSchema.safeParse({
        equity_type: "RSU",
        monthly_salary: 12000,
        total_equity_grant_pct: 0.5,
        vesting_period: 4,
        cliff_period: 1,
        simulate_dilution: false,
        dilution_rounds: [],
        exit_valuation: 100_000_000,
      });
      expect(result.success).toBe(true);
    });

    it("should accept valid stock options form data", () => {
      const result = StockOptionsFormSchema.safeParse({
        equity_type: "STOCK_OPTIONS",
        monthly_salary: 12000,
        num_options: 10000,
        strike_price: 1.5,
        vesting_period: 4,
        cliff_period: 1,
        exercise_strategy: "AT_EXIT",
        exit_price_per_share: 15.0,
      });
      expect(result.success).toBe(true);
    });

    it("should reject corrupted equity data", () => {
      const result = RSUFormSchema.safeParse({
        equity_type: "INVALID",
        monthly_salary: "not a number",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("safeParseDraftData helper", () => {
    it("should safely parse valid draft data", () => {
      const validDraft = {
        globalSettings: { exit_year: 5 },
        currentJob: {
          monthly_salary: 15000,
          annual_salary_growth_rate: 0.05,
          assumed_annual_roi: 0.08,
          investment_frequency: "Monthly" as const,
        },
        equityDetails: {
          equity_type: "RSU" as const,
          monthly_salary: 12000,
          total_equity_grant_pct: 0.5,
          vesting_period: 4,
          cliff_period: 1,
          simulate_dilution: false,
          dilution_rounds: [],
          exit_valuation: 100_000_000,
        },
      };

      const result = safeParseDraftData(validDraft);
      expect(result.globalSettings).toEqual({ exit_year: 5 });
      expect(result.currentJob).not.toBeNull();
      expect(result.equityDetails).not.toBeNull();
    });

    it("should return nulls for invalid draft data", () => {
      const invalidDraft = {
        globalSettings: { exit_year: "garbage" } as unknown as null,
        currentJob: { monthly_salary: "not a number" } as unknown as null,
        equityDetails: { equity_type: "INVALID" } as unknown as null,
      };

      const result = safeParseDraftData(invalidDraft);
      expect(result.globalSettings).toBeNull();
      expect(result.currentJob).toBeNull();
      expect(result.equityDetails).toBeNull();
    });

    it("should handle partially valid draft data", () => {
      const partialDraft = {
        globalSettings: { exit_year: 5 },
        currentJob: null,
        equityDetails: { equity_type: "INVALID" } as unknown as null,
      };

      const result = safeParseDraftData(partialDraft);
      expect(result.globalSettings).toEqual({ exit_year: 5 });
      expect(result.currentJob).toBeNull();
      expect(result.equityDetails).toBeNull();
    });

    it("should return null offers when the field is absent", () => {
      const result = safeParseDraftData({
        globalSettings: null,
        currentJob: null,
        equityDetails: null,
      });

      expect(result.offers).toBeNull();
    });

    it("should validate each offer's equity details independently", () => {
      const draftWithOffers = {
        globalSettings: null,
        currentJob: null,
        equityDetails: null,
        offers: [
          {
            id: "offer-1",
            name: "Startup A",
            equityDetails: {
              equity_type: "RSU" as const,
              monthly_salary: 12000,
              total_equity_grant_pct: 0.5,
              vesting_period: 4,
              cliff_period: 1,
              simulate_dilution: false,
              dilution_rounds: [],
              exit_valuation: 100_000_000,
            },
          },
          {
            id: "offer-2",
            name: "Startup B",
            equityDetails: { equity_type: "INVALID" } as unknown as null,
          },
        ],
      };

      const result = safeParseDraftData(draftWithOffers);

      expect(result.offers).toHaveLength(2);
      expect(result.offers?.[0].equityDetails).not.toBeNull();
      expect(result.offers?.[1].equityDetails).toBeNull();
      expect(result.offers?.[1].name).toBe("Startup B");
    });

    it("should drop offer entries missing an id or name", () => {
      const draftWithMalformedOffer = {
        globalSettings: null,
        currentJob: null,
        equityDetails: null,
        offers: [{ name: "No id" }, { id: "offer-1", name: "Startup A", equityDetails: null }],
      };

      const result = safeParseDraftData(
        draftWithMalformedOffer as unknown as Parameters<typeof safeParseDraftData>[0]
      );

      expect(result.offers).toHaveLength(1);
      expect(result.offers?.[0].id).toBe("offer-1");
    });
  });
});
