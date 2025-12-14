/**
 * Tests for Header component
 * Focuses on the mobile hamburger menu button functionality
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/layout/header";

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
const mockSetOpen = vi.fn();
vi.mock("@/components/command-palette", () => ({
  useCommandPalette: () => ({
    open: false,
    setOpen: mockSetOpen,
  }),
}));

// Mock the sidebar context module for testing the standalone case
vi.mock("@/components/layout/sidebar-context", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/components/layout/sidebar-context")>();
  return {
    ...original,
    useSidebar: vi.fn(() => ({
      isOpen: false,
      setIsOpen: vi.fn(),
      toggle: vi.fn(),
    })),
  };
});

import { useSidebar as mockUseSidebar } from "@/components/layout/sidebar-context";
const mockedUseSidebar = vi.mocked(mockUseSidebar);

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default mock implementation
    mockedUseSidebar.mockReturnValue({
      isOpen: false,
      setIsOpen: vi.fn(),
      toggle: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("hamburger menu button", () => {
    it("renders hamburger button with md:hidden class", () => {
      render(<Header />);

      const hamburgerButton = screen.getByRole("button", {
        name: /toggle sidebar menu/i,
      });

      expect(hamburgerButton).toBeInTheDocument();
      expect(hamburgerButton).toHaveClass("md:hidden");
    });

    it("has proper aria-label for accessibility", () => {
      render(<Header />);

      const hamburgerButton = screen.getByRole("button", {
        name: /toggle sidebar menu/i,
      });

      expect(hamburgerButton).toHaveAttribute(
        "aria-label",
        "Toggle sidebar menu"
      );
    });

    it("calls sidebar.toggle() when clicked", async () => {
      const mockToggle = vi.fn();
      mockedUseSidebar.mockReturnValue({
        isOpen: false,
        setIsOpen: vi.fn(),
        toggle: mockToggle,
      });

      const user = userEvent.setup();
      render(<Header />);

      const hamburgerButton = screen.getByRole("button", {
        name: /toggle sidebar menu/i,
      });

      await user.click(hamburgerButton);

      expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    it("works correctly with no-op sidebar (standalone usage)", async () => {
      // Simulate standalone usage where useSidebar returns no-op functions
      const noOpToggle = vi.fn();
      mockedUseSidebar.mockReturnValue({
        isOpen: false,
        setIsOpen: vi.fn(),
        toggle: noOpToggle,
      });

      const user = userEvent.setup();
      render(<Header />);

      const hamburgerButton = screen.getByRole("button", {
        name: /toggle sidebar menu/i,
      });

      // Should not throw when clicked
      await expect(user.click(hamburgerButton)).resolves.not.toThrow();
      expect(noOpToggle).toHaveBeenCalled();
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
  });
});
