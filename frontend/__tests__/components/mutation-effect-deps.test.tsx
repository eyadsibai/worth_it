/**
 * Regression tests for TanStack mutation objects leaking into effect dependency arrays.
 *
 * A mutation result is re-created on every render (see `useCancellableMutation`, which
 * returns `{ ...mutation, cancel }`), so listing it as a dependency of the effect that
 * calls `mutate` makes the effect re-fire forever: mutate -> state transition -> new
 * object identity -> effect -> mutate. These tests pin the call count to the real inputs.
 */
import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DilutionPreview } from "@/components/cap-table/dilution-preview";
import { ScenarioComparison } from "@/components/scenarios/scenario-comparison";
import type { Stakeholder } from "@/lib/schemas";
import type { ScenarioData } from "@/lib/export-utils";
import * as apiClient from "@/lib/api-client";

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof apiClient>("@/lib/api-client");
  return {
    ...actual,
    useGetDilutionPreview: vi.fn(),
    useCompareScenarios: vi.fn(),
  };
});

/** Stop re-rendering past this many calls so a looping effect fails instead of hanging. */
const RUNAWAY_CALL_LIMIT = 15;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/**
 * Faithful stand-in for a TanStack mutation: a brand-new result object on every render,
 * and every `mutate` call drives a state transition that forces another render.
 */
function createMutationSpy() {
  const calls: unknown[] = [];

  function useFakeMutation() {
    const [transitions, setTransitions] = React.useState(0);

    const mutate = React.useCallback((variables: unknown) => {
      calls.push(variables);
      if (calls.length < RUNAWAY_CALL_LIMIT) {
        setTransitions((n) => n + 1);
      }
    }, []);

    return {
      mutate,
      mutateAsync: vi.fn(),
      cancel: vi.fn(),
      reset: vi.fn(),
      data: undefined,
      error: null,
      isPending: transitions > 0,
      isSuccess: false,
      isError: false,
      isIdle: transitions === 0,
      isPaused: false,
      status: transitions > 0 ? "pending" : "idle",
      variables: undefined,
      context: undefined,
      failureCount: 0,
      failureReason: null,
      submittedAt: transitions,
    };
  }

  return { useFakeMutation, calls };
}

const STAKEHOLDERS: Stakeholder[] = [
  {
    id: "founder-1",
    name: "Alice Founder",
    type: "founder",
    shares: 6_000_000,
    ownership_pct: 60,
    share_class: "common",
  },
  {
    id: "founder-2",
    name: "Bob Founder",
    type: "founder",
    shares: 4_000_000,
    ownership_pct: 40,
    share_class: "common",
  },
];

function createScenario(name: string, netOutcome: number): ScenarioData {
  return {
    name,
    timestamp: "2026-01-01T00:00:00.000Z",
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
      exitValuation: 100_000_000,
    },
    results: {
      finalPayoutValue: 500000,
      finalOpportunityCost: 200000,
      netOutcome,
    },
  };
}

const SCENARIOS: ScenarioData[] = [
  createScenario("Scenario A", 300000),
  createScenario("Scenario B", 400000),
];

afterEach(() => {
  vi.clearAllMocks();
});

describe("DilutionPreview mutation effect", () => {
  it("calls mutate exactly once for a stable set of inputs", () => {
    const { useFakeMutation, calls } = createMutationSpy();
    vi.mocked(apiClient.useGetDilutionPreview).mockImplementation(
      useFakeMutation as unknown as typeof apiClient.useGetDilutionPreview
    );

    render(
      <DilutionPreview
        stakeholders={STAKEHOLDERS}
        optionPoolPct={10}
        preMoneyValuation={8_000_000}
        amountRaised={2_000_000}
      />,
      { wrapper: createWrapper() }
    );

    expect(calls).toHaveLength(1);
  });

  it("does not re-call mutate when re-rendered with identical props", () => {
    const { useFakeMutation, calls } = createMutationSpy();
    vi.mocked(apiClient.useGetDilutionPreview).mockImplementation(
      useFakeMutation as unknown as typeof apiClient.useGetDilutionPreview
    );

    const { rerender } = render(
      <DilutionPreview
        stakeholders={STAKEHOLDERS}
        optionPoolPct={10}
        preMoneyValuation={8_000_000}
        amountRaised={2_000_000}
      />,
      { wrapper: createWrapper() }
    );

    rerender(
      <DilutionPreview
        stakeholders={STAKEHOLDERS}
        optionPoolPct={10}
        preMoneyValuation={8_000_000}
        amountRaised={2_000_000}
      />
    );

    expect(calls).toHaveLength(1);
  });

  it("calls mutate once more when a real input changes", () => {
    const { useFakeMutation, calls } = createMutationSpy();
    vi.mocked(apiClient.useGetDilutionPreview).mockImplementation(
      useFakeMutation as unknown as typeof apiClient.useGetDilutionPreview
    );

    const { rerender } = render(
      <DilutionPreview
        stakeholders={STAKEHOLDERS}
        optionPoolPct={10}
        preMoneyValuation={8_000_000}
        amountRaised={2_000_000}
      />,
      { wrapper: createWrapper() }
    );

    rerender(
      <DilutionPreview
        stakeholders={STAKEHOLDERS}
        optionPoolPct={20}
        preMoneyValuation={8_000_000}
        amountRaised={2_000_000}
      />
    );

    expect(calls).toHaveLength(2);
  });
});

describe("ScenarioComparison mutation effect", () => {
  it("calls mutate exactly once for a stable set of scenarios", () => {
    const { useFakeMutation, calls } = createMutationSpy();
    vi.mocked(apiClient.useCompareScenarios).mockImplementation(
      useFakeMutation as unknown as typeof apiClient.useCompareScenarios
    );

    render(<ScenarioComparison scenarios={SCENARIOS} />, { wrapper: createWrapper() });

    expect(calls).toHaveLength(1);
  });

  it("does not re-call mutate when re-rendered with the same scenarios", () => {
    const { useFakeMutation, calls } = createMutationSpy();
    vi.mocked(apiClient.useCompareScenarios).mockImplementation(
      useFakeMutation as unknown as typeof apiClient.useCompareScenarios
    );

    const { rerender } = render(<ScenarioComparison scenarios={SCENARIOS} />, {
      wrapper: createWrapper(),
    });

    rerender(<ScenarioComparison scenarios={SCENARIOS} />);

    expect(calls).toHaveLength(1);
  });

  it("calls mutate once more when the scenario list changes", () => {
    const { useFakeMutation, calls } = createMutationSpy();
    vi.mocked(apiClient.useCompareScenarios).mockImplementation(
      useFakeMutation as unknown as typeof apiClient.useCompareScenarios
    );

    const { rerender } = render(<ScenarioComparison scenarios={SCENARIOS} />, {
      wrapper: createWrapper(),
    });

    rerender(
      <ScenarioComparison scenarios={[...SCENARIOS, createScenario("Scenario C", 500000)]} />
    );

    expect(calls).toHaveLength(2);
  });
});
