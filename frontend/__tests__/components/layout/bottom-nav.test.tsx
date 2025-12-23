/**
 * Tests for BottomNav component
 * Mobile-only fixed bottom navigation bar with context-based view toggling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileViewProvider } from "@/lib/hooks";
import * as React from "react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Helper to render BottomNav with provider
function renderWithProvider(
  props: { onSaveClick: () => void; onMoreClick: () => void },
  providerProps?: { defaultView?: "inputs" | "results" }
) {
  return render(
    <MobileViewProvider {...providerProps}>
      <BottomNav {...props} />
    </MobileViewProvider>
  );
}

describe("BottomNav", () => {
  const mockOnSaveClick = vi.fn();
  const mockOnMoreClick = vi.fn();

  const defaultProps = {
    onSaveClick: mockOnSaveClick,
    onMoreClick: mockOnMoreClick,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders navigation element with correct role", () => {
      renderWithProvider(defaultProps);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toBeInTheDocument();
    });

    it("renders all four navigation items", () => {
      renderWithProvider(defaultProps);
      expect(screen.getByRole("button", { name: /inputs/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /results/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /more/i })).toBeInTheDocument();
    });

    it("renders icons for each navigation item", () => {
      renderWithProvider(defaultProps);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      const buttons = within(nav).getAllByRole("button");
      expect(buttons).toHaveLength(4);
      buttons.forEach((button) => {
        const svg = button.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe("mobile visibility", () => {
    it("has md:hidden class to hide on desktop", () => {
      renderWithProvider(defaultProps);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveClass("md:hidden");
    });

    it("has fixed positioning at bottom", () => {
      renderWithProvider(defaultProps);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveClass("fixed");
      expect(nav).toHaveClass("bottom-0");
      expect(nav).toHaveClass("left-0");
      expect(nav).toHaveClass("right-0");
    });
  });

  describe("safe area support", () => {
    it("has safe area padding class for notch/home bar", () => {
      renderWithProvider(defaultProps);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveClass("pb-safe");
    });
  });

  describe("interactions", () => {
    it("clicking Inputs button updates context to inputs view", async () => {
      const user = userEvent.setup();
      renderWithProvider(defaultProps, { defaultView: "results" });

      const inputsButton = screen.getByRole("button", { name: /inputs/i });
      await user.click(inputsButton);

      // After clicking, inputs should be active
      expect(inputsButton).toHaveAttribute("data-active", "true");
    });

    it("clicking Results button updates context to results view", async () => {
      const user = userEvent.setup();
      renderWithProvider(defaultProps, { defaultView: "inputs" });

      const resultsButton = screen.getByRole("button", { name: /results/i });
      await user.click(resultsButton);

      // After clicking, results should be active
      expect(resultsButton).toHaveAttribute("data-active", "true");
    });

    it("calls onSaveClick when Save button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProvider(defaultProps);
      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);
      expect(mockOnSaveClick).toHaveBeenCalledTimes(1);
    });

    it("calls onMoreClick when More button is clicked", async () => {
      const user = userEvent.setup();
      renderWithProvider(defaultProps);
      const moreButton = screen.getByRole("button", { name: /more/i });
      await user.click(moreButton);
      expect(mockOnMoreClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("active state from context", () => {
    it("shows Inputs as active when defaultView is inputs", () => {
      renderWithProvider(defaultProps, { defaultView: "inputs" });
      const inputsButton = screen.getByRole("button", { name: /inputs/i });
      expect(inputsButton).toHaveAttribute("data-active", "true");
    });

    it("shows Results as active when defaultView is results", () => {
      renderWithProvider(defaultProps, { defaultView: "results" });
      const resultsButton = screen.getByRole("button", { name: /results/i });
      expect(resultsButton).toHaveAttribute("data-active", "true");
    });

    it("applies visual active styling to active button", () => {
      renderWithProvider(defaultProps, { defaultView: "inputs" });
      const inputsButton = screen.getByRole("button", { name: /inputs/i });
      expect(inputsButton).toHaveClass("text-primary");
    });
  });

  describe("fallback behavior without provider", () => {
    it("renders without crashing when no provider is present", () => {
      // BottomNav uses useMobileViewSafe which returns null without provider
      render(<BottomNav {...defaultProps} />);
      expect(screen.getByRole("navigation", { name: /mobile navigation/i })).toBeInTheDocument();
    });

    it("does not show active state without provider", () => {
      render(<BottomNav {...defaultProps} />);
      const inputsButton = screen.getByRole("button", { name: /inputs/i });
      const resultsButton = screen.getByRole("button", { name: /results/i });
      expect(inputsButton).not.toHaveAttribute("data-active", "true");
      expect(resultsButton).not.toHaveAttribute("data-active", "true");
    });
  });

  describe("accessibility", () => {
    it("has aria-label on navigation element", () => {
      renderWithProvider(defaultProps);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveAttribute("aria-label", "Mobile navigation");
    });

    it("buttons have accessible names", () => {
      renderWithProvider(defaultProps);
      expect(screen.getByRole("button", { name: /inputs/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /results/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /more/i })).toBeInTheDocument();
    });

    it("active button has aria-current attribute", () => {
      renderWithProvider(defaultProps, { defaultView: "inputs" });
      const inputsButton = screen.getByRole("button", { name: /inputs/i });
      expect(inputsButton).toHaveAttribute("aria-current", "page");
    });
  });

  describe("styling", () => {
    it("has background and border styling", () => {
      renderWithProvider(defaultProps);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveClass("bg-card");
      expect(nav).toHaveClass("border-t");
    });

    it("has flex layout for navigation items", () => {
      renderWithProvider(defaultProps);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      const container = nav.firstChild;
      expect(container).toHaveClass("flex");
      expect(container).toHaveClass("justify-around");
    });

    it("has appropriate z-index for overlay", () => {
      renderWithProvider(defaultProps);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveClass("z-50");
    });
  });
});
