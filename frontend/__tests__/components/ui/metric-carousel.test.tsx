import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MetricCarousel } from "@/components/ui/metric-carousel";

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock IntersectionObserver
class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

describe("MetricCarousel", () => {
  const mockChildren = [
    <div key="1" data-testid="card-1">Card 1</div>,
    <div key="2" data-testid="card-2">Card 2</div>,
    <div key="3" data-testid="card-3">Card 3</div>,
    <div key="4" data-testid="card-4">Card 4</div>,
    <div key="5" data-testid="card-5">Card 5</div>,
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all children", () => {
    render(<MetricCarousel>{mockChildren}</MetricCarousel>);

    expect(screen.getByTestId("card-1")).toBeInTheDocument();
    expect(screen.getByTestId("card-2")).toBeInTheDocument();
    expect(screen.getByTestId("card-3")).toBeInTheDocument();
    expect(screen.getByTestId("card-4")).toBeInTheDocument();
    expect(screen.getByTestId("card-5")).toBeInTheDocument();
  });

  it("renders with default props", () => {
    render(<MetricCarousel>{mockChildren}</MetricCarousel>);

    const carousel = screen.getByRole("region", { name: /metrics carousel/i });
    expect(carousel).toBeInTheDocument();
  });

  it("renders dot indicators matching children count", () => {
    render(<MetricCarousel>{mockChildren}</MetricCarousel>);

    const dots = screen.getAllByRole("tab", { name: /go to slide/i });
    expect(dots).toHaveLength(5);
  });

  it("applies custom className", () => {
    render(
      <MetricCarousel className="custom-class">
        {mockChildren}
      </MetricCarousel>
    );

    const container = screen.getByRole("region", { name: /metrics carousel/i }).parentElement;
    expect(container).toHaveClass("custom-class");
  });

  it("has accessible carousel container", () => {
    render(<MetricCarousel>{mockChildren}</MetricCarousel>);

    const carousel = screen.getByRole("region", { name: /metrics carousel/i });
    expect(carousel).toHaveAttribute("aria-label", "Metrics carousel");
  });

  it("renders with showDots=false", () => {
    render(<MetricCarousel showDots={false}>{mockChildren}</MetricCarousel>);

    const dots = screen.queryAllByRole("tab", { name: /go to slide/i });
    expect(dots).toHaveLength(0);
  });

  it("dots have correct aria labels", () => {
    render(<MetricCarousel>{mockChildren}</MetricCarousel>);

    const dots = screen.getAllByRole("tab", { name: /go to slide/i });
    expect(dots[0]).toHaveAttribute("aria-label", "Go to slide 1");
    expect(dots[4]).toHaveAttribute("aria-label", "Go to slide 5");
  });

  it("first dot is active by default", () => {
    render(<MetricCarousel>{mockChildren}</MetricCarousel>);

    const dots = screen.getAllByRole("tab", { name: /go to slide/i });
    // First dot should have active styling (aria-selected)
    expect(dots[0]).toHaveAttribute("aria-selected", "true");
  });

  it("renders grid container for cards", () => {
    render(<MetricCarousel>{mockChildren}</MetricCarousel>);

    // The scrollable container should exist
    const scrollContainer = screen.getByRole("region", { name: /metrics carousel/i });
    expect(scrollContainer).toBeInTheDocument();
  });

  it("handles empty children gracefully", () => {
    render(<MetricCarousel>{[]}</MetricCarousel>);

    const dots = screen.queryAllByRole("tab", { name: /go to slide/i });
    expect(dots).toHaveLength(0);
  });

  it("handles single child", () => {
    render(
      <MetricCarousel>
        <div data-testid="single-card">Single Card</div>
      </MetricCarousel>
    );

    expect(screen.getByTestId("single-card")).toBeInTheDocument();
    // Should still show 1 dot for single child
    const dots = screen.getAllByRole("tab", { name: /go to slide/i });
    expect(dots).toHaveLength(1);
  });

  it("clicking dot scrolls to corresponding card", () => {
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    render(<MetricCarousel>{mockChildren}</MetricCarousel>);

    const dots = screen.getAllByRole("tab", { name: /go to slide/i });
    fireEvent.click(dots[2]); // Click third dot

    // Should attempt to scroll
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it("applies responsive grid classes", () => {
    render(<MetricCarousel>{mockChildren}</MetricCarousel>);

    const carousel = screen.getByRole("region", { name: /metrics carousel/i });
    // Should have the flex class for horizontal scrolling on mobile
    expect(carousel).toHaveClass("flex");
    // Should have lg:grid for desktop layout
    expect(carousel).toHaveClass("lg:grid");
  });
});
