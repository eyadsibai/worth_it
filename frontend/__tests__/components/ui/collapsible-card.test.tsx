/**
 * Tests for CollapsibleCard component
 * Tests the collapsible card wrapper with Radix Collapsible primitive
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollapsibleCard } from "@/components/ui/collapsible-card";

describe("CollapsibleCard", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders with title and children", () => {
      render(
        <CollapsibleCard title="Test Card">
          <p>Card content</p>
        </CollapsibleCard>
      );

      expect(screen.getByText("Test Card")).toBeInTheDocument();
      expect(screen.getByText("Card content")).toBeInTheDocument();
    });

    it("renders with description", () => {
      render(
        <CollapsibleCard title="Test Card" description="Card description">
          <p>Content</p>
        </CollapsibleCard>
      );

      expect(screen.getByText("Card description")).toBeInTheDocument();
    });

    it("renders with custom icon", () => {
      const CustomIcon = () => <span data-testid="custom-icon">★</span>;
      render(
        <CollapsibleCard title="Test Card" icon={<CustomIcon />}>
          <p>Content</p>
        </CollapsibleCard>
      );

      expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
    });

    it("applies dataTour attribute", () => {
      render(
        <CollapsibleCard title="Test Card" dataTour="test-tour">
          <p>Content</p>
        </CollapsibleCard>
      );

      expect(screen.getByText("Test Card").closest("[data-tour]")).toHaveAttribute(
        "data-tour",
        "test-tour"
      );
    });
  });

  describe("Collapsible Behavior", () => {
    it("is open by default", () => {
      render(
        <CollapsibleCard title="Test Card">
          <p>Card content</p>
        </CollapsibleCard>
      );

      expect(screen.getByText("Card content")).toBeVisible();
    });

    it("starts collapsed when defaultOpen is false", () => {
      render(
        <CollapsibleCard title="Test Card" defaultOpen={false}>
          <p>Card content</p>
        </CollapsibleCard>
      );

      // Radix removes content from DOM when collapsed
      expect(screen.queryByText("Card content")).not.toBeInTheDocument();
    });

    it("toggles content visibility when header is clicked", async () => {
      const user = userEvent.setup();
      render(
        <CollapsibleCard title="Test Card">
          <p>Card content</p>
        </CollapsibleCard>
      );

      // Initially open
      expect(screen.getByText("Card content")).toBeVisible();

      // Click to collapse
      await user.click(screen.getByRole("button", { name: /test card/i }));
      expect(screen.queryByText("Card content")).not.toBeInTheDocument();

      // Click to expand
      await user.click(screen.getByRole("button", { name: /test card/i }));
      expect(screen.getByText("Card content")).toBeVisible();
    });

    it("calls onOpenChange when toggled", async () => {
      const user = userEvent.setup();
      const onOpenChange = vi.fn();
      render(
        <CollapsibleCard title="Test Card" onOpenChange={onOpenChange}>
          <p>Card content</p>
        </CollapsibleCard>
      );

      await user.click(screen.getByRole("button", { name: /test card/i }));
      expect(onOpenChange).toHaveBeenCalledWith(false);

      await user.click(screen.getByRole("button", { name: /test card/i }));
      expect(onOpenChange).toHaveBeenCalledWith(true);
    });

    it("respects controlled open prop", () => {
      const { rerender } = render(
        <CollapsibleCard title="Test Card" open={true}>
          <p>Card content</p>
        </CollapsibleCard>
      );

      expect(screen.getByText("Card content")).toBeVisible();

      rerender(
        <CollapsibleCard title="Test Card" open={false}>
          <p>Card content</p>
        </CollapsibleCard>
      );

      expect(screen.queryByText("Card content")).not.toBeInTheDocument();
    });
  });

  describe("Non-Collapsible Mode", () => {
    it("renders static card when collapsible is false", () => {
      render(
        <CollapsibleCard title="Test Card" collapsible={false}>
          <p>Card content</p>
        </CollapsibleCard>
      );

      // Content should be visible
      expect(screen.getByText("Card content")).toBeVisible();

      // No toggle button should exist
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("ignores defaultOpen when not collapsible", () => {
      render(
        <CollapsibleCard title="Test Card" collapsible={false} defaultOpen={false}>
          <p>Card content</p>
        </CollapsibleCard>
      );

      // Content should still be visible (static card)
      expect(screen.getByText("Card content")).toBeVisible();
    });
  });

  describe("Accent Colors", () => {
    it("applies primary accent color by default", () => {
      render(
        <CollapsibleCard title="Test Card">
          <p>Content</p>
        </CollapsibleCard>
      );

      const card = screen.getByText("Test Card").closest(".terminal-card");
      expect(card).toHaveClass("border-l-primary/50");
    });

    it("applies chart-1 accent color", () => {
      render(
        <CollapsibleCard title="Test Card" accentColor="chart-1">
          <p>Content</p>
        </CollapsibleCard>
      );

      const card = screen.getByText("Test Card").closest(".terminal-card");
      expect(card).toHaveClass("border-l-chart-1/60");
    });

    it("applies chart-3 accent color", () => {
      render(
        <CollapsibleCard title="Test Card" accentColor="chart-3">
          <p>Content</p>
        </CollapsibleCard>
      );

      const card = screen.getByText("Test Card").closest(".terminal-card");
      expect(card).toHaveClass("border-l-chart-3/60");
    });
  });

  describe("Styling", () => {
    it("applies terminal-card class", () => {
      render(
        <CollapsibleCard title="Test Card">
          <p>Content</p>
        </CollapsibleCard>
      );

      const card = screen.getByText("Test Card").closest(".terminal-card");
      expect(card).toHaveClass("terminal-card");
    });

    it("applies custom className", () => {
      render(
        <CollapsibleCard title="Test Card" className="custom-class">
          <p>Content</p>
        </CollapsibleCard>
      );

      const card = screen.getByText("Test Card").closest(".terminal-card");
      expect(card).toHaveClass("custom-class");
    });

    it("has chevron icon that rotates when collapsed", async () => {
      const user = userEvent.setup();
      render(
        <CollapsibleCard title="Test Card">
          <p>Content</p>
        </CollapsibleCard>
      );

      const button = screen.getByRole("button", { name: /test card/i });
      const chevron = button.querySelector("svg");
      expect(chevron).toBeInTheDocument();

      // Click to collapse - chevron should have rotate class applied via group-data selector
      await user.click(button);
      // The button should have data-state=closed
      expect(button).toHaveAttribute("data-state", "closed");
    });
  });

  describe("Accessibility", () => {
    it("has accessible button with card title", () => {
      render(
        <CollapsibleCard title="Settings">
          <p>Content</p>
        </CollapsibleCard>
      );

      expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
    });

    it("chevron icon is hidden from screen readers", () => {
      render(
        <CollapsibleCard title="Test Card">
          <p>Content</p>
        </CollapsibleCard>
      );

      const button = screen.getByRole("button", { name: /test card/i });
      const chevron = button.querySelector("svg");
      expect(chevron).toHaveAttribute("aria-hidden", "true");
    });
  });
});
