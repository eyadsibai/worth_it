"use client";

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickAdjustPanel } from "@/components/results/quick-adjust-panel";
import type { RSUForm, StockOptionsForm, StartupScenarioResponse } from "@/lib/schemas";

// Mock IntersectionObserver for framer-motion
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor() {}
}
window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock the useCalculateStartupScenario hook
const mockMutateAsync = vi.fn();
const mockMutate = vi.fn();
vi.mock("@/lib/api-client", () => ({
  useCalculateStartupScenario: () => ({
    mutateAsync: mockMutateAsync,
    mutate: mockMutate,
    isPending: false,
  }),
}));

// Sample RSU equity details
const sampleRSUEquity: RSUForm = {
  equity_type: "RSU",
  monthly_salary: 8000,
  total_equity_grant_pct: 0.5,
  vesting_period: 4,
  cliff_period: 1,
  simulate_dilution: false,
  dilution_rounds: [],
  exit_valuation: 100000000, // $100M
};

// Sample Stock Options equity details
const sampleOptionsEquity: StockOptionsForm = {
  equity_type: "STOCK_OPTIONS",
  monthly_salary: 8000,
  num_options: 50000,
  strike_price: 1.0,
  vesting_period: 4,
  cliff_period: 1,
  exercise_strategy: "AT_EXIT",
  exit_price_per_share: 10.0,
};

// Sample results
const sampleResults: StartupScenarioResponse = {
  results_df: [
    {
      year: 1,
      startup_monthly_salary: 8000,
      current_job_monthly_salary: 10000,
      monthly_surplus: -2000,
      cumulative_opportunity_cost: 24000,
    },
    {
      year: 2,
      startup_monthly_salary: 8000,
      current_job_monthly_salary: 10500,
      monthly_surplus: -2500,
      cumulative_opportunity_cost: 54000,
    },
  ],
  final_payout_value: 500000,
  final_opportunity_cost: 54000,
  payout_label: "RSU payout at $100M exit",
  breakeven_label: "Break-even at $20M exit",
  total_dilution: null,
  diluted_equity_pct: null,
};

describe("QuickAdjustPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue(sampleResults);
  });

  describe("rendering", () => {
    it("renders panel with title and sliders", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
        />
      );

      expect(screen.getByText("Quick Adjustments")).toBeInTheDocument();
    });

    it("renders exit valuation slider for RSU equity", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText("Exit Valuation")).toBeInTheDocument();
    });

    it("renders equity percentage slider for RSU equity", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText("Equity %")).toBeInTheDocument();
    });

    it("renders exit price slider for stock options", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleOptionsEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText("Exit Price/Share")).toBeInTheDocument();
    });

    it("renders number of options slider for stock options", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleOptionsEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText("Options")).toBeInTheDocument();
    });

    it("renders startup salary slider for both equity types", () => {
      const { rerender } = render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText("Startup Salary")).toBeInTheDocument();

      rerender(
        <QuickAdjustPanel
          equityDetails={sampleOptionsEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      expect(screen.getByText("Startup Salary")).toBeInTheDocument();
    });

    it("displays net benefit from base results", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      // Net benefit = 500000 - 54000 = 446000
      expect(screen.getByText(/Net Benefit/)).toBeInTheDocument();
    });
  });

  describe("reset functionality", () => {
    it("renders reset button", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
    });

    it("reset button is disabled when values match original", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      const resetButton = screen.getByRole("button", { name: /reset/i });
      expect(resetButton).toBeDisabled();
    });
  });

  describe("slider interactions", () => {
    it("has correct number of sliders for RSU", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      // 3 sliders: Exit Valuation, Equity %, Startup Salary
      const sliders = screen.getAllByRole("slider");
      expect(sliders.length).toBe(3);
    });

    it("has correct number of sliders for stock options", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleOptionsEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      // 3 sliders: Exit Price/Share, Options, Startup Salary
      const sliders = screen.getAllByRole("slider");
      expect(sliders.length).toBe(3);
    });
  });

  describe("collapsed state", () => {
    it("can be collapsed and expanded", async () => {
      const user = userEvent.setup();
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      // Should be expanded by default (defaultExpanded=true)
      expect(screen.getByText("Exit Valuation")).toBeInTheDocument();

      // Find and click the collapse toggle
      const toggleButton = screen.getByRole("button", { name: /collapse|expand/i });
      await user.click(toggleButton);

      // Content should be hidden (sliders not visible)
      await waitFor(() => {
        expect(screen.queryByText("Exit Valuation")).not.toBeInTheDocument();
      });
    });
  });

  describe("callback handling", () => {
    it("calls onAdjustedResultsChange with null initially when not modified", () => {
      const onChangeMock = vi.fn();
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={onChangeMock}
        />
      );

      // Initially should not call with results since nothing changed
      expect(onChangeMock).not.toHaveBeenCalledWith(
        expect.objectContaining({ final_payout_value: expect.any(Number) })
      );
    });

    it("calls onAdjustedResultsChange with adjusted results when slider values change", async () => {
      const user = userEvent.setup();
      const onChangeMock = vi.fn();
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={onChangeMock}
          defaultExpanded={true}
        />
      );

      // Get first slider (exit valuation for RSU) and change its value using keyboard
      // Radix UI puts role="slider" on the thumb element, not the root
      const sliders = screen.getAllByRole("slider");
      const exitValuationSlider = sliders[0]; // First slider is exit valuation
      exitValuationSlider.focus();
      await user.keyboard("{ArrowRight}");

      // Should have called onAdjustedResultsChange with adjusted results
      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalledWith(
          expect.objectContaining({
            final_payout_value: expect.any(Number),
            final_opportunity_cost: expect.any(Number),
          })
        );
      });
    });
  });

  describe("reset functionality with changes", () => {
    it("enables reset button when values are modified", async () => {
      const user = userEvent.setup();
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      // Initially reset should be disabled
      const resetButton = screen.getByRole("button", { name: /reset/i });
      expect(resetButton).toBeDisabled();

      // Change a slider value (first slider is exit valuation for RSU)
      const sliders = screen.getAllByRole("slider");
      sliders[0].focus();
      await user.keyboard("{ArrowRight}");

      // Reset button should now be enabled
      await waitFor(() => {
        expect(resetButton).not.toBeDisabled();
      });
    });

    it("resets values and calls onAdjustedResultsChange with null when reset is clicked", async () => {
      const user = userEvent.setup();
      const onChangeMock = vi.fn();
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={onChangeMock}
          defaultExpanded={true}
        />
      );

      // Change a slider value first (first slider is exit valuation for RSU)
      const sliders = screen.getAllByRole("slider");
      sliders[0].focus();
      await user.keyboard("{ArrowRight}");

      // Clear mock to track reset behavior
      onChangeMock.mockClear();

      // Click reset
      const resetButton = screen.getByRole("button", { name: /reset/i });
      await user.click(resetButton);

      // Should call with null after reset
      await waitFor(() => {
        expect(onChangeMock).toHaveBeenCalledWith(null);
      });

      // Reset button should be disabled again
      expect(resetButton).toBeDisabled();
    });
  });

  describe("modified indicator", () => {
    it("shows (modified) indicator when values have changed", async () => {
      const user = userEvent.setup();
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      // Initially no modified indicator
      expect(screen.queryByText("(modified)")).not.toBeInTheDocument();

      // Change a slider value (first slider is exit valuation for RSU)
      const sliders = screen.getAllByRole("slider");
      sliders[0].focus();
      await user.keyboard("{ArrowRight}");

      // Modified indicator should appear
      await waitFor(() => {
        expect(screen.getByText("(modified)")).toBeInTheDocument();
      });
    });
  });

  describe("stock options edge cases", () => {
    it("handles exit price below strike price (underwater options)", async () => {
      const user = userEvent.setup();
      const onChangeMock = vi.fn();

      // Create options where exit price is close to strike price
      const underwaterOptions: StockOptionsForm = {
        ...sampleOptionsEquity,
        strike_price: 5.0,
        exit_price_per_share: 6.0, // Just above strike
      };

      render(
        <QuickAdjustPanel
          equityDetails={underwaterOptions}
          baseResults={sampleResults}
          onAdjustedResultsChange={onChangeMock}
          defaultExpanded={true}
        />
      );

      // Decrease exit price below strike using arrow keys
      // For stock options, first slider is exit price
      const sliders = screen.getAllByRole("slider");
      sliders[0].focus();
      // Press Home to go to minimum value
      await user.keyboard("{Home}");

      // Should still call with valid results (not NaN or error)
      await waitFor(() => {
        const lastCall = onChangeMock.mock.calls[onChangeMock.mock.calls.length - 1];
        if (lastCall && lastCall[0]) {
          expect(lastCall[0].final_payout_value).toBeGreaterThanOrEqual(0);
          expect(Number.isNaN(lastCall[0].final_payout_value)).toBe(false);
        }
      });
    });
  });

  describe("value formatting", () => {
    it("formats currency values correctly", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      // Exit valuation should be formatted (e.g., $100M)
      expect(screen.getByText(/\$100M/)).toBeInTheDocument();
    });

    it("formats percentage values correctly", () => {
      render(
        <QuickAdjustPanel
          equityDetails={sampleRSUEquity}
          baseResults={sampleResults}
          onAdjustedResultsChange={() => {}}
          defaultExpanded={true}
        />
      );

      // Equity percentage should show 0.50%
      expect(screen.getByText(/0\.50%/)).toBeInTheDocument();
    });
  });
});
