import { describe, it, expect } from "vitest";
import type { StockOptionsForm, RSUForm } from "@/lib/schemas";
import {
  isValidStockOptionsData,
  isValidRSUData,
  isStockOptionsForm,
  isRSUForm,
  isValidEquityData,
} from "@/lib/validation";

describe("Stock Options Validation", () => {
  it("should reject default zero values", () => {
    const defaultData: StockOptionsForm = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 0,
      num_options: 0,
      strike_price: 0,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 0,
    };

    expect(isValidStockOptionsData(defaultData)).toBe(false);
  });

  it("should accept valid stock options data", () => {
    const validData: StockOptionsForm = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 8000,
      num_options: 10000,
      strike_price: 1.0,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 10.0,
    };

    expect(isValidStockOptionsData(validData)).toBe(true);
  });

  it("should reject data with any zero critical field", () => {
    const dataWithZeroOptions: StockOptionsForm = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 8000,
      num_options: 0, // Invalid
      strike_price: 1.0,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 10.0,
    };

    expect(isValidStockOptionsData(dataWithZeroOptions)).toBe(false);
  });
});

describe("RSU Validation", () => {
  it("should reject default zero values", () => {
    const defaultData: RSUForm = {
      equity_type: "RSU",
      monthly_salary: 0,
      total_equity_grant_pct: 0,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 0,
    };

    expect(isValidRSUData(defaultData)).toBe(false);
  });

  it("should accept valid RSU data", () => {
    const validData: RSUForm = {
      equity_type: "RSU",
      monthly_salary: 8000,
      total_equity_grant_pct: 1.5,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 100000000,
    };

    expect(isValidRSUData(validData)).toBe(true);
  });
});

describe("Type Guards", () => {
  it("should correctly identify StockOptionsForm", () => {
    const data: StockOptionsForm = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 8000,
      num_options: 10000,
      strike_price: 1.0,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 10.0,
    };

    expect(isStockOptionsForm(data)).toBe(true);
    expect(isRSUForm(data)).toBe(false);
  });

  it("should correctly identify RSUForm", () => {
    const data: RSUForm = {
      equity_type: "RSU",
      monthly_salary: 8000,
      total_equity_grant_pct: 1.5,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 100000000,
    };

    expect(isRSUForm(data)).toBe(true);
    expect(isStockOptionsForm(data)).toBe(false);
  });
});

describe("Combined Validation", () => {
  it("should reject null equity data", () => {
    expect(isValidEquityData(null)).toBe(false);
  });

  it("should validate StockOptionsForm", () => {
    const invalidData: StockOptionsForm = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 0,
      num_options: 0,
      strike_price: 0,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 0,
    };

    const validData: StockOptionsForm = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 8000,
      num_options: 10000,
      strike_price: 1.0,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 10.0,
    };

    expect(isValidEquityData(invalidData)).toBe(false);
    expect(isValidEquityData(validData)).toBe(true);
  });

  it("should validate RSUForm", () => {
    const invalidData: RSUForm = {
      equity_type: "RSU",
      monthly_salary: 0,
      total_equity_grant_pct: 0,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 0,
    };

    const validData: RSUForm = {
      equity_type: "RSU",
      monthly_salary: 8000,
      total_equity_grant_pct: 1.5,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 100000000,
    };

    expect(isValidEquityData(invalidData)).toBe(false);
    expect(isValidEquityData(validData)).toBe(true);
  });
});
