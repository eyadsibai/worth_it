import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFieldWarnings, getFieldWarning } from "@/lib/hooks/use-field-warnings";

describe("getFieldWarning", () => {
  describe("monthly_salary field", () => {
    it("returns warning when value is below 1000", () => {
      const warning = getFieldWarning("monthly_salary", 500);
      expect(warning).toBe("This seems low for monthly salary. Did you mean yearly?");
    });

    it("returns warning when value exceeds 100000", () => {
      const warning = getFieldWarning("monthly_salary", 150000);
      expect(warning).toBe("This seems high for monthly salary. Did you mean yearly?");
    });

    it("returns null for reasonable values", () => {
      expect(getFieldWarning("monthly_salary", 5000)).toBeNull();
      expect(getFieldWarning("monthly_salary", 10000)).toBeNull();
      expect(getFieldWarning("monthly_salary", 50000)).toBeNull();
    });

    it("returns null for exactly 1000", () => {
      expect(getFieldWarning("monthly_salary", 1000)).toBeNull();
    });

    it("returns null for exactly 100000", () => {
      expect(getFieldWarning("monthly_salary", 100000)).toBeNull();
    });
  });

  describe("startup_monthly_salary field", () => {
    it("returns warning when value is 0", () => {
      const warning = getFieldWarning("startup_monthly_salary", 0);
      expect(warning).toBe("Confirm: $0 monthly salary from startup?");
    });

    it("returns warning when value is below 1000 but not zero", () => {
      const warning = getFieldWarning("startup_monthly_salary", 500);
      expect(warning).toBe("This seems low for monthly salary. Did you mean yearly?");
    });

    it("returns null for reasonable values", () => {
      expect(getFieldWarning("startup_monthly_salary", 5000)).toBeNull();
    });
  });

  describe("vesting_years field", () => {
    it("returns warning when value exceeds 5", () => {
      const warning = getFieldWarning("vesting_years", 6);
      expect(warning).toBe("This is an unusually long vesting period");
    });

    it("returns null for 5 or less", () => {
      expect(getFieldWarning("vesting_years", 4)).toBeNull();
      expect(getFieldWarning("vesting_years", 5)).toBeNull();
    });
  });

  describe("exit_valuation field with context", () => {
    it("returns warning when exit_valuation is less than annual salary", () => {
      const context = { monthly_salary: 10000 }; // annual = 120000
      const warning = getFieldWarning("exit_valuation", 100000, context);
      expect(warning).toBe("Exit value is lower than one year's salary");
    });

    it("returns null when exit_valuation exceeds annual salary", () => {
      const context = { monthly_salary: 10000 };
      const warning = getFieldWarning("exit_valuation", 200000, context);
      expect(warning).toBeNull();
    });

    it("returns null when monthly_salary context is not provided", () => {
      const warning = getFieldWarning("exit_valuation", 100000);
      expect(warning).toBeNull();
    });
  });

  describe("unknown fields", () => {
    it("returns null for fields without warning rules", () => {
      expect(getFieldWarning("unknown_field", 999999)).toBeNull();
      expect(getFieldWarning("equity_percentage", 50)).toBeNull();
    });
  });
});

describe("useFieldWarnings hook", () => {
  it("returns warning for field with warning condition", () => {
    const { result } = renderHook(() => useFieldWarnings("monthly_salary", 500));
    expect(result.current).toBe("This seems low for monthly salary. Did you mean yearly?");
  });

  it("returns null for field without warning", () => {
    const { result } = renderHook(() => useFieldWarnings("monthly_salary", 5000));
    expect(result.current).toBeNull();
  });

  it("accepts context parameter", () => {
    const { result } = renderHook(() =>
      useFieldWarnings("exit_valuation", 100000, { monthly_salary: 10000 })
    );
    expect(result.current).toBe("Exit value is lower than one year's salary");
  });

  it("updates when value changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useFieldWarnings("monthly_salary", value),
      { initialProps: { value: 500 } }
    );

    expect(result.current).toBe("This seems low for monthly salary. Did you mean yearly?");

    rerender({ value: 5000 });
    expect(result.current).toBeNull();
  });
});
