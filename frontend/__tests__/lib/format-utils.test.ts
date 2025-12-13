/**
 * Tests for format-utils - number formatting and shorthand parsing
 * Following TDD - tests written first
 */
import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyWithDecimals,
  parseShorthand,
  formatNumberWithSeparators,
} from "@/lib/format-utils";

describe("formatCurrency", () => {
  it("formats whole numbers with commas and dollar sign", () => {
    expect(formatCurrency(1000)).toBe("$1,000");
    expect(formatCurrency(1000000)).toBe("$1,000,000");
  });

  it("handles zero", () => {
    expect(formatCurrency(0)).toBe("$0");
  });

  it("handles negative numbers", () => {
    expect(formatCurrency(-5000)).toBe("-$5,000");
  });
});

describe("formatCurrencyCompact", () => {
  it("formats thousands with K suffix", () => {
    expect(formatCurrencyCompact(1000)).toBe("$1K");
    expect(formatCurrencyCompact(50000)).toBe("$50K");
  });

  it("formats millions with M suffix", () => {
    expect(formatCurrencyCompact(1000000)).toBe("$1M");
    expect(formatCurrencyCompact(10000000)).toBe("$10M");
  });

  it("formats billions with B suffix", () => {
    expect(formatCurrencyCompact(1000000000)).toBe("$1B");
  });
});

describe("formatCurrencyWithDecimals", () => {
  it("splits currency into main and decimal parts", () => {
    const result = formatCurrencyWithDecimals(1234.56);
    expect(result.main).toBe("$1,234");
    expect(result.decimal).toBe(".56");
  });

  it("adds .00 for whole numbers", () => {
    const result = formatCurrencyWithDecimals(1000);
    expect(result.main).toBe("$1,000");
    expect(result.decimal).toBe(".00");
  });
});

describe("parseShorthand", () => {
  describe("K suffix (thousands)", () => {
    it("parses integer K values", () => {
      expect(parseShorthand("50K")).toBe(50000);
      expect(parseShorthand("50k")).toBe(50000);
      expect(parseShorthand("100K")).toBe(100000);
    });

    it("parses decimal K values", () => {
      expect(parseShorthand("1.5K")).toBe(1500);
      expect(parseShorthand("2.25k")).toBe(2250);
    });
  });

  describe("M suffix (millions)", () => {
    it("parses integer M values", () => {
      expect(parseShorthand("10M")).toBe(10000000);
      expect(parseShorthand("10m")).toBe(10000000);
      expect(parseShorthand("1M")).toBe(1000000);
    });

    it("parses decimal M values", () => {
      expect(parseShorthand("1.5M")).toBe(1500000);
      expect(parseShorthand("2.5m")).toBe(2500000);
    });
  });

  describe("B suffix (billions)", () => {
    it("parses integer B values", () => {
      expect(parseShorthand("1B")).toBe(1000000000);
      expect(parseShorthand("1b")).toBe(1000000000);
      expect(parseShorthand("2B")).toBe(2000000000);
    });

    it("parses decimal B values", () => {
      expect(parseShorthand("1.5B")).toBe(1500000000);
    });
  });

  describe("plain numbers", () => {
    it("parses numbers without suffix", () => {
      expect(parseShorthand("50000")).toBe(50000);
      expect(parseShorthand("1234")).toBe(1234);
    });

    it("handles numbers with commas", () => {
      expect(parseShorthand("50,000")).toBe(50000);
      expect(parseShorthand("1,000,000")).toBe(1000000);
    });

    it("handles numbers with dollar sign", () => {
      expect(parseShorthand("$50K")).toBe(50000);
      expect(parseShorthand("$1M")).toBe(1000000);
      expect(parseShorthand("$1,000")).toBe(1000);
    });
  });

  describe("edge cases", () => {
    it("returns NaN for invalid input", () => {
      expect(parseShorthand("")).toBeNaN();
      expect(parseShorthand("abc")).toBeNaN();
      expect(parseShorthand("K")).toBeNaN();
    });

    it("handles whitespace", () => {
      expect(parseShorthand(" 50K ")).toBe(50000);
      expect(parseShorthand("50 K")).toBe(50000);
    });

    it("handles zero", () => {
      expect(parseShorthand("0")).toBe(0);
      expect(parseShorthand("0K")).toBe(0);
    });
  });
});

describe("formatNumberWithSeparators", () => {
  it("formats integers with thousand separators", () => {
    expect(formatNumberWithSeparators(1000)).toBe("1,000");
    expect(formatNumberWithSeparators(1000000)).toBe("1,000,000");
    expect(formatNumberWithSeparators(1234567890)).toBe("1,234,567,890");
  });

  it("handles small numbers without separators", () => {
    expect(formatNumberWithSeparators(0)).toBe("0");
    expect(formatNumberWithSeparators(100)).toBe("100");
    expect(formatNumberWithSeparators(999)).toBe("999");
  });

  it("preserves decimals when present", () => {
    expect(formatNumberWithSeparators(1234.56)).toBe("1,234.56");
    expect(formatNumberWithSeparators(1000000.99)).toBe("1,000,000.99");
  });

  it("handles negative numbers", () => {
    expect(formatNumberWithSeparators(-1000)).toBe("-1,000");
    expect(formatNumberWithSeparators(-1000000)).toBe("-1,000,000");
  });
});
