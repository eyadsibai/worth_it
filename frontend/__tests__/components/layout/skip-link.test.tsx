/**
 * Tests for SkipLink accessibility component
 * TDD: Tests written first
 */
import * as React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { SkipLink } from "@/components/layout/skip-link";
import en from "@/messages/en.json";

function wrap(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>
  );
}

describe("SkipLink", () => {
  it("renders a translated link to skip to main content", () => {
    wrap(<SkipLink />);

    const link = screen.getByRole("link", { name: en.a11y.skipToMainContent });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("is visually hidden by default", () => {
    wrap(<SkipLink />);

    const link = screen.getByRole("link", { name: en.a11y.skipToMainContent });
    // Check for sr-only class or equivalent
    expect(link).toHaveClass("sr-only");
  });

  it("becomes visible when focused", async () => {
    const user = userEvent.setup();
    wrap(<SkipLink />);

    const link = screen.getByRole("link", { name: en.a11y.skipToMainContent });

    // Tab to focus the link
    await user.tab();

    // Should have focus:not-sr-only class applied
    expect(link).toHaveFocus();
    expect(link).toHaveClass("focus:not-sr-only");
  });

  it("accepts custom target via props", () => {
    wrap(<SkipLink targetId="custom-section" />);

    const link = screen.getByRole("link", { name: en.a11y.skipToMainContent });
    expect(link).toHaveAttribute("href", "#custom-section");
  });

  it("accepts custom label via props", () => {
    wrap(<SkipLink label="Skip to results" targetId="results" />);

    const link = screen.getByRole("link", { name: /skip to results/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "#results");
  });
});
