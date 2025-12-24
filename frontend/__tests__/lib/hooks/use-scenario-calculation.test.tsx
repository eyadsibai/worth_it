/**
 * Tests for useScenarioCalculation hook
 * Tests the 3-step chained calculation flow using TanStack Query
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useScenarioCalculation } from "@/lib/hooks/use-scenario-calculation";
import type { GlobalSettingsForm, CurrentJobForm, RSUForm, StockOptionsForm } from "@/lib/schemas";

// Mock the API client hooks, preserving the real APIError class
vi.mock("@/lib/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-client")>();
  return {
    ...actual,
    useMonthlyDataGridQuery: vi.fn(),
    useOpportunityCostQuery: vi.fn(),
    useStartupScenarioQuery: vi.fn(),
  };
});

// Import the mocked hooks
import {
  useMonthlyDataGridQuery,
  useOpportunityCostQuery,
  useStartupScenarioQuery,
} from "@/lib/api-client";

const mockUseMonthlyDataGridQuery = useMonthlyDataGridQuery as ReturnType<typeof vi.fn>;
const mockUseOpportunityCostQuery = useOpportunityCostQuery as ReturnType<typeof vi.fn>;
const mockUseStartupScenarioQuery = useStartupScenarioQuery as ReturnType<typeof vi.fn>;

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

// Test wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = createTestQueryClient();
  return function TestWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// Sample test data
const validGlobalSettings: GlobalSettingsForm = {
  exit_year: 5,
};

const validCurrentJob: CurrentJobForm = {
  monthly_salary: 10000,
  annual_salary_growth_rate: 3,
  assumed_annual_roi: 7,
  investment_frequency: "Monthly",
};

const validRSUEquity: RSUForm = {
  equity_type: "RSU",
  monthly_salary: 8000,
  vesting_period: 4,
  cliff_period: 1,
  total_equity_grant_pct: 0.5,
  exit_valuation: 100000000,
  simulate_dilution: false,
  dilution_rounds: [],
};

const validStockOptionsEquity: StockOptionsForm = {
  equity_type: "STOCK_OPTIONS",
  monthly_salary: 8000,
  vesting_period: 4,
  cliff_period: 1,
  num_options: 10000,
  strike_price: 1,
  exit_price_per_share: 10,
  exercise_strategy: "AT_EXIT",
  exercise_year: 5,
};

// Helper to create default query mock state
function createQueryMock(
  overrides: Partial<{
    data: unknown;
    isPending: boolean;
    isFetching: boolean;
    error: Error | null;
  }> = {}
) {
  return {
    data: undefined,
    isPending: false,
    isFetching: false,
    error: null,
    ...overrides,
  };
}

describe("useScenarioCalculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock setup for all tests
    mockUseMonthlyDataGridQuery.mockReturnValue(createQueryMock());
    mockUseOpportunityCostQuery.mockReturnValue(createQueryMock());
    mockUseStartupScenarioQuery.mockReturnValue(createQueryMock());
  });

  describe("validation", () => {
    it("returns hasValidData=false when globalSettings is null", () => {
      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: null,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.hasValidData).toBe(false);
    });

    it("returns hasValidData=false when currentJob is null", () => {
      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: null,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.hasValidData).toBe(false);
    });

    it("returns hasValidData=false when equityDetails is null", () => {
      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: null,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.hasValidData).toBe(false);
    });

    it("returns hasValidData=true when all inputs are valid for RSU", () => {
      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.hasValidData).toBe(true);
    });

    it("returns hasValidData=true when all inputs are valid for Stock Options", () => {
      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validStockOptionsEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.hasValidData).toBe(true);
    });
  });

  describe("loading states", () => {
    it("returns isPending=true when monthlyDataQuery is pending without data", () => {
      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          isPending: true,
          data: undefined,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isPending).toBe(true);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.isCalculating).toBe(true);
    });

    it("returns isFetching=true when monthlyDataQuery is fetching with stale data", () => {
      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          isPending: false,
          isFetching: true,
          data: { data: [] },
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isPending).toBe(false);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.isCalculating).toBe(true);
    });

    it("returns isPending=true when opportunityCostQuery is pending without data", () => {
      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          data: { data: [] },
        })
      );
      mockUseOpportunityCostQuery.mockReturnValue(
        createQueryMock({
          isPending: true,
          data: undefined,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isPending).toBe(true);
      expect(result.current.isCalculating).toBe(true);
    });

    it("returns isCalculating=false when no queries are pending or fetching", () => {
      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isPending).toBe(false);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.isCalculating).toBe(false);
    });

    it("returns isFetching=true when any query is fetching with stale data", () => {
      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          data: { data: [] },
        })
      );
      mockUseOpportunityCostQuery.mockReturnValue(
        createQueryMock({
          data: { data: [] },
          isFetching: true,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isFetching).toBe(true);
      expect(result.current.isCalculating).toBe(true);
    });
  });

  describe("error handling", () => {
    it("returns error from monthlyDataQuery", () => {
      const testError = new Error("Monthly data error");
      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          error: testError,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.error).toBe(testError);
    });

    it("returns first error in chain (monthlyData takes precedence)", () => {
      const monthlyError = new Error("Monthly error");
      const opportunityError = new Error("Opportunity error");

      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          error: monthlyError,
        })
      );
      mockUseOpportunityCostQuery.mockReturnValue(
        createQueryMock({
          error: opportunityError,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.error).toBe(monthlyError);
    });

    it("categorizes network errors correctly", () => {
      const networkError = new Error("Network connection failed");
      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          error: networkError,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.errorType).toBe("network");
    });

    it("categorizes validation errors correctly", () => {
      const validationError = new Error("Invalid input data");
      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          error: validationError,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.errorType).toBe("validation");
    });

    it("categorizes fetch errors as network", () => {
      const fetchError = new Error("Failed to fetch");
      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          error: fetchError,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.errorType).toBe("network");
    });

    it("returns generic errorType for unknown errors", () => {
      const unknownError = new Error("Something went wrong");
      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          error: unknownError,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.errorType).toBe("generic");
    });
  });

  describe("retry functionality", () => {
    it("retry function is callable", () => {
      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      // retry should be a function
      expect(typeof result.current.retry).toBe("function");
      // Should not throw when called
      expect(() => result.current.retry()).not.toThrow();
    });
  });

  describe("result passthrough", () => {
    it("returns startupScenarioQuery.data as result", () => {
      const mockResult = {
        results_df: [],
        final_payout_value: 500000,
        final_opportunity_cost: 100000,
        payout_label: "Test",
        breakeven_label: "Test",
      };

      mockUseStartupScenarioQuery.mockReturnValue(
        createQueryMock({
          data: mockResult,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.result).toBe(mockResult);
    });

    it("returns monthlyData and opportunityCost intermediate results", () => {
      const mockMonthlyData = { data: [{ month: 1, salary: 10000 }] };
      const mockOpportunityCost = { data: [{ year: 1, cost: 50000 }] };

      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          data: mockMonthlyData,
        })
      );
      mockUseOpportunityCostQuery.mockReturnValue(
        createQueryMock({
          data: mockOpportunityCost,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.monthlyData).toBe(mockMonthlyData);
      expect(result.current.opportunityCost).toBe(mockOpportunityCost);
    });

    it("returns undefined for results when queries have no data", () => {
      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.result).toBeUndefined();
      expect(result.current.monthlyData).toBeUndefined();
      expect(result.current.opportunityCost).toBeUndefined();
    });
  });

  describe("stale-while-revalidate pattern", () => {
    it("maintains previous data while refetching (isFetching=true, data present)", () => {
      const staleData = { data: [{ month: 1, salary: 10000 }] };

      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          data: staleData,
          isFetching: true,
          isPending: false,
        })
      );

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      // Should have data AND be fetching
      expect(result.current.monthlyData).toBe(staleData);
      expect(result.current.isFetching).toBe(true);
      expect(result.current.isPending).toBe(false);
    });

    it("distinguishes between first load (isPending) and refetch (isFetching)", () => {
      // First load scenario - no data, isPending
      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          isPending: true,
          data: undefined,
        })
      );

      const { result: firstLoadResult } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(firstLoadResult.current.isPending).toBe(true);
      expect(firstLoadResult.current.isFetching).toBe(false);

      // Refetch scenario - has data, isFetching
      mockUseMonthlyDataGridQuery.mockReturnValue(
        createQueryMock({
          isPending: false,
          isFetching: true,
          data: { data: [] },
        })
      );

      const { result: refetchResult } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(refetchResult.current.isPending).toBe(false);
      expect(refetchResult.current.isFetching).toBe(true);
    });
  });
});
