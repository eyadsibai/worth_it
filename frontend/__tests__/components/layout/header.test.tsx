/**
 * Tests for Header component
 */
import * as React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/layout/header";

// Mock @/i18n/navigation (the locale-aware Link/usePathname the header now uses)
let mockPathname = "/";
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => mockPathname,
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
const mockSetOpen = vi.fn();
vi.mock("@/components/command-palette", () => ({
  useCommandPalette: () => ({
    open: false,
    setOpen: mockSetOpen,
  }),
}));

describe("Header", () => {
  const originalPlatform = navigator.platform;
  const originalUserAgent = navigator.userAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
  });

  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.navigator, "platform", {
      configurable: true,
      value: originalPlatform,
    });
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: originalUserAgent,
    });
  });

  describe("logo and branding", () => {
    it("renders Worth It logo", () => {
      render(<Header />);

      expect(screen.getByText("Worth It")).toBeInTheDocument();
    });

    it("logo links to home page", () => {
      render(<Header />);

      const logoLink = screen.getByRole("link", { name: /worth it/i });
      expect(logoLink).toHaveAttribute("href", "/");
    });
  });

  describe("navigation", () => {
    it("renders desktop navigation links", () => {
      render(<Header />);

      expect(screen.getByRole("link", { name: "Analysis" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    });

    it("marks current route as active with aria-current", () => {
      mockPathname = "/valuation";

      render(<Header />);

      expect(screen.getByRole("link", { name: "Valuation" })).toHaveAttribute(
        "aria-current",
        "page"
      );
      expect(screen.getByRole("link", { name: "Analysis" })).not.toHaveAttribute("aria-current");
    });
  });

  describe("search button", () => {
    it("renders mobile search button with md:hidden class", () => {
      render(<Header />);

      const mobileSearchButton = screen.getByRole("button", {
        name: /open command palette/i,
      });

      expect(mobileSearchButton).toBeInTheDocument();
      expect(mobileSearchButton).toHaveClass("md:hidden");
    });

    it("calls setOpen(true) when mobile search button clicked", async () => {
      const user = userEvent.setup();
      render(<Header />);

      const mobileSearchButton = screen.getByRole("button", {
        name: /open command palette/i,
      });

      await user.click(mobileSearchButton);

      expect(mockSetOpen).toHaveBeenCalledWith(true);
    });

    it("shows Ctrl+K hint on non-Mac platforms", () => {
      Object.defineProperty(window.navigator, "platform", {
        configurable: true,
        value: "Win32",
      });
      Object.defineProperty(window.navigator, "userAgent", {
        configurable: true,
        value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      });

      render(<Header />);

      expect(screen.getByText("Ctrl")).toBeInTheDocument();
      expect(screen.getByText("K")).toBeInTheDocument();
    });

    it("shows ⌘K hint on Mac platforms", () => {
      Object.defineProperty(window.navigator, "platform", {
        configurable: true,
        value: "MacIntel",
      });
      Object.defineProperty(window.navigator, "userAgent", {
        configurable: true,
        value: "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0)",
      });

      render(<Header />);

      expect(screen.getByText("⌘")).toBeInTheDocument();
      expect(screen.getByText("K")).toBeInTheDocument();
    });
  });
});
