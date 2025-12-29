/**
 * Tests for BenchmarkWarning component
 * Following TDD - tests written first
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BenchmarkWarning } from "@/components/valuation/benchmark-warning";

describe("BenchmarkWarning", () => {
  it("returns null when severity is ok", () => {
    const { container } = render(
      <BenchmarkWarning severity="ok" message="Value is within range" />
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders warning message with warning severity", () => {
    render(<BenchmarkWarning severity="warning" message="Value is above typical range" />);

    expect(screen.getByText("Value is above typical range")).toBeInTheDocument();
  });

  it("renders error message with error severity", () => {
    render(<BenchmarkWarning severity="error" message="Value exceeds maximum" />);

    expect(screen.getByText("Value exceeds maximum")).toBeInTheDocument();
  });

  it("shows industry median when provided", () => {
    render(<BenchmarkWarning severity="warning" message="Value is high" median={6.0} unit="x" />);

    expect(screen.getByText("Industry median: 6x")).toBeInTheDocument();
  });

  it("shows suggested range when provided", () => {
    render(
      <BenchmarkWarning
        severity="warning"
        message="Value is high"
        suggestedRange={[4, 12]}
        unit="x"
      />
    );

    expect(screen.getByText("Typical range: 4x - 12x")).toBeInTheDocument();
  });

  it("shows both median and range when both provided", () => {
    render(
      <BenchmarkWarning
        severity="warning"
        message="Value is high"
        median={6.0}
        suggestedRange={[4, 12]}
        unit="x"
      />
    );

    expect(screen.getByText("Industry median: 6x")).toBeInTheDocument();
    expect(screen.getByText("Typical range: 4x - 12x")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    render(
      <BenchmarkWarning severity="warning" message="Test" className="mt-4" data-testid="warning" />
    );

    expect(screen.getByTestId("warning")).toHaveClass("mt-4");
  });

  it("applies warning color classes for warning severity", () => {
    render(<BenchmarkWarning severity="warning" message="Warning message" data-testid="warning" />);

    const element = screen.getByTestId("warning");
    expect(element).toHaveClass("text-amber-600");
  });

  it("applies error color classes for error severity", () => {
    render(<BenchmarkWarning severity="error" message="Error message" data-testid="warning" />);

    const element = screen.getByTestId("warning");
    expect(element).toHaveClass("text-destructive");
  });

  it("does not show median when it is 0", () => {
    render(<BenchmarkWarning severity="warning" message="Warning" median={0} unit="x" />);

    expect(screen.queryByText(/Industry median/)).not.toBeInTheDocument();
  });

  it("handles percentage formatting in unit", () => {
    render(
      <BenchmarkWarning
        severity="warning"
        message="Discount rate is high"
        median={25}
        suggestedRange={[18, 35]}
        unit="%"
      />
    );

    expect(screen.getByText("Industry median: 25%")).toBeInTheDocument();
    expect(screen.getByText("Typical range: 18% - 35%")).toBeInTheDocument();
  });
});
