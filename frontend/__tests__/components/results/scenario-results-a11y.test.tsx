/**
 * Accessibility tests for ScenarioResults component
 * Tests that calculation results are announced to screen readers
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen } from "@testing-library/react";
import { ScenarioResults } from "@/components/results/scenario-results";
import type { StartupScenarioResponse } from "@/lib/schemas";

// Mock IntersectionObserver for Framer Motion
beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    observe = vi.fn();
    disconnect = vi.fn();
    unobserve = vi.fn();
    constructor(callback: IntersectionObserverCallback) {
      // Immediately call with empty entries
      setTimeout(() => callback([], this as IntersectionObserver), 0);
    }
    root = null;
    rootMargin = "";
    thresholds = [];
    takeRecords = () => [];
  };
});

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: { children: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
    span: ({ children, ...props }: { children: React.ReactNode }) => (
      <span {...props}>{children}</span>
    ),
  },
  useReducedMotion: () => false,
  useInView: () => true,
  useMotionValue: (initial: number) => ({
    get: () => initial,
    set: vi.fn(),
    on: vi.fn(() => vi.fn()),
  }),
  useSpring: (value: { get: () => number }) => ({
    get: () => value.get(),
    set: vi.fn(),
    on: vi.fn(() => vi.fn()),
  }),
  useTransform: (value: { get: () => number }, transform: (v: number) => string) => ({
    get: () => transform(value.get()),
    on: vi.fn(() => vi.fn()),
  }),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock recharts (causes issues in test environment)
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  LineChart: () => <div data-testid="line-chart" />,
  AreaChart: () => <div data-testid="area-chart" />,
  Line: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null,
  ReferenceLine: () => null,
}));

const mockResults: StartupScenarioResponse = {
  final_payout_value: 500000,
  final_opportunity_cost: 200000,
  payout_label: "Total equity value",
  breakeven_label: "Break-even at Year 3",
  total_dilution: 0.15,
  diluted_equity_pct: 0.85,
  results_df: [
    {
      year: 1,
      startup_monthly_salary: 10000,
      current_job_monthly_salary: 12000,
      monthly_surplus: -2000,
      cumulative_opportunity_cost: 24000,
      breakeven_value: 50000,
    },
  ],
};

describe("ScenarioResults accessibility", () => {
  it("announces calculation results to screen readers via LiveRegion", () => {
    render(<ScenarioResults results={mockResults} />);

    // Should have a status region for screen reader announcements
    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toBeInTheDocument();

    // Should announce the net benefit result
    expect(statusRegion).toHaveTextContent(/net benefit/i);
    expect(statusRegion).toHaveTextContent(/worth it/i);
  });

  it("announces positive results as worth it", () => {
    render(<ScenarioResults results={mockResults} />);

    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toHaveTextContent(/worth it/i);
  });

  it("announces negative results as not worth it", () => {
    const negativeResults: StartupScenarioResponse = {
      ...mockResults,
      final_payout_value: 100000,
      final_opportunity_cost: 200000,
    };

    render(<ScenarioResults results={negativeResults} />);

    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toHaveTextContent(/not worth it/i);
  });
});
