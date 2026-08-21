"use client";

import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import CapTablePage from "@/app/[locale]/cap-table/page";
import en from "@/messages/en.json";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    locale: _locale,
    ...props
  }: React.ComponentProps<"a"> & { locale?: string }) => (
    <a href={typeof href === "string" ? href : String(href)} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/cap-table",
}));

// Mock IntersectionObserver for framer-motion (FounderDashboard uses `motion`)
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock framer-motion to avoid animation issues in tests — same mock the
// existing founder-dashboard test uses.
vi.mock("@/lib/motion", () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
    p: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <p {...props}>{children}</p>
    ),
  },
  AnimatedPercentage: ({ value }: { value: number }) => <span>{value}%</span>,
}));

// Mock FounderDashboard's heavy children — same convention as
// __tests__/components/dashboard/founder-dashboard.test.tsx.
vi.mock("@/components/cap-table", () => ({
  CapTableManager: ({ hideSidebarContent }: { hideSidebarContent?: boolean }) => (
    <div data-testid="cap-table-manager" data-hide-sidebar={hideSidebarContent}>
      Cap Table Manager
    </div>
  ),
}));

vi.mock("@/components/cap-table/stakeholder-form", () => ({
  StakeholderForm: () => <div data-testid="stakeholder-form">Stakeholder Form</div>,
}));

vi.mock("@/components/templates/template-picker", () => ({
  TemplatePicker: () => <div data-testid="template-picker">Template Picker</div>,
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <NextIntlClientProvider locale="en" messages={en}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </NextIntlClientProvider>
    );
  };
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("Cap table page", () => {
  it("renders FounderDashboard's top-level heading under the Masthead", () => {
    render(<CapTablePage />, { wrapper: createWrapper() });

    // "Add Stakeholder" is FounderDashboard's own top-level CardTitle (its
    // heavy children — CapTableManager, StakeholderForm, TemplatePicker —
    // are mocked above), proving the page composes Masthead + FounderDashboard
    // rather than just re-rendering the Masthead nav link of the same name.
    expect(screen.getByText("Add Stakeholder")).toBeInTheDocument();
  });

  it("renders the Masthead's Cap Table nav link as the active page", () => {
    render(<CapTablePage />, { wrapper: createWrapper() });

    const capTableLink = screen.getByRole("link", { name: en.masthead.capTable });
    expect(capTableLink).toHaveAttribute("aria-current", "page");
  });
});
