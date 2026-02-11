import { describe, expect, it } from "vitest";
import { getTextDirection, isRtlLocale, normalizeLocaleTag } from "@/lib/i18n-utils";

describe("i18n-utils", () => {
  describe("normalizeLocaleTag", () => {
    it("normalizes casing and whitespace", () => {
      expect(normalizeLocaleTag(" AR-sa ")).toBe("ar-sa");
    });

    it("falls back to en for empty values", () => {
      expect(normalizeLocaleTag("")).toBe("en");
      expect(normalizeLocaleTag(undefined)).toBe("en");
      expect(normalizeLocaleTag(null)).toBe("en");
    });
  });

  describe("isRtlLocale", () => {
    it("detects Arabic locale tags as RTL", () => {
      expect(isRtlLocale("ar")).toBe(true);
      expect(isRtlLocale("ar-SA")).toBe(true);
    });

    it("treats non-RTL locales as LTR", () => {
      expect(isRtlLocale("en")).toBe(false);
      expect(isRtlLocale("fr-CA")).toBe(false);
    });
  });

  describe("getTextDirection", () => {
    it("returns rtl for Arabic locale", () => {
      expect(getTextDirection("ar-EG")).toBe("rtl");
    });

    it("returns ltr for English locale", () => {
      expect(getTextDirection("en-US")).toBe("ltr");
    });
  });
});
