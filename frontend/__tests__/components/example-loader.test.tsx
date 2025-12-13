/**
 * Tests for ExampleLoader component
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExampleLoader } from "@/components/forms/example-loader";
import { useAppStore } from "@/lib/store";
import { EXAMPLE_SCENARIOS } from "@/lib/constants/examples";

// Reset store between tests
beforeEach(() => {
  useAppStore.setState({
    globalSettings: null,
    currentJob: null,
    equityDetails: null,
  });
});

describe("ExampleLoader", () => {
  it("renders dropdown trigger button", () => {
    render(<ExampleLoader />);

    expect(screen.getByRole("button", { name: /load example/i })).toBeInTheDocument();
  });

  it("shows all example scenarios in dropdown", async () => {
    const user = userEvent.setup();
    render(<ExampleLoader />);

    await user.click(screen.getByRole("button", { name: /load example/i }));

    // All scenarios should be visible
    for (const scenario of EXAMPLE_SCENARIOS) {
      expect(screen.getByText(scenario.name)).toBeInTheDocument();
    }
  });

  it("shows description for each scenario", async () => {
    const user = userEvent.setup();
    render(<ExampleLoader />);

    await user.click(screen.getByRole("button", { name: /load example/i }));

    // All descriptions should be visible
    for (const scenario of EXAMPLE_SCENARIOS) {
      expect(screen.getByText(scenario.description)).toBeInTheDocument();
    }
  });

  it("calls loadExample when scenario is clicked", async () => {
    const user = userEvent.setup();
    render(<ExampleLoader />);

    await user.click(screen.getByRole("button", { name: /load example/i }));
    await user.click(screen.getByText("Early-stage Startup (Seed)"));

    // Verify store was updated
    const state = useAppStore.getState();
    expect(state.globalSettings).toEqual({ exit_year: 5 });
    expect(state.currentJob?.monthly_salary).toBe(12000);
  });

  it("loads different examples correctly", async () => {
    const user = userEvent.setup();
    render(<ExampleLoader />);

    // Load growth-stage example
    await user.click(screen.getByRole("button", { name: /load example/i }));
    await user.click(screen.getByText("Growth-stage (Series B)"));

    expect(useAppStore.getState().currentJob?.monthly_salary).toBe(15000);

    // Load late-stage example
    await user.click(screen.getByRole("button", { name: /load example/i }));
    await user.click(screen.getByText("Late-stage (Pre-IPO)"));

    expect(useAppStore.getState().currentJob?.monthly_salary).toBe(18000);
  });

  it("has clipboard icon on trigger button", () => {
    render(<ExampleLoader />);

    const button = screen.getByRole("button", { name: /load example/i });
    expect(button.querySelector("svg")).toBeInTheDocument();
  });
});
