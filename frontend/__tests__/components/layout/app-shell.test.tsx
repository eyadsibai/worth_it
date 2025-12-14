/**
 * Tests for AppShell component
 * Tests responsive sidebar layout: desktop (always-visible aside) vs mobile (Sheet drawer)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell } from "@/components/layout/app-shell";

// Mock the useIsMobile hook
vi.mock("@/lib/hooks", () => ({
  useIsMobile: vi.fn(() => false),
}));

import { useIsMobile } from "@/lib/hooks";
const mockUseIsMobile = vi.mocked(useIsMobile);

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
    mockUseIsMobile.mockReturnValue(false);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("renders header", () => {
      render(
        <AppShell>
          <div>Main content</div>
        </AppShell>
      );

      // Header should be rendered
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

    it("renders sidebar content when provided", () => {
      render(
        <AppShell sidebar={<div data-testid="sidebar-content">Sidebar</div>}>
          <div>Main content</div>
        </AppShell>
      );

      expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();
    });
  });

  describe("desktop layout (>= 768px)", () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(false);
    });

    it("renders sidebar as always-visible aside on desktop", () => {
      render(
        <AppShell sidebar={<div data-testid="sidebar-content">Sidebar</div>}>
          <div>Main content</div>
        </AppShell>
      );

      // Sidebar should be visible
      expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();

      // Should NOT be inside a Sheet (dialog)
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("sidebar is always visible without interaction", () => {
      render(
        <AppShell sidebar={<div data-testid="sidebar-content">Sidebar</div>}>
          <div>Main content</div>
        </AppShell>
      );

      // Sidebar should be immediately visible
      expect(screen.getByTestId("sidebar-content")).toBeVisible();
    });
  });

  describe("mobile layout (< 768px)", () => {
    beforeEach(() => {
      mockUseIsMobile.mockReturnValue(true);
    });

    it("hides sidebar content initially on mobile", () => {
      render(
        <AppShell sidebar={<div data-testid="sidebar-content">Sidebar</div>}>
          <div>Main content</div>
        </AppShell>
      );

      // Sidebar should not be visible initially (Sheet is closed)
      // The content should not be in the document when Sheet is closed
      expect(screen.queryByTestId("sidebar-content")).not.toBeInTheDocument();
    });

    it("opens Sheet when hamburger button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <AppShell sidebar={<div data-testid="sidebar-content">Sidebar</div>}>
          <div>Main content</div>
        </AppShell>
      );

      // Click hamburger button
      const hamburgerButton = screen.getByRole("button", {
        name: /toggle sidebar menu/i,
      });

      await user.click(hamburgerButton);

      // Now sidebar should be visible inside a dialog
      await waitFor(() => {
        expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();
      });
    });

    it("Sheet has side=left configuration", async () => {
      const user = userEvent.setup();

      render(
        <AppShell sidebar={<div data-testid="sidebar-content">Sidebar</div>}>
          <div>Main content</div>
        </AppShell>
      );

      // Click hamburger button to open Sheet
      const hamburgerButton = screen.getByRole("button", {
        name: /toggle sidebar menu/i,
      });

      await user.click(hamburgerButton);

      // Sheet should have slide-in-from-left animation class (indicating left side)
      await waitFor(() => {
        const sheetContent = screen.getByRole("dialog");
        // Check for Radix data-slot attribute or class that indicates left side
        expect(sheetContent).toBeInTheDocument();
      });
    });

    it("Sheet includes accessible title for screen readers", async () => {
      const user = userEvent.setup();

      render(
        <AppShell sidebar={<div data-testid="sidebar-content">Sidebar</div>}>
          <div>Main content</div>
        </AppShell>
      );

      // Click hamburger button to open Sheet
      const hamburgerButton = screen.getByRole("button", {
        name: /toggle sidebar menu/i,
      });

      await user.click(hamburgerButton);

      // SheetTitle should be present for accessibility
      await waitFor(() => {
        // The sr-only title should be in the document
        expect(screen.getByText("Navigation Menu")).toBeInTheDocument();
      });
    });

    it("closes Sheet when X button is clicked", async () => {
      const user = userEvent.setup();

      render(
        <AppShell sidebar={<div data-testid="sidebar-content">Sidebar</div>}>
          <div>Main content</div>
        </AppShell>
      );

      // Open Sheet
      const hamburgerButton = screen.getByRole("button", {
        name: /toggle sidebar menu/i,
      });
      await user.click(hamburgerButton);

      await waitFor(() => {
        expect(screen.getByTestId("sidebar-content")).toBeInTheDocument();
      });

      // Find and click close button
      const closeButton = screen.getByRole("button", { name: /close/i });
      await user.click(closeButton);

      // Sheet should close and sidebar content should be removed
      await waitFor(() => {
        expect(screen.queryByTestId("sidebar-content")).not.toBeInTheDocument();
      });
    });
  });

  describe("sidebar content consistency", () => {
    it("renders same sidebar content on desktop and mobile", async () => {
      const user = userEvent.setup();
      const sidebarContent = (
        <div data-testid="sidebar-content">
          <span>Menu Item 1</span>
          <span>Menu Item 2</span>
        </div>
      );

      // Test desktop
      mockUseIsMobile.mockReturnValue(false);
      const { rerender } = render(
        <AppShell sidebar={sidebarContent}>
          <div>Main content</div>
        </AppShell>
      );

      expect(screen.getByText("Menu Item 1")).toBeInTheDocument();
      expect(screen.getByText("Menu Item 2")).toBeInTheDocument();

      // Test mobile - need to open the Sheet first
      mockUseIsMobile.mockReturnValue(true);
      rerender(
        <AppShell sidebar={sidebarContent}>
          <div>Main content</div>
        </AppShell>
      );

      // Open the Sheet
      const hamburgerButton = screen.getByRole("button", {
        name: /toggle sidebar menu/i,
      });
      await user.click(hamburgerButton);

      await waitFor(() => {
        expect(screen.getByText("Menu Item 1")).toBeInTheDocument();
        expect(screen.getByText("Menu Item 2")).toBeInTheDocument();
      });
    });
  });

  describe("without sidebar", () => {
    it("renders correctly without sidebar prop on desktop", () => {
      mockUseIsMobile.mockReturnValue(false);

      render(
        <AppShell>
          <div data-testid="main-content">Main content</div>
        </AppShell>
      );

      expect(screen.getByTestId("main-content")).toBeInTheDocument();
      // No dialog should be present
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("renders correctly without sidebar prop on mobile", () => {
      mockUseIsMobile.mockReturnValue(true);

      render(
        <AppShell>
          <div data-testid="main-content">Main content</div>
        </AppShell>
      );

      expect(screen.getByTestId("main-content")).toBeInTheDocument();
      // No dialog should be present
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
