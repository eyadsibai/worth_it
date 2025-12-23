/**
 * Tests for MonteCarloVisualizations component
 * TDD for Issue #133: Simplify Monte Carlo visualization default view
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MonteCarloVisualizations } from "@/components/charts/monte-carlo-visualizations";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock ResizeObserver for Recharts
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = ResizeObserverMock;

// Test data - 100 simulated outcomes
const mockNetOutcomes = Array.from(
  { length: 100 },
  (_, i) => -50000 + i * 3000 + Math.random() * 10000
);
const mockSimulatedValuations = Array.from(
  { length: 100 },
  () => 50000000 + Math.random() * 100000000
);

describe("MonteCarloVisualizations - Simplified View", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe("Default View (Collapsed)", () => {
    it("shows plain-English summary headline by default", () => {
      render(
        <MonteCarloVisualizations
          netOutcomes={mockNetOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      // Should show a prominent probability statement
      expect(screen.getByTestId("monte-carlo-headline")).toBeInTheDocument();
    });

    it("displays summary cards with key metrics", () => {
      render(
        <MonteCarloVisualizations
          netOutcomes={mockNetOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      // Should show expected value, success probability, and risk
      expect(screen.getByText(/expected value/i)).toBeInTheDocument();
      expect(screen.getByText(/success probability/i)).toBeInTheDocument();
    });

    it("shows histogram visualization by default", () => {
      render(
        <MonteCarloVisualizations
          netOutcomes={mockNetOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      // Should show histogram section
      expect(screen.getByText(/distribution of outcomes/i)).toBeInTheDocument();
    });

    it("shows 'See detailed analysis' button when collapsed", () => {
      render(
        <MonteCarloVisualizations
          netOutcomes={mockNetOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      expect(screen.getByRole("button", { name: /see detailed analysis/i })).toBeInTheDocument();
    });

    it("does not show all 7 tabs by default", () => {
      render(
        <MonteCarloVisualizations
          netOutcomes={mockNetOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      // Advanced tabs should not be visible by default
      expect(screen.queryByRole("tab", { name: /ecdf/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: /box plot/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: /scatter/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: /pdf/i })).not.toBeInTheDocument();
    });
  });

  describe("Expanded View", () => {
    it("shows all tabs when 'See detailed analysis' is clicked", async () => {
      const user = userEvent.setup();
      render(
        <MonteCarloVisualizations
          netOutcomes={mockNetOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      const expandButton = screen.getByRole("button", { name: /see detailed analysis/i });
      await user.click(expandButton);

      // Should now show all tabs
      expect(screen.getByRole("tab", { name: /histogram/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /ecdf/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /box plot/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /scatter/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /statistics/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /pdf/i })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /summary/i })).toBeInTheDocument();
    });

    it("changes button text to 'Hide detailed analysis' when expanded", async () => {
      const user = userEvent.setup();
      render(
        <MonteCarloVisualizations
          netOutcomes={mockNetOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      const expandButton = screen.getByRole("button", { name: /see detailed analysis/i });
      await user.click(expandButton);

      expect(screen.getByRole("button", { name: /hide detailed analysis/i })).toBeInTheDocument();
    });

    it("collapses back when button is clicked again", async () => {
      const user = userEvent.setup();
      render(
        <MonteCarloVisualizations
          netOutcomes={mockNetOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      // Expand
      await user.click(screen.getByRole("button", { name: /see detailed analysis/i }));

      // Collapse
      await user.click(screen.getByRole("button", { name: /hide detailed analysis/i }));

      // Should be back to collapsed state
      expect(screen.getByRole("button", { name: /see detailed analysis/i })).toBeInTheDocument();
      expect(screen.queryByRole("tab", { name: /ecdf/i })).not.toBeInTheDocument();
    });
  });

  describe("Preference Persistence", () => {
    it("saves expanded preference to localStorage", async () => {
      const user = userEvent.setup();
      render(
        <MonteCarloVisualizations
          netOutcomes={mockNetOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      await user.click(screen.getByRole("button", { name: /see detailed analysis/i }));

      expect(localStorageMock.setItem).toHaveBeenCalledWith("monte-carlo-expanded", "true");
    });

    it("saves collapsed preference to localStorage when toggling back", async () => {
      const user = userEvent.setup();
      render(
        <MonteCarloVisualizations
          netOutcomes={mockNetOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      // Expand first
      await user.click(screen.getByRole("button", { name: /see detailed analysis/i }));

      // Then collapse
      await user.click(screen.getByRole("button", { name: /hide detailed analysis/i }));

      expect(localStorageMock.setItem).toHaveBeenLastCalledWith("monte-carlo-expanded", "false");
    });

    it("restores expanded state from localStorage on mount", () => {
      localStorageMock.getItem.mockReturnValue("true");

      render(
        <MonteCarloVisualizations
          netOutcomes={mockNetOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      // Should be expanded based on localStorage
      expect(screen.getByRole("tab", { name: /ecdf/i })).toBeInTheDocument();
    });
  });

  describe("Plain-English Summary", () => {
    it("shows 'Strong outlook' message when success rate >= 70%", () => {
      // Create data with high positive rate (80%)
      const highPositiveOutcomes = Array.from({ length: 100 }, (_, i) =>
        i < 80 ? 50000 + Math.random() * 100000 : -10000 - Math.random() * 20000
      );

      render(
        <MonteCarloVisualizations
          netOutcomes={highPositiveOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      const headline = screen.getByTestId("monte-carlo-headline");
      expect(headline).toHaveTextContent(/strong outlook/i);
      expect(headline).toHaveTextContent(/chance.*positive/i);
    });

    it("shows 'Moderate outlook' message when success rate is 50-70%", () => {
      // Create data with moderate positive rate (~60%)
      const moderateOutcomes = Array.from({ length: 100 }, (_, i) =>
        i < 60 ? 50000 + Math.random() * 100000 : -10000 - Math.random() * 50000
      );

      render(
        <MonteCarloVisualizations
          netOutcomes={moderateOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      const headline = screen.getByTestId("monte-carlo-headline");
      expect(headline).toHaveTextContent(/moderate outlook/i);
      expect(headline).toHaveTextContent(/chance.*positive/i);
    });

    it("shows 'Caution' message when success rate < 50%", () => {
      // Create data with low positive rate (~30%)
      const lowPositiveOutcomes = Array.from({ length: 100 }, (_, i) =>
        i < 30 ? 50000 + Math.random() * 100000 : -10000 - Math.random() * 50000
      );

      render(
        <MonteCarloVisualizations
          netOutcomes={lowPositiveOutcomes}
          simulatedValuations={mockSimulatedValuations}
        />
      );

      const headline = screen.getByTestId("monte-carlo-headline");
      expect(headline).toHaveTextContent(/caution/i);
      expect(headline).toHaveTextContent(/only.*%.*chance/i);
    });
  });
});

describe("MonteCarloVisualizations - Core Functionality", () => {
  it("renders without crashing", () => {
    render(
      <MonteCarloVisualizations
        netOutcomes={mockNetOutcomes}
        simulatedValuations={mockSimulatedValuations}
      />
    );

    expect(screen.getByText(/monte carlo results/i)).toBeInTheDocument();
  });

  it("displays simulation count", () => {
    render(
      <MonteCarloVisualizations
        netOutcomes={mockNetOutcomes}
        simulatedValuations={mockSimulatedValuations}
      />
    );

    expect(screen.getByText(/100/)).toBeInTheDocument();
  });
});

describe("MonteCarloVisualizations - Edge Cases (Issue #254)", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Reset getItem mock to return null (default collapsed state)
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe("Empty Data Handling", () => {
    it("shows empty state when netOutcomes is empty", () => {
      render(
        <MonteCarloVisualizations netOutcomes={[]} simulatedValuations={mockSimulatedValuations} />
      );

      expect(screen.getByText(/no simulation results/i)).toBeInTheDocument();
      expect(screen.getByText(/run a monte carlo simulation/i)).toBeInTheDocument();
    });

    it("shows empty state when simulatedValuations is empty", () => {
      render(<MonteCarloVisualizations netOutcomes={mockNetOutcomes} simulatedValuations={[]} />);

      expect(screen.getByText(/no simulation results/i)).toBeInTheDocument();
    });

    it("shows empty state when both arrays are empty", () => {
      render(<MonteCarloVisualizations netOutcomes={[]} simulatedValuations={[]} />);

      expect(screen.getByText(/no simulation results/i)).toBeInTheDocument();
      expect(screen.getByText(/no simulation data available/i)).toBeInTheDocument();
    });

    it("does not show expand button in empty state", () => {
      render(<MonteCarloVisualizations netOutcomes={[]} simulatedValuations={[]} />);

      expect(
        screen.queryByRole("button", { name: /see detailed analysis/i })
      ).not.toBeInTheDocument();
    });
  });

  describe("Single Value Handling", () => {
    it("handles single-value dataset without crashing", () => {
      const singleValue = [50000];
      const singleValuation = [100000000];

      render(
        <MonteCarloVisualizations netOutcomes={singleValue} simulatedValuations={singleValuation} />
      );

      // Should render without NaN or Infinity errors
      expect(screen.getByText(/monte carlo results/i)).toBeInTheDocument();
      expect(screen.getByText(/1 simulation/i)).toBeInTheDocument();
    });

    it("displays correct statistics for single value", () => {
      const singleValue = [50000];
      const singleValuation = [100000000];

      render(
        <MonteCarloVisualizations netOutcomes={singleValue} simulatedValuations={singleValuation} />
      );

      // Should show 100% success rate for positive value
      expect(screen.getByText(/100\.0%/)).toBeInTheDocument();
    });

    it("handles all-identical values without division by zero", () => {
      // 100 identical values - this would cause binWidth = 0 in histogram
      const identicalValues = Array.from({ length: 100 }, () => 25000);
      const mockValuations = Array.from({ length: 100 }, () => 50000000);

      render(
        <MonteCarloVisualizations
          netOutcomes={identicalValues}
          simulatedValuations={mockValuations}
        />
      );

      // Should render histogram without NaN errors
      expect(screen.getByText(/distribution of outcomes/i)).toBeInTheDocument();
      expect(screen.getByText(/100 simulation/i)).toBeInTheDocument();
    });
  });

  describe("Boundary Cases", () => {
    it("handles two values correctly", () => {
      const twoValues = [-10000, 50000];
      const twoValuations = [50000000, 100000000];

      render(
        <MonteCarloVisualizations netOutcomes={twoValues} simulatedValuations={twoValuations} />
      );

      expect(screen.getByText(/monte carlo results/i)).toBeInTheDocument();
      expect(screen.getByText(/50\.0%/)).toBeInTheDocument(); // 1 positive out of 2
    });

    it("handles all-negative outcomes", () => {
      const allNegative = Array.from({ length: 50 }, (_, i) => -1000 - i * 100);
      const mockValuations = Array.from({ length: 50 }, () => 50000000);

      render(
        <MonteCarloVisualizations netOutcomes={allNegative} simulatedValuations={mockValuations} />
      );

      // Should show 0% success rate
      expect(screen.getByText(/0\.0%/)).toBeInTheDocument();
      // Should show caution message
      expect(screen.getByTestId("monte-carlo-headline")).toHaveTextContent(/caution/i);
    });

    it("handles all-positive outcomes", () => {
      const allPositive = Array.from({ length: 50 }, (_, i) => 1000 + i * 100);
      const mockValuations = Array.from({ length: 50 }, () => 50000000);

      render(
        <MonteCarloVisualizations netOutcomes={allPositive} simulatedValuations={mockValuations} />
      );

      // Should show 100% success rate
      expect(screen.getByText(/100\.0%/)).toBeInTheDocument();
      // Should show strong outlook message
      expect(screen.getByTestId("monte-carlo-headline")).toHaveTextContent(/strong outlook/i);
    });
  });
});
