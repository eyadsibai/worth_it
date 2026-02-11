/**
 * TDD tests for Bug #10: Ensure key mutation hooks are cancellable.
 *
 * Components that trigger mutations from user input changes need the
 * cancellable pattern to prevent race conditions and stale responses.
 * The cancel() method is the key indicator of a cancellable mutation.
 */

import * as React from "react";
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Helper: create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("Bug #10: Mutation hooks must be cancellable", () => {
  describe("Valuation calculator mutations", () => {
    it("useCalculateRevenueMultiple should return cancel()", async () => {
      const { useCalculateRevenueMultiple } = await import("@/lib/api-client");
      const { result } = renderHook(() => useCalculateRevenueMultiple(), {
        wrapper: createWrapper(),
      });
      expect(typeof result.current.cancel).toBe("function");
    });

    it("useCalculateDCF should return cancel()", async () => {
      const { useCalculateDCF } = await import("@/lib/api-client");
      const { result } = renderHook(() => useCalculateDCF(), { wrapper: createWrapper() });
      expect(typeof result.current.cancel).toBe("function");
    });

    it("useCalculateVCMethod should return cancel()", async () => {
      const { useCalculateVCMethod } = await import("@/lib/api-client");
      const { result } = renderHook(() => useCalculateVCMethod(), { wrapper: createWrapper() });
      expect(typeof result.current.cancel).toBe("function");
    });

    it("useCalculateFirstChicago should return cancel()", async () => {
      const { useCalculateFirstChicago } = await import("@/lib/api-client");
      const { result } = renderHook(() => useCalculateFirstChicago(), {
        wrapper: createWrapper(),
      });
      expect(typeof result.current.cancel).toBe("function");
    });

    it("useCompareValuations should return cancel()", async () => {
      const { useCompareValuations } = await import("@/lib/api-client");
      const { result } = renderHook(() => useCompareValuations(), { wrapper: createWrapper() });
      expect(typeof result.current.cancel).toBe("function");
    });
  });

  describe("Pre-revenue valuation mutations", () => {
    it("useCalculateBerkus should return cancel()", async () => {
      const { useCalculateBerkus } = await import("@/lib/api-client");
      const { result } = renderHook(() => useCalculateBerkus(), { wrapper: createWrapper() });
      expect(typeof result.current.cancel).toBe("function");
    });

    it("useCalculateScorecard should return cancel()", async () => {
      const { useCalculateScorecard } = await import("@/lib/api-client");
      const { result } = renderHook(() => useCalculateScorecard(), { wrapper: createWrapper() });
      expect(typeof result.current.cancel).toBe("function");
    });

    it("useCalculateRiskFactorSummation should return cancel()", async () => {
      const { useCalculateRiskFactorSummation } = await import("@/lib/api-client");
      const { result } = renderHook(() => useCalculateRiskFactorSummation(), {
        wrapper: createWrapper(),
      });
      expect(typeof result.current.cancel).toBe("function");
    });
  });

  describe("Calculation mutations", () => {
    it("useRunMonteCarlo should return cancel()", async () => {
      const { useRunMonteCarlo } = await import("@/lib/api-client");
      const { result } = renderHook(() => useRunMonteCarlo(), { wrapper: createWrapper() });
      expect(typeof result.current.cancel).toBe("function");
    });

    it("useRunSensitivityAnalysis should return cancel()", async () => {
      const { useRunSensitivityAnalysis } = await import("@/lib/api-client");
      const { result } = renderHook(() => useRunSensitivityAnalysis(), {
        wrapper: createWrapper(),
      });
      expect(typeof result.current.cancel).toBe("function");
    });

    it("useCalculateWaterfall should return cancel()", async () => {
      const { useCalculateWaterfall } = await import("@/lib/api-client");
      const { result } = renderHook(() => useCalculateWaterfall(), { wrapper: createWrapper() });
      expect(typeof result.current.cancel).toBe("function");
    });

    it("useGetDilutionPreview should return cancel()", async () => {
      const { useGetDilutionPreview } = await import("@/lib/api-client");
      const { result } = renderHook(() => useGetDilutionPreview(), { wrapper: createWrapper() });
      expect(typeof result.current.cancel).toBe("function");
    });

    it("useCompareScenarios should return cancel()", async () => {
      const { useCompareScenarios } = await import("@/lib/api-client");
      const { result } = renderHook(() => useCompareScenarios(), { wrapper: createWrapper() });
      expect(typeof result.current.cancel).toBe("function");
    });
  });
});
