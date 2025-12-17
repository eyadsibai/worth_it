/**
 * Tests for SkipLink accessibility component
 * TDD: Tests written first
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SkipLink } from "@/components/layout/skip-link";

describe("SkipLink", () => {
  it("renders a link to skip to main content", () => {
    render(<SkipLink />);

    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("is visually hidden by default", () => {
    render(<SkipLink />);

    const link = screen.getByRole("link", { name: /skip to main content/i });
    // Check for sr-only class or equivalent
    expect(link).toHaveClass("sr-only");
  });

  it("becomes visible when focused", async () => {
    const user = userEvent.setup();
    render(<SkipLink />);

    const link = screen.getByRole("link", { name: /skip to main content/i });

    // Tab to focus the link
    await user.tab();

    // Should have focus:not-sr-only class applied
    expect(link).toHaveFocus();
    expect(link).toHaveClass("focus:not-sr-only");
  });

  it("accepts custom target via props", () => {
    render(<SkipLink targetId="custom-section" />);

    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toHaveAttribute("href", "#custom-section");
  });

  it("accepts custom label via props", () => {
    render(<SkipLink label="Skip to results" targetId="results" />);

    const link = screen.getByRole("link", { name: /skip to results/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#results");
  });
});
