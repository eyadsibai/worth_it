/**
 * Tests for AppShell component
 * Tests the main layout wrapper with header, bottom nav, and main content area
 */
import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/layout/app-shell";

// Mock @/i18n/navigation (the locale-aware Link/usePathname the header now uses)
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/",
}));

// Mock next-intl translations (masthead namespace used by the header)
const masthead: Record<string, string> = {
  analysis: "Analysis",
  capTable: "Cap Table",
  valuation: "Valuation",
  about: "About",
  search: "Search",
  language: "Language",
  theme: "Theme",
};
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => masthead[key] ?? key,
}));

// Mock next-themes
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
  }),
}));

// Mock command palette
vi.mock("@/components/command-palette", () => ({
  useCommandPalette: () => ({
    open: false,
    setOpen: vi.fn(),
  }),
}));

const renderWithProviders = (children: React.ReactNode) => {
  return render(<AppShell>{children}</AppShell>);
};

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("accessibility", () => {
    it("renders skip link for keyboard navigation", () => {
      renderWithProviders(<div>Main content</div>);

      const skipLink = screen.getByRole("link", {
        name: /skip to main content/i,
      });
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute("href", "#main-content");
    });

    it("main element has id for skip link target", () => {
      renderWithProviders(<div>Main content</div>);

      const mainElement = screen.getByRole("main");
      expect(mainElement).toHaveAttribute("id", "main-content");
    });
  });

  describe("basic rendering", () => {
    it("renders header with logo", () => {
      renderWithProviders(<div>Main content</div>);

      expect(screen.getByText("Worth It")).toBeInTheDocument();
    });

    it("renders children in main area", () => {
      renderWithProviders(<div data-testid="main-content">Main content</div>);

      expect(screen.getByTestId("main-content")).toBeInTheDocument();
    });

    it("renders main element for content", () => {
      renderWithProviders(<div data-testid="main-content">Main content</div>);

      const mainElement = screen.getByRole("main");
      expect(mainElement).toBeInTheDocument();
      expect(mainElement).toContainElement(screen.getByTestId("main-content"));
    });

    it("renders bottom navigation for mobile", () => {
      renderWithProviders(<div>Main content</div>);

      const bottomNav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(bottomNav).toBeInTheDocument();
      expect(bottomNav).toHaveClass("md:hidden");
    });
  });

  describe("layout structure", () => {
    it("has full-width layout", () => {
      renderWithProviders(<div data-testid="main-content">Main content</div>);

      const mainElement = screen.getByRole("main");
      expect(mainElement).toHaveClass("flex-1");
    });

    it("applies noise background pattern", () => {
      const { container } = render(
        <AppShell>
          <div>Main content</div>
        </AppShell>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass("bg-noise");
    });

    it("has mobile bottom padding to prevent content overlap with bottom nav", () => {
      renderWithProviders(<div>Main content</div>);

      const mainElement = screen.getByRole("main");
      expect(mainElement).toHaveClass("pb-20");
    });
  });
});
