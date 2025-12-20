/**
 * Tests for EmployeeDashboard component
 * Tests form orchestration, calculation coordination, and conditional rendering
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";

// Mock the store
vi.mock("@/lib/store", () => ({
  useAppStore: vi.fn(),
}));

// Mock hooks
vi.mock("@/lib/hooks", () => ({
  useDebounce: (value: unknown) => value, // No debouncing in tests
  useSidebarFormStatus: () => ({
    globalSettings: { complete: true, total: 1 },
    currentJob: { complete: true, total: 4 },
    equityDetails: { complete: true, total: 8 },
  }),
  useScenarioCalculation: vi.fn(),
}));

// Mock validation module
vi.mock("@/lib/validation", () => ({
  isValidEquityData: () => true,
}));

// Mock form components
vi.mock("@/components/forms/global-settings-form", () => ({
  GlobalSettingsFormComponent: () => (
    <div data-testid="global-settings-form">Global Settings Form</div>
  ),
}));

vi.mock("@/components/forms/current-job-form", () => ({
  CurrentJobFormComponent: () => (
    <div data-testid="current-job-form">Current Job Form</div>
  ),
}));

vi.mock("@/components/forms/startup-offer-form", () => ({
  StartupOfferFormComponent: () => (
    <div data-testid="startup-offer-form">Startup Offer Form</div>
  ),
}));

vi.mock("@/components/forms/form-completion-summary", () => ({
  FormCompletionSummary: () => (
    <div data-testid="form-completion-summary">Form Completion Summary</div>
  ),
}));

vi.mock("@/components/forms/example-loader", () => ({
  ExampleLoader: () => <div data-testid="example-loader">Example Loader</div>,
}));

// Mock results components
vi.mock("@/components/results/scenario-results", () => ({
  ScenarioResults: () => <div data-testid="scenario-results">Scenario Results</div>,
}));

vi.mock("@/components/results/sensitivity-analysis-panel", () => ({
  SensitivityAnalysisPanel: () => (
    <div data-testid="sensitivity-analysis-panel">Sensitivity Analysis Panel</div>
  ),
}));

vi.mock("@/components/scenarios/scenario-manager", () => ({
  ScenarioManager: () => <div data-testid="scenario-manager">Scenario Manager</div>,
}));

vi.mock("@/components/scenarios/scenario-comparison", () => ({
  ScenarioComparison: () => <div data-testid="scenario-comparison">Scenario Comparison</div>,
}));

vi.mock("@/components/forms/monte-carlo-form", () => ({
  MonteCarloFormComponent: () => <div data-testid="monte-carlo-form">Monte Carlo Form</div>,
}));

vi.mock("@/components/charts/monte-carlo-visualizations", () => ({
  MonteCarloVisualizations: () => <div data-testid="monte-carlo-vis">Monte Carlo Visualizations</div>,
}));

vi.mock("@/components/templates/template-picker", () => ({
  TemplatePicker: () => <div data-testid="template-picker">Template Picker</div>,
}));

// Import the mocked hooks
import { useAppStore } from "@/lib/store";
import { useScenarioCalculation } from "@/lib/hooks";

const mockUseAppStore = useAppStore as ReturnType<typeof vi.fn>;
const mockUseScenarioCalculation = useScenarioCalculation as ReturnType<typeof vi.fn>;

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("EmployeeDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default store mock
    mockUseAppStore.mockReturnValue({
      globalSettings: { exit_year: 5 },
      currentJob: {
        monthly_salary: 10000,
        annual_salary_growth_rate: 3,
        assumed_annual_roi: 7,
        investment_frequency: "monthly",
      },
      equityDetails: {
        equity_type: "RSU",
        monthly_salary: 8000,
        vesting_period: 4,
        cliff_period: 1,
        total_equity_grant_pct: 0.5,
        exit_valuation: 100000000,
        simulate_dilution: false,
        dilution_rounds: [],
      },
      setGlobalSettings: vi.fn(),
      setCurrentJob: vi.fn(),
      setEquityDetails: vi.fn(),
      monteCarloResults: null,
      setMonteCarloResults: vi.fn(),
      comparisonScenarios: [],
      setComparisonScenarios: vi.fn(),
      clearComparisonScenarios: vi.fn(),
    });

    // Default calculation hook mock
    mockUseScenarioCalculation.mockReturnValue({
      hasValidData: true,
      isCalculating: false,
      result: undefined,
      error: null,
      errorType: "generic",
      retry: vi.fn(),
    });
  });

  it("renders all form components", () => {
    render(<EmployeeDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("global-settings-form")).toBeInTheDocument();
    expect(screen.getByTestId("current-job-form")).toBeInTheDocument();
    expect(screen.getByTestId("startup-offer-form")).toBeInTheDocument();
  });

  it("renders form completion summary and example loader", () => {
    render(<EmployeeDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("form-completion-summary")).toBeInTheDocument();
    expect(screen.getByTestId("example-loader")).toBeInTheDocument();
  });

  it("renders scenario manager", () => {
    render(<EmployeeDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("scenario-manager")).toBeInTheDocument();
  });

  it("does not render scenario results when no result", () => {
    mockUseScenarioCalculation.mockReturnValue({
      hasValidData: true,
      isCalculating: false,
      result: undefined, // No result yet
      error: null,
      errorType: "generic",
      retry: vi.fn(),
    });

    render(<EmployeeDashboard />, { wrapper: createWrapper() });

    expect(screen.queryByTestId("scenario-results")).not.toBeInTheDocument();
  });

  it("renders scenario results when result is available", () => {
    mockUseScenarioCalculation.mockReturnValue({
      hasValidData: true,
      isCalculating: false,
      result: { data: { total_startup_outcome: 500000 } },
      error: null,
      errorType: "generic",
      retry: vi.fn(),
    });

    render(<EmployeeDashboard />, { wrapper: createWrapper() });

    expect(screen.getByTestId("scenario-results")).toBeInTheDocument();
  });

  it("calls useScenarioCalculation with debounced form data", () => {
    render(<EmployeeDashboard />, { wrapper: createWrapper() });

    // The hook was called with form data
    expect(mockUseScenarioCalculation).toHaveBeenCalled();
    const lastCall = mockUseScenarioCalculation.mock.calls[mockUseScenarioCalculation.mock.calls.length - 1][0];
    expect(lastCall).toHaveProperty("globalSettings");
    expect(lastCall).toHaveProperty("currentJob");
    expect(lastCall).toHaveProperty("equityDetails");
  });

  it("shows empty state when data is not valid", () => {
    mockUseAppStore.mockReturnValue({
      globalSettings: null,
      currentJob: null,
      equityDetails: null,
      setGlobalSettings: vi.fn(),
      setCurrentJob: vi.fn(),
      setEquityDetails: vi.fn(),
      monteCarloResults: null,
      setMonteCarloResults: vi.fn(),
      comparisonScenarios: [],
      setComparisonScenarios: vi.fn(),
      clearComparisonScenarios: vi.fn(),
    });

    mockUseScenarioCalculation.mockReturnValue({
      hasValidData: false,
      isCalculating: false,
      result: undefined,
      error: null,
      errorType: "generic",
      retry: vi.fn(),
    });

    render(<EmployeeDashboard />, { wrapper: createWrapper() });

    // When no valid equity data, show instruction text
    expect(screen.getByText("Complete Equity Details")).toBeInTheDocument();
  });
});
