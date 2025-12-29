/**
 * Tests for useBenchmarkValidation hook
 * Following TDD - tests written first
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBenchmarkValidation } from "@/lib/hooks/use-benchmark-validation";

// Mock the API client
vi.mock("@/lib/api-client", () => ({
  apiClient: {
    validateBenchmark: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
const mockValidateBenchmark = apiClient.validateBenchmark as ReturnType<typeof vi.fn>;

// Test data
const mockValidationResponse = {
  is_valid: true,
  severity: "warning" as const,
  message: "Value is above typical range",
  benchmark_median: 6.0,
  suggested_range: [4.0, 12.0] as [number, number],
};

describe("useBenchmarkValidation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockValidateBenchmark.mockResolvedValue(mockValidationResponse);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns empty validations initially", () => {
    const { result } = renderHook(() => useBenchmarkValidation("saas"));

    expect(result.current.validations).toEqual({});
    expect(result.current.isValidating).toBe(false);
  });

  it("does not validate when industry code is null", async () => {
    const { result } = renderHook(() => useBenchmarkValidation(null));

    act(() => {
      result.current.validateField("revenue_multiple", 15);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockValidateBenchmark).not.toHaveBeenCalled();
    // Sets null for the field when no industry selected
    expect(result.current.validations["revenue_multiple"]).toBeNull();
  });

  it("validates field after debounce delay", async () => {
    const { result } = renderHook(() => useBenchmarkValidation("saas"));

    act(() => {
      result.current.validateField("revenue_multiple", 15);
    });

    // Should not call API immediately
    expect(mockValidateBenchmark).not.toHaveBeenCalled();

    // Run all timers and wait for async operations
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockValidateBenchmark).toHaveBeenCalledWith({
      industry_code: "saas",
      metric_name: "revenue_multiple",
      value: 15,
    });
  });

  it("stores validation result by field key", async () => {
    const { result } = renderHook(() => useBenchmarkValidation("saas"));

    act(() => {
      result.current.validateField("revenue_multiple", 15);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.validations["revenue_multiple"]).toEqual(mockValidationResponse);
  });

  it("uses custom field key when provided", async () => {
    const { result } = renderHook(() => useBenchmarkValidation("saas"));

    act(() => {
      result.current.validateField("revenue_multiple", 15, "custom_key");
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.validations["custom_key"]).toEqual(mockValidationResponse);
    expect(result.current.validations["revenue_multiple"]).toBeUndefined();
  });

  it("debounces rapid changes for same field", async () => {
    const { result } = renderHook(() => useBenchmarkValidation("saas"));

    // First call
    act(() => {
      result.current.validateField("revenue_multiple", 10);
    });

    // Advance time but not enough to trigger
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Second call resets timer
    act(() => {
      result.current.validateField("revenue_multiple", 12);
    });

    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    // Third call resets timer again
    act(() => {
      result.current.validateField("revenue_multiple", 15);
    });

    // Now run all timers
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Should only call API once with final value
    expect(mockValidateBenchmark).toHaveBeenCalledTimes(1);
    expect(mockValidateBenchmark).toHaveBeenCalledWith({
      industry_code: "saas",
      metric_name: "revenue_multiple",
      value: 15,
    });
  });

  it("validates multiple fields independently", async () => {
    const secondResponse = {
      ...mockValidationResponse,
      message: "Discount rate is high",
      benchmark_median: 0.25,
    };

    mockValidateBenchmark
      .mockResolvedValueOnce(mockValidationResponse)
      .mockResolvedValueOnce(secondResponse);

    const { result } = renderHook(() => useBenchmarkValidation("saas"));

    act(() => {
      result.current.validateField("revenue_multiple", 15);
      result.current.validateField("discount_rate", 0.45);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(mockValidateBenchmark).toHaveBeenCalledTimes(2);
    expect(result.current.validations["revenue_multiple"]).toBeDefined();
    expect(result.current.validations["discount_rate"]).toBeDefined();
  });

  it("clears validation for specific field", async () => {
    const { result } = renderHook(() => useBenchmarkValidation("saas"));

    act(() => {
      result.current.validateField("revenue_multiple", 15);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.validations["revenue_multiple"]).toBeDefined();

    act(() => {
      result.current.clearValidation("revenue_multiple");
    });

    expect(result.current.validations["revenue_multiple"]).toBeUndefined();
  });

  it("clears all validations", async () => {
    mockValidateBenchmark.mockResolvedValue(mockValidationResponse);

    const { result } = renderHook(() => useBenchmarkValidation("saas"));

    act(() => {
      result.current.validateField("revenue_multiple", 15);
      result.current.validateField("discount_rate", 0.45, "discount");
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(Object.keys(result.current.validations).length).toBe(2);

    act(() => {
      result.current.clearAllValidations();
    });

    expect(result.current.validations).toEqual({});
  });

  it("clears validations when industry code changes to null", async () => {
    const { result, rerender } = renderHook(
      ({ industryCode }) => useBenchmarkValidation(industryCode),
      { initialProps: { industryCode: "saas" as string | null } }
    );

    // Validate with saas
    act(() => {
      result.current.validateField("revenue_multiple", 15);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.validations["revenue_multiple"]).toBeDefined();

    // Change industry to null - should set null for field
    rerender({ industryCode: null });

    act(() => {
      result.current.validateField("revenue_multiple", 20);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // No additional API call for null industry
    expect(mockValidateBenchmark).toHaveBeenCalledTimes(1);
  });

  it("handles API errors gracefully", async () => {
    mockValidateBenchmark.mockRejectedValueOnce(new Error("API error"));

    const { result } = renderHook(() => useBenchmarkValidation("saas"));

    act(() => {
      result.current.validateField("revenue_multiple", 15);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    // Should not throw, validation should be removed
    expect(result.current.validations["revenue_multiple"]).toBeUndefined();
    expect(result.current.isValidating).toBe(false);
  });

  it("sets isValidating during API call", async () => {
    let resolvePromise: (value: typeof mockValidationResponse) => void;
    mockValidateBenchmark.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    const { result } = renderHook(() => useBenchmarkValidation("saas"));

    act(() => {
      result.current.validateField("revenue_multiple", 15);
    });

    // Run timers to trigger the setTimeout callback
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    // Should be validating while waiting for response
    expect(result.current.isValidating).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolvePromise!(mockValidationResponse);
    });

    expect(result.current.isValidating).toBe(false);
    expect(result.current.validations["revenue_multiple"]).toEqual(mockValidationResponse);
  });
});
