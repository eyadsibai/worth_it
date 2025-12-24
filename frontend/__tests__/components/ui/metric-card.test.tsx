/**
 * Tests for MetricCard components
 * Card shell wrapper for metrics display
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricCard, MetricCardHeader, MetricCardContent } from "@/components/ui/metric-card";

describe("MetricCard", () => {
  describe("Basic Rendering", () => {
    it("renders children", () => {
      render(
        <MetricCard>
          <div>Card Content</div>
        </MetricCard>
      );
      expect(screen.getByText("Card Content")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies terminal-card class", () => {
      render(
        <MetricCard>
          <div data-testid="content">Content</div>
        </MetricCard>
      );
      const card = screen.getByTestId("content").closest(".terminal-card");
      expect(card).toHaveClass("terminal-card");
    });

    it("applies h-full for consistent height", () => {
      render(
        <MetricCard>
          <div data-testid="content">Content</div>
        </MetricCard>
      );
      const card = screen.getByTestId("content").closest(".terminal-card");
      expect(card).toHaveClass("h-full");
    });

    it("applies overflow-hidden", () => {
      render(
        <MetricCard>
          <div data-testid="content">Content</div>
        </MetricCard>
      );
      const card = screen.getByTestId("content").closest(".terminal-card");
      expect(card).toHaveClass("overflow-hidden");
    });

    it("applies custom className", () => {
      render(
        <MetricCard className="custom-class">
          <div data-testid="content">Content</div>
        </MetricCard>
      );
      const card = screen.getByTestId("content").closest(".terminal-card");
      expect(card).toHaveClass("custom-class");
    });
  });
});

describe("MetricCardHeader", () => {
  describe("Basic Rendering", () => {
    it("renders children", () => {
      render(<MetricCardHeader>Header Label</MetricCardHeader>);
      expect(screen.getByText("Header Label")).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct padding", () => {
      const { container } = render(<MetricCardHeader>Label</MetricCardHeader>);
      // CardHeader element
      const header = container.firstChild;
      expect(header).toHaveClass("px-4");
      expect(header).toHaveClass("pt-4");
      expect(header).toHaveClass("pb-2");
    });

    it("wraps content in CardDescription with data-label class", () => {
      render(<MetricCardHeader>Label Text</MetricCardHeader>);
      const description = screen.getByText("Label Text").closest(".data-label");
      expect(description).toBeInTheDocument();
    });

    it("applies text-xs to CardDescription", () => {
      render(<MetricCardHeader>Label</MetricCardHeader>);
      const description = screen.getByText("Label").closest(".data-label");
      expect(description).toHaveClass("text-xs");
    });

    it("applies custom className", () => {
      const { container } = render(
        <MetricCardHeader className="custom-header">Label</MetricCardHeader>
      );
      const header = container.firstChild;
      expect(header).toHaveClass("custom-header");
    });
  });
});

describe("MetricCardContent", () => {
  describe("Basic Rendering", () => {
    it("renders children as main value", () => {
      render(<MetricCardContent>$74,503</MetricCardContent>);
      expect(screen.getByText("$74,503")).toBeInTheDocument();
    });

    it("renders subtitle when provided", () => {
      render(<MetricCardContent subtitle="Additional info">$74,503</MetricCardContent>);
      expect(screen.getByText("Additional info")).toBeInTheDocument();
    });

    it("does not render subtitle element when not provided", () => {
      const { container } = render(<MetricCardContent>$74,503</MetricCardContent>);
      const subtitleP = container.querySelector("p.text-muted-foreground");
      expect(subtitleP).not.toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("applies correct padding", () => {
      const { container } = render(<MetricCardContent>Value</MetricCardContent>);
      const content = container.firstChild;
      expect(content).toHaveClass("px-4");
      expect(content).toHaveClass("pb-4");
    });

    it("applies CardTitle styling to value", () => {
      render(<MetricCardContent>$74,503</MetricCardContent>);
      const value = screen.getByText("$74,503");
      expect(value).toHaveClass("text-lg");
      expect(value).toHaveClass("font-semibold");
      expect(value).toHaveClass("tracking-tight");
      expect(value).toHaveClass("lg:text-xl");
    });

    it("applies muted styling to subtitle", () => {
      render(<MetricCardContent subtitle="Subtitle text">Value</MetricCardContent>);
      const subtitle = screen.getByText("Subtitle text");
      expect(subtitle).toHaveClass("text-muted-foreground");
      expect(subtitle).toHaveClass("text-xs");
      expect(subtitle).toHaveClass("mt-1");
    });

    it("applies line-clamp-1 to subtitle", () => {
      render(
        <MetricCardContent subtitle="Very long subtitle that should be truncated">
          Value
        </MetricCardContent>
      );
      const subtitle = screen.getByText("Very long subtitle that should be truncated");
      expect(subtitle).toHaveClass("line-clamp-1");
    });

    it("applies custom className", () => {
      const { container } = render(
        <MetricCardContent className="custom-content">Value</MetricCardContent>
      );
      const content = container.firstChild;
      expect(content).toHaveClass("custom-content");
    });
  });

  describe("Content Types", () => {
    it("accepts React nodes as children", () => {
      render(
        <MetricCardContent>
          <span data-testid="currency">$74,503</span>
        </MetricCardContent>
      );
      expect(screen.getByTestId("currency")).toBeInTheDocument();
    });

    it("accepts React nodes as subtitle", () => {
      render(<MetricCardContent subtitle={<em>Emphasis</em>}>Value</MetricCardContent>);
      expect(screen.getByText("Emphasis").tagName).toBe("EM");
    });
  });
});

describe("MetricCard Composition", () => {
  it("composes all parts correctly", () => {
    render(
      <MetricCard>
        <MetricCardHeader>Net Benefit</MetricCardHeader>
        <MetricCardContent subtitle="Worth it!">$125,000</MetricCardContent>
      </MetricCard>
    );

    expect(screen.getByText("Net Benefit")).toBeInTheDocument();
    expect(screen.getByText("$125,000")).toBeInTheDocument();
    expect(screen.getByText("Worth it!")).toBeInTheDocument();
  });
});
