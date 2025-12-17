/**
 * Tests for BottomNav component
 * Mobile-only fixed bottom navigation bar
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BottomNav } from "@/components/layout/bottom-nav";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("BottomNav", () => {
  const mockOnFormsClick = vi.fn();
  const mockOnResultsClick = vi.fn();
  const mockOnSaveClick = vi.fn();
  const mockOnMoreClick = vi.fn();

  const defaultProps = {
    onFormsClick: mockOnFormsClick,
    onResultsClick: mockOnResultsClick,
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
      render(<BottomNav {...defaultProps} />);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toBeInTheDocument();
    });

    it("renders all four navigation items", () => {
      render(<BottomNav {...defaultProps} />);
      expect(screen.getByRole("button", { name: /forms/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /results/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /more/i })).toBeInTheDocument();
    });

    it("renders icons for each navigation item", () => {
      render(<BottomNav {...defaultProps} />);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      const buttons = within(nav).getAllByRole("button");
      expect(buttons).toHaveLength(4);
      buttons.forEach(button => {
        const svg = button.querySelector("svg");
        expect(svg).toBeInTheDocument();
      });
    });
  });

  describe("mobile visibility", () => {
    it("has md:hidden class to hide on desktop", () => {
      render(<BottomNav {...defaultProps} />);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveClass("md:hidden");
    });

    it("has fixed positioning at bottom", () => {
      render(<BottomNav {...defaultProps} />);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveClass("fixed");
      expect(nav).toHaveClass("bottom-0");
      expect(nav).toHaveClass("left-0");
      expect(nav).toHaveClass("right-0");
    });
  });

  describe("safe area support", () => {
    it("has safe area padding class for notch/home bar", () => {
      render(<BottomNav {...defaultProps} />);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveClass("pb-safe");
    });
  });

  describe("interactions", () => {
    it("calls onFormsClick when Forms button is clicked", async () => {
      const user = userEvent.setup();
      render(<BottomNav {...defaultProps} />);
      const formsButton = screen.getByRole("button", { name: /forms/i });
      await user.click(formsButton);
      expect(mockOnFormsClick).toHaveBeenCalledTimes(1);
    });

    it("calls onResultsClick when Results button is clicked", async () => {
      const user = userEvent.setup();
      render(<BottomNav {...defaultProps} />);
      const resultsButton = screen.getByRole("button", { name: /results/i });
      await user.click(resultsButton);
      expect(mockOnResultsClick).toHaveBeenCalledTimes(1);
    });

    it("calls onSaveClick when Save button is clicked", async () => {
      const user = userEvent.setup();
      render(<BottomNav {...defaultProps} />);
      const saveButton = screen.getByRole("button", { name: /save/i });
      await user.click(saveButton);
      expect(mockOnSaveClick).toHaveBeenCalledTimes(1);
    });

    it("calls onMoreClick when More button is clicked", async () => {
      const user = userEvent.setup();
      render(<BottomNav {...defaultProps} />);
      const moreButton = screen.getByRole("button", { name: /more/i });
      await user.click(moreButton);
      expect(mockOnMoreClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("active state", () => {
    it("shows Forms as active when activeSection is forms", () => {
      render(<BottomNav {...defaultProps} activeSection="forms" />);
      const formsButton = screen.getByRole("button", { name: /forms/i });
      expect(formsButton).toHaveAttribute("data-active", "true");
    });

    it("shows Results as active when activeSection is results", () => {
      render(<BottomNav {...defaultProps} activeSection="results" />);
      const resultsButton = screen.getByRole("button", { name: /results/i });
      expect(resultsButton).toHaveAttribute("data-active", "true");
    });

    it("does not show active state when activeSection is undefined", () => {
      render(<BottomNav {...defaultProps} />);
      const formsButton = screen.getByRole("button", { name: /forms/i });
      const resultsButton = screen.getByRole("button", { name: /results/i });
      expect(formsButton).not.toHaveAttribute("data-active", "true");
      expect(resultsButton).not.toHaveAttribute("data-active", "true");
    });

    it("applies visual active styling to active button", () => {
      render(<BottomNav {...defaultProps} activeSection="forms" />);
      const formsButton = screen.getByRole("button", { name: /forms/i });
      expect(formsButton).toHaveClass("text-primary");
    });
  });

  describe("accessibility", () => {
    it("has aria-label on navigation element", () => {
      render(<BottomNav {...defaultProps} />);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveAttribute("aria-label", "Mobile navigation");
    });

    it("buttons have accessible names", () => {
      render(<BottomNav {...defaultProps} />);
      expect(screen.getByRole("button", { name: /forms/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /results/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /more/i })).toBeInTheDocument();
    });

    it("active button has aria-current attribute", () => {
      render(<BottomNav {...defaultProps} activeSection="forms" />);
      const formsButton = screen.getByRole("button", { name: /forms/i });
      expect(formsButton).toHaveAttribute("aria-current", "true");
    });
  });

  describe("styling", () => {
    it("has background and border styling", () => {
      render(<BottomNav {...defaultProps} />);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveClass("bg-card");
      expect(nav).toHaveClass("border-t");
    });

    it("has flex layout for navigation items", () => {
      render(<BottomNav {...defaultProps} />);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      const container = nav.firstChild;
      expect(container).toHaveClass("flex");
      expect(container).toHaveClass("justify-around");
    });

    it("has appropriate z-index for overlay", () => {
      render(<BottomNav {...defaultProps} />);
      const nav = screen.getByRole("navigation", { name: /mobile navigation/i });
      expect(nav).toHaveClass("z-50");
    });
  });
});
