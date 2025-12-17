/**
 * Tests for Employee mode ScenarioComparison component
 * Following TDD for Issue #143 enhancements
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ScenarioComparison } from "@/components/scenarios/scenario-comparison";
import type { ScenarioData } from "@/lib/export-utils";
import * as apiClient from "@/lib/api-client";

// Mock the API client
vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof apiClient>("@/lib/api-client");
  return {
    ...actual,
    useCompareScenarios: vi.fn(),
  };
});

// Create a wrapper with QueryClient for each test
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

// Mock comparison response
const mockComparisonResponse = {
  winner: {
    winner_name: "High Value",
    net_outcome_advantage: 300000,
    is_tie: false,
  },
  metric_diffs: [
    {
      metric: "netOutcome",
      values: [100000, 400000],
      scenario_names: ["Low Value", "High Value"],
      diff: 300000,
      percentage_diff: 300,
      better_scenario: "High Value",
    },
    {
      metric: "finalPayoutValue",
      values: [200000, 600000],
      scenario_names: ["Low Value", "High Value"],
      diff: 400000,
      percentage_diff: 200,
      better_scenario: "High Value",
    },
    {
      metric: "finalOpportunityCost",
      values: [100000, 200000],
      scenario_names: ["Low Value", "High Value"],
      diff: 100000,
      percentage_diff: 100,
      better_scenario: "Low Value",
    },
  ],
  insights: [
    {
      type: "winner",
      title: "High Value is the best choice",
      description: "Net outcome is $300,000 more than other options (+300%)",
      icon: "trophy",
    },
  ],
};

// Test data factory
function createScenario(overrides: Partial<ScenarioData> = {}): ScenarioData {
  return {
    name: "Test Scenario",
    timestamp: new Date().toISOString(),
    globalSettings: { exitYear: 5 },
    currentJob: {
      monthlySalary: 15000,
      annualGrowthRate: 5,
      assumedROI: 8,
      investmentFrequency: "Monthly",
    },
    equity: {
      type: "RSU",
      monthlySalary: 12000,
      vestingPeriod: 4,
      cliffPeriod: 1,
      equityPct: 0.5,
      exitValuation: 100000000,
    },
    results: {
      finalPayoutValue: 500000,
      finalOpportunityCost: 200000,
      netOutcome: 300000,
    },
    ...overrides,
  };
}

// Setup mock before each test
function setupMock(response = mockComparisonResponse, isPending = false) {
  const mutate = vi.fn();
  vi.mocked(apiClient.useCompareScenarios).mockReturnValue({
    mutate,
    data: isPending ? undefined : response,
    isPending,
    isSuccess: !isPending,
    isError: false,
    error: null,
    isIdle: false,
    status: isPending ? "pending" : "success",
    variables: undefined,
    context: undefined,
    failureCount: 0,
    failureReason: null,
    submittedAt: 0,
    mutateAsync: vi.fn(),
    reset: vi.fn(),
    isPaused: false,
  } as unknown as ReturnType<typeof apiClient.useCompareScenarios>);
  return mutate;
}

describe("ScenarioComparison - Basic", () => {
  beforeEach(() => {
    setupMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders scenario names as headers", () => {
    const scenarios = [
      createScenario({ name: "Scenario A" }),
      createScenario({ name: "Scenario B" }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />, { wrapper: createWrapper() });

    expect(screen.getByText("Scenario A")).toBeInTheDocument();
    expect(screen.getByText("Scenario B")).toBeInTheDocument();
  });

  it("returns null when no scenarios provided", () => {
    const { container } = render(<ScenarioComparison scenarios={[]} />, { wrapper: createWrapper() });
    expect(container.firstChild).toBeNull();
  });

  it("shows close button when onClose provided", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();

    render(
      <ScenarioComparison scenarios={[createScenario()]} onClose={onClose} />,
      { wrapper: createWrapper() }
    );

    // Find the close button by looking for buttons with X icon (SVG with lucide-x class)
    const buttons = screen.getAllByRole("button");
    const closeButton = buttons.find(btn =>
      btn.querySelector("svg.lucide-x") || btn.querySelector("[class*='lucide-x']")
    );

    // If no lucide-x found, use the last small icon button
    const iconButton = closeButton || buttons[buttons.length - 1];

    if (iconButton) {
      await user.click(iconButton);
      expect(onClose).toHaveBeenCalled();
    }
  });
});

describe("ScenarioComparison - Winner Badge", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("displays winner badge for scenario with highest net outcome", () => {
    setupMock({
      ...mockComparisonResponse,
      winner: {
        winner_name: "High Value",
        net_outcome_advantage: 300000,
        is_tie: false,
      },
      insights: [], // Clear insights to avoid duplicate text
    });

    const scenarios = [
      createScenario({
        name: "Low Value",
        results: { finalPayoutValue: 200000, finalOpportunityCost: 100000, netOutcome: 100000 },
      }),
      createScenario({
        name: "High Value",
        results: { finalPayoutValue: 600000, finalOpportunityCost: 200000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />, { wrapper: createWrapper() });

    // Winner badge should appear for "High Value" scenario
    expect(screen.getByText(/Best Choice/)).toBeInTheDocument();
  });

  it("shows trophy icon for winner", () => {
    setupMock({
      ...mockComparisonResponse,
      winner: {
        winner_name: "B",
        net_outcome_advantage: 350000,
        is_tie: false,
      },
      insights: [], // Clear to avoid duplicate elements
    });

    const scenarios = [
      createScenario({
        name: "A",
        results: { finalPayoutValue: 100000, finalOpportunityCost: 50000, netOutcome: 50000 },
      }),
      createScenario({
        name: "B",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 100000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />, { wrapper: createWrapper() });

    // Should have a trophy icon (test by data-testid)
    expect(screen.getByTestId("trophy-icon")).toBeInTheDocument();
  });

  it("does not show winner badge when scenarios are tied", () => {
    setupMock({
      winner: {
        winner_name: "A",
        net_outcome_advantage: 0,
        is_tie: true,
      },
      metric_diffs: [],
      insights: [], // No winner insights for tie
    });

    const scenarios = [
      createScenario({
        name: "A",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 200000, netOutcome: 300000 },
      }),
      createScenario({
        name: "B",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 200000, netOutcome: 300000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />, { wrapper: createWrapper() });

    expect(screen.queryByText(/Best Choice/)).not.toBeInTheDocument();
  });
});

describe("ScenarioComparison - Visual Diff", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows percentage difference for net outcome", () => {
    setupMock({
      ...mockComparisonResponse,
      winner: {
        winner_name: "Better",
        net_outcome_advantage: 100000,
        is_tie: false,
      },
      metric_diffs: [
        {
          metric: "netOutcome",
          values: [200000, 300000],
          scenario_names: ["Baseline", "Better"],
          diff: 100000,
          percentage_diff: 50,
          better_scenario: "Better",
        },
      ],
    });

    const scenarios = [
      createScenario({
        name: "Baseline",
        results: { finalPayoutValue: 400000, finalOpportunityCost: 200000, netOutcome: 200000 },
      }),
      createScenario({
        name: "Better",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 200000, netOutcome: 300000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />, { wrapper: createWrapper() });

    // Should show +50% difference
    const percentageElements = screen.getAllByText(/\+50%/);
    expect(percentageElements.length).toBeGreaterThan(0);
  });

  it("shows up arrow for better values", () => {
    setupMock({
      ...mockComparisonResponse,
      winner: {
        winner_name: "Better",
        net_outcome_advantage: 300000,
        is_tie: false,
      },
    });

    const scenarios = [
      createScenario({
        name: "Baseline",
        results: { finalPayoutValue: 300000, finalOpportunityCost: 200000, netOutcome: 100000 },
      }),
      createScenario({
        name: "Better",
        results: { finalPayoutValue: 600000, finalOpportunityCost: 200000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />, { wrapper: createWrapper() });

    // Should show up trending icon for better scenario
    expect(screen.getAllByTestId("trend-up").length).toBeGreaterThan(0);
  });

  it("uses green color for better metrics", () => {
    setupMock({
      ...mockComparisonResponse,
      winner: {
        winner_name: "B",
        net_outcome_advantage: 300000,
        is_tie: false,
      },
    });

    const scenarios = [
      createScenario({
        name: "A",
        results: { finalPayoutValue: 200000, finalOpportunityCost: 100000, netOutcome: 100000 },
      }),
      createScenario({
        name: "B",
        results: { finalPayoutValue: 500000, finalOpportunityCost: 100000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />, { wrapper: createWrapper() });

    // The better value should have green styling
    const betterValue = screen.getByTestId("best-net-outcome");
    expect(betterValue).toHaveClass("text-terminal");
  });
});

describe("ScenarioComparison - Insights", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("displays comparison insights section", () => {
    setupMock({
      ...mockComparisonResponse,
      insights: [
        {
          type: "winner",
          title: "High Risk is the best choice",
          description: "Net outcome is $200,000 more",
          icon: "trophy",
        },
      ],
    });

    const scenarios = [
      createScenario({
        name: "Low Risk",
        results: { finalPayoutValue: 300000, finalOpportunityCost: 100000, netOutcome: 200000 },
      }),
      createScenario({
        name: "High Risk",
        results: { finalPayoutValue: 600000, finalOpportunityCost: 200000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />, { wrapper: createWrapper() });

    expect(screen.getByText(/insights/i)).toBeInTheDocument();
  });

  it("shows winner insight with advantage amount", () => {
    setupMock({
      ...mockComparisonResponse,
      winner: {
        winner_name: "Option B",
        net_outcome_advantage: 200000,
        is_tie: false,
      },
    });

    const scenarios = [
      createScenario({
        name: "Option A",
        results: { finalPayoutValue: 300000, finalOpportunityCost: 100000, netOutcome: 200000 },
      }),
      createScenario({
        name: "Option B",
        results: { finalPayoutValue: 600000, finalOpportunityCost: 200000, netOutcome: 400000 },
      }),
    ];

    render(<ScenarioComparison scenarios={scenarios} />, { wrapper: createWrapper() });

    // Should mention the advantage amount (200,000 difference) in the winner badge or insights
    const advantageElements = screen.getAllByText(/\$200,000/);
    expect(advantageElements.length).toBeGreaterThan(0);
  });
});
