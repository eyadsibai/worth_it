/**
 * Tests for LiveRegion accessibility component
 * TDD: Tests written first
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LiveRegion } from "@/components/ui/live-region";

describe("LiveRegion", () => {
  it("renders with role='status' by default (polite)", () => {
    render(<LiveRegion>Calculation complete</LiveRegion>);

    const region = screen.getByRole("status");
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-live", "polite");
  });

  it("can render as assertive for urgent announcements", () => {
    render(<LiveRegion assertive>Error occurred!</LiveRegion>);

    const region = screen.getByRole("alert");
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("aria-live", "assertive");
  });

  it("is visually hidden but accessible to screen readers", () => {
    render(<LiveRegion>Hidden announcement</LiveRegion>);

    const region = screen.getByRole("status");
    expect(region).toHaveClass("sr-only");
  });

  it("can be visible when visuallyHidden is false", () => {
    render(<LiveRegion visuallyHidden={false}>Visible status</LiveRegion>);

    const region = screen.getByRole("status");
    expect(region).not.toHaveClass("sr-only");
    expect(screen.getByText("Visible status")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(<LiveRegion>Net benefit: SAR 245,000</LiveRegion>);

    expect(screen.getByText("Net benefit: SAR 245,000")).toBeInTheDocument();
  });

  it("updates content when children change", () => {
    const { rerender } = render(<LiveRegion>Loading...</LiveRegion>);

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    rerender(<LiveRegion>Complete!</LiveRegion>);

    expect(screen.getByText("Complete!")).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});
