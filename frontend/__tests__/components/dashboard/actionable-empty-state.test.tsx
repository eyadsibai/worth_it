/**
 * Tests for ActionableEmptyState component
 * Tests actionable buttons in the empty state card
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ActionableEmptyState } from "@/components/dashboard/actionable-empty-state";

describe("ActionableEmptyState", () => {
  const defaultProps = {
    equityType: "RSU" as const,
    onLoadExample: vi.fn(),
    onFocusMissingField: vi.fn(),
  };

  it("renders the empty state card", () => {
    render(<ActionableEmptyState {...defaultProps} />);

    expect(screen.getByText("Complete Equity Details")).toBeInTheDocument();
  });

  it("renders Load Example button", () => {
    render(<ActionableEmptyState {...defaultProps} />);

    expect(screen.getByRole("button", { name: /load example/i })).toBeInTheDocument();
  });

  it("renders Focus Missing Field button", () => {
    render(<ActionableEmptyState {...defaultProps} />);

    expect(screen.getByRole("button", { name: /focus missing field/i })).toBeInTheDocument();
  });

  it("calls onLoadExample when Load Example button is clicked", () => {
    const onLoadExample = vi.fn();
    render(<ActionableEmptyState {...defaultProps} onLoadExample={onLoadExample} />);

    fireEvent.click(screen.getByRole("button", { name: /load example/i }));

    expect(onLoadExample).toHaveBeenCalledTimes(1);
  });

  it("calls onFocusMissingField when Focus Missing Field button is clicked", () => {
    const onFocusMissingField = vi.fn();
    render(<ActionableEmptyState {...defaultProps} onFocusMissingField={onFocusMissingField} />);

    fireEvent.click(screen.getByRole("button", { name: /focus missing field/i }));

    expect(onFocusMissingField).toHaveBeenCalledTimes(1);
  });

  it("displays correct missing fields for RSU type", () => {
    render(<ActionableEmptyState {...defaultProps} equityType="RSU" />);

    expect(
      screen.getByText(/total equity grant.*exit valuation.*monthly salary/i)
    ).toBeInTheDocument();
  });

  it("displays correct missing fields for Stock Options type", () => {
    render(<ActionableEmptyState {...defaultProps} equityType="STOCK_OPTIONS" />);

    expect(
      screen.getByText(/number of options.*strike price.*exit price per share.*monthly salary/i)
    ).toBeInTheDocument();
  });

  it("renders AlertCircle icon", () => {
    render(<ActionableEmptyState {...defaultProps} />);

    // Check for the icon container (AlertCircle renders an SVG)
    const icon = document.querySelector("svg.lucide-circle-alert");
    expect(icon).toBeInTheDocument();
  });
});
