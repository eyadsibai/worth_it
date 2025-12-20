/**
 * Tests for useScenarioCalculation hook
 * Tests the 3-step chained calculation flow
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { useScenarioCalculation } from "@/lib/hooks/use-scenario-calculation";
import type { GlobalSettingsForm, CurrentJobForm, RSUForm, StockOptionsForm } from "@/lib/schemas";

// Mock the API client hooks
vi.mock("@/lib/api-client", () => ({
  useCreateMonthlyDataGrid: vi.fn(),
  useCalculateOpportunityCost: vi.fn(),
  useCalculateStartupScenario: vi.fn(),
}));

// Import the mocked hooks
import {
  useCreateMonthlyDataGrid,
  useCalculateOpportunityCost,
  useCalculateStartupScenario,
} from "@/lib/api-client";

const mockUseCreateMonthlyDataGrid = useCreateMonthlyDataGrid as ReturnType<typeof vi.fn>;
const mockUseCalculateOpportunityCost = useCalculateOpportunityCost as ReturnType<typeof vi.fn>;
const mockUseCalculateStartupScenario = useCalculateStartupScenario as ReturnType<typeof vi.fn>;

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
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
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
  investment_frequency: "monthly",
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
  exercise_strategy: "at_exit",
  exercise_year: 5,
};

describe("useScenarioCalculation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validation", () => {
    it("returns hasValidData=false when globalSettings is null", () => {
      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

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
      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

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
      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

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
      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

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
      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

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
    it("returns isCalculating=true when monthlyDataMutation is pending", () => {
      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: true,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isCalculating).toBe(true);
    });

    it("returns isCalculating=true when opportunityCostMutation is pending", () => {
      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: { data: [] },
        isPending: false,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: true,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isCalculating).toBe(true);
    });

    it("returns isCalculating=false when no mutations are pending", () => {
      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      expect(result.current.isCalculating).toBe(false);
    });
  });

  describe("error handling", () => {
    it("returns error from monthlyDataMutation", () => {
      const testError = new Error("Monthly data error");
      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: testError,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

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

    it("categorizes network errors correctly", () => {
      const networkError = new Error("Network connection failed");
      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: networkError,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

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
      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: validationError,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

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
  });

  describe("retry functionality", () => {
    it("calls reset on all mutations when retry is called", async () => {
      const mockMonthlyReset = vi.fn();
      const mockOpportunityCostReset = vi.fn();
      const mockStartupScenarioReset = vi.fn();
      const mockMutate = vi.fn();

      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: mockMutate,
        reset: mockMonthlyReset,
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: mockOpportunityCostReset,
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: mockStartupScenarioReset,
        data: undefined,
        isPending: false,
        error: null,
      });

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      // Call retry
      result.current.retry();

      // All mutations should be reset
      expect(mockMonthlyReset).toHaveBeenCalled();
      expect(mockOpportunityCostReset).toHaveBeenCalled();
      expect(mockStartupScenarioReset).toHaveBeenCalled();
    });

    it("triggers new calculation when retry is called with valid data", async () => {
      const mockMutate = vi.fn();

      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: mockMutate,
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

      const { result } = renderHook(
        () =>
          useScenarioCalculation({
            globalSettings: validGlobalSettings,
            currentJob: validCurrentJob,
            equityDetails: validRSUEquity,
          }),
        { wrapper: createWrapper() }
      );

      // Initial useEffect calls mutate
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalled();
      });

      const initialCallCount = mockMutate.mock.calls.length;

      // Call retry
      result.current.retry();

      // Should have called mutate again
      expect(mockMutate.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  describe("result passthrough", () => {
    it("returns startupScenarioMutation.data as result", () => {
      const mockResult = { data: { total_startup_outcome: 500000 } };

      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: mockResult,
        isPending: false,
        error: null,
      });

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
      const mockOpportunityCost = { data: { total: 50000 } };

      mockUseCreateMonthlyDataGrid.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: mockMonthlyData,
        isPending: false,
        error: null,
      });
      mockUseCalculateOpportunityCost.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: mockOpportunityCost,
        isPending: false,
        error: null,
      });
      mockUseCalculateStartupScenario.mockReturnValue({
        mutate: vi.fn(),
        reset: vi.fn(),
        data: undefined,
        isPending: false,
        error: null,
      });

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
  });
});
