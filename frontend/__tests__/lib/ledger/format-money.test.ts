import { describe, it, expect } from "vitest";
import { formatMoney } from "@/lib/ledger/format-money";

describe("formatMoney", () => {
  it("formats whole USD in English", () => {
    expect(formatMoney(22542, { currency: "USD", locale: "en" })).toBe("$22,542");
  });
  it("adds an explicit plus when signed", () => {
    expect(formatMoney(22542, { currency: "USD", locale: "en", signed: true })).toBe("+$22,542");
  });
  it("compacts at one million and above", () => {
    expect(formatMoney(81_810_164, { currency: "USD", locale: "en" })).toBe("$81.8M");
  });
  it("never compacts below the threshold", () => {
    expect(formatMoney(999_999, { currency: "USD", locale: "en" })).toBe("$999,999");
  });
  it("uses Western digits in Arabic", () => {
    const out = formatMoney(22542, { currency: "SAR", locale: "ar" });
    expect(out).toMatch(/22/);
    expect(out).not.toMatch(/[٠-٩]/);
  });
  it("keeps the minus sign for losses when signed", () => {
    expect(formatMoney(-82985, { currency: "USD", locale: "en", signed: true })).toMatch(
      /^-\$82,985$/
    );
  });
});
