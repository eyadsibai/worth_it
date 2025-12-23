/**
 * Tests for Header component
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/layout/header";
import { WalkthroughProvider } from "@/lib/walkthrough";

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

describe("Header", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("logo and branding", () => {
    it("renders Worth It logo", () => {
      render(
        <WalkthroughProvider>
          <Header />
        </WalkthroughProvider>
      );

      expect(screen.getByText("Worth It")).toBeInTheDocument();
    });

    it("logo links to home page", () => {
      render(
        <WalkthroughProvider>
          <Header />
        </WalkthroughProvider>
      );

      const logoLink = screen.getByRole("link", { name: /worth it/i });
      expect(logoLink).toHaveAttribute("href", "/");
    });
  });

  describe("navigation", () => {
    it("renders desktop navigation links", () => {
      render(
        <WalkthroughProvider>
          <Header />
        </WalkthroughProvider>
      );

      expect(screen.getByRole("link", { name: "Analysis" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "About" })).toBeInTheDocument();
    });
  });

  describe("search button", () => {
    it("renders mobile search button with md:hidden class", () => {
      render(
        <WalkthroughProvider>
          <Header />
        </WalkthroughProvider>
      );

      const mobileSearchButton = screen.getByRole("button", {
        name: /open command palette/i,
      });

      expect(mobileSearchButton).toBeInTheDocument();
      expect(mobileSearchButton).toHaveClass("md:hidden");
    });

    it("calls setOpen(true) when mobile search button clicked", async () => {
      const user = userEvent.setup();
      render(
        <WalkthroughProvider>
          <Header />
        </WalkthroughProvider>
      );

      const mobileSearchButton = screen.getByRole("button", {
        name: /open command palette/i,
      });

      await user.click(mobileSearchButton);

      expect(mockSetOpen).toHaveBeenCalledWith(true);
    });
  });
});
