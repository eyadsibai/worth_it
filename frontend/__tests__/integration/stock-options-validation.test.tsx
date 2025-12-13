/**
 * Integration test for Stock Options validation
 * Verifies that switching to Stock Options doesn't trigger API calls with zero values
 */

import { describe, it, expect } from "vitest";
import { isValidEquityData } from "@/lib/validation";
import type { StockOptionsForm, RSUForm } from "@/lib/schemas";

describe("Stock Options Form Validation (Integration)", () => {
  it("should prevent API calls when switching to Stock Options with default values", () => {
    // Simulate the default values when switching to Stock Options
    const defaultStockOptions: StockOptionsForm = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 0,
      num_options: 0,
      strike_price: 0,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 0,
    };

    // This should return false, preventing API calls
    expect(isValidEquityData(defaultStockOptions)).toBe(false);
  });

  it("should allow API calls when Stock Options form has valid values", () => {
    const validStockOptions: StockOptionsForm = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 8000,
      num_options: 10000,
      strike_price: 1.0,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 10.0,
    };

    // This should return true, allowing API calls
    expect(isValidEquityData(validStockOptions)).toBe(true);
  });

  it("should prevent API calls when switching from RSU to Stock Options", () => {
    // Start with valid RSU data
    const validRSU: RSUForm = {
      equity_type: "RSU",
      monthly_salary: 8000,
      total_equity_grant_pct: 1.5,
      vesting_period: 4,
      cliff_period: 1,
      simulate_dilution: false,
      dilution_rounds: [],
      exit_valuation: 100000000,
    };

    // RSU should be valid
    expect(isValidEquityData(validRSU)).toBe(true);

    // When switching to Stock Options, default values should be invalid
    const defaultStockOptions: StockOptionsForm = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 0,
      num_options: 0,
      strike_price: 0,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 0,
    };

    // Stock Options with zeros should be invalid
    expect(isValidEquityData(defaultStockOptions)).toBe(false);
  });

  it("should allow API calls when partially filled Stock Options form", () => {
    // User has filled in some fields
    const partiallyFilledStockOptions: StockOptionsForm = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 8000,
      num_options: 10000,
      strike_price: 0, // Still missing
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 10.0,
    };

    // Should still be invalid until all critical fields are filled
    expect(isValidEquityData(partiallyFilledStockOptions)).toBe(false);
  });

  it("should validate that all critical fields must be > 0", () => {
    // Test each critical field individually
    const baseValidData: StockOptionsForm = {
      equity_type: "STOCK_OPTIONS",
      monthly_salary: 8000,
      num_options: 10000,
      strike_price: 1.0,
      vesting_period: 4,
      cliff_period: 1,
      exercise_strategy: "AT_EXIT",
      exit_price_per_share: 10.0,
    };

    // All fields valid
    expect(isValidEquityData(baseValidData)).toBe(true);

    // Test with num_options = 0
    expect(
      isValidEquityData({
        ...baseValidData,
        num_options: 0,
      })
    ).toBe(false);

    // Test with strike_price = 0
    expect(
      isValidEquityData({
        ...baseValidData,
        strike_price: 0,
      })
    ).toBe(false);

    // Test with exit_price_per_share = 0
    expect(
      isValidEquityData({
        ...baseValidData,
        exit_price_per_share: 0,
      })
    ).toBe(false);

    // Test with monthly_salary = 0
    expect(
      isValidEquityData({
        ...baseValidData,
        monthly_salary: 0,
      })
    ).toBe(false);
  });
});
