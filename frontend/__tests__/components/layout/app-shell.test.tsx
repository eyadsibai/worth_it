/**
 * Tests for AppShell component
 * Tests the main layout wrapper with header and main content area
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppShell } from "@/components/layout/app-shell";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
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

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("renders header with logo", () => {
      render(
        <AppShell>
          <div>Main content</div>
        </AppShell>
      );

      expect(screen.getByText("Worth It")).toBeInTheDocument();
    });

    it("renders children in main area", () => {
      render(
        <AppShell>
          <div data-testid="main-content">Main content</div>
        </AppShell>
      );

      expect(screen.getByTestId("main-content")).toBeInTheDocument();
    });

    it("renders main element for content", () => {
      render(
        <AppShell>
          <div data-testid="main-content">Main content</div>
        </AppShell>
      );

      const mainElement = screen.getByRole("main");
      expect(mainElement).toBeInTheDocument();
      expect(mainElement).toContainElement(screen.getByTestId("main-content"));
    });
  });

  describe("layout structure", () => {
    it("has full-width layout", () => {
      render(
        <AppShell>
          <div data-testid="main-content">Main content</div>
        </AppShell>
      );

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
  });
});
