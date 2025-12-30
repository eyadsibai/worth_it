import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { NegotiationRange } from "@/components/valuation/negotiation-range";

describe("NegotiationRange", () => {
  const defaultProps = {
    floor: 7_000_000,
    conservative: 8_500_000,
    target: 10_000_000,
    aggressive: 12_000_000,
    ceiling: 15_000_000,
  };

  describe("Rendering", () => {
    it("renders the card with title", () => {
      render(<NegotiationRange {...defaultProps} />);
      expect(screen.getByText("Negotiation Range")).toBeInTheDocument();
    });

    it("renders Term Sheet Strategy badge", () => {
      render(<NegotiationRange {...defaultProps} />);
      expect(screen.getByText("Term Sheet Strategy")).toBeInTheDocument();
    });

    it("renders all five negotiation levels", () => {
      render(<NegotiationRange {...defaultProps} />);
      expect(screen.getByText("Floor")).toBeInTheDocument();
      expect(screen.getByText("Conservative")).toBeInTheDocument();
      expect(screen.getByText("Target")).toBeInTheDocument();
      expect(screen.getByText("Aggressive")).toBeInTheDocument();
      expect(screen.getByText("Ceiling")).toBeInTheDocument();
    });

    it("renders descriptions for each level", () => {
      render(<NegotiationRange {...defaultProps} />);
      expect(screen.getByText("Walk away below this")).toBeInTheDocument();
      expect(screen.getByText("Defensible lower bound")).toBeInTheDocument();
      expect(screen.getByText("Ideal outcome")).toBeInTheDocument();
      expect(screen.getByText("Stretch goal")).toBeInTheDocument();
      expect(screen.getByText("Maximum ask")).toBeInTheDocument();
    });
  });

  describe("Value Display", () => {
    it("formats currency values correctly", () => {
      render(<NegotiationRange {...defaultProps} />);
      // formatCurrencyCompact formats values as abbreviated (e.g., $7M)
      expect(screen.getByText("$7M")).toBeInTheDocument();
      expect(screen.getByText("$9M")).toBeInTheDocument(); // 8.5M rounds to 9M in compact
      expect(screen.getByText("$10M")).toBeInTheDocument();
      expect(screen.getByText("$12M")).toBeInTheDocument();
      expect(screen.getByText("$15M")).toBeInTheDocument();
    });
  });

  describe("Strategy Insight", () => {
    it("renders strategy recommendation", () => {
      render(<NegotiationRange {...defaultProps} />);
      expect(screen.getByText(/Strategy:/)).toBeInTheDocument();
    });

    it("includes open, aim, accept guidance in strategy", () => {
      render(<NegotiationRange {...defaultProps} />);
      // The strategy text contains key negotiation points
      expect(screen.getByText(/Open at/)).toBeInTheDocument();
      expect(screen.getByText(/aim for/)).toBeInTheDocument();
      // "Walk away below" appears twice - once in floor description, once in strategy
      expect(screen.getAllByText(/Walk away below/)).toHaveLength(2);
    });
  });

  describe("Visual Elements", () => {
    it("renders colored markers for each level", () => {
      const { container } = render(<NegotiationRange {...defaultProps} />);
      // Check for colored marker divs
      expect(container.querySelector(".bg-red-500")).toBeInTheDocument();
      expect(container.querySelector(".bg-orange-500")).toBeInTheDocument();
      expect(container.querySelector(".bg-green-500")).toBeInTheDocument();
      expect(container.querySelector(".bg-blue-500")).toBeInTheDocument();
      expect(container.querySelector(".bg-purple-500")).toBeInTheDocument();
    });

    it("renders target zone highlight", () => {
      const { container } = render(<NegotiationRange {...defaultProps} />);
      // Should have a semi-transparent green zone
      expect(container.querySelector(".bg-green-500\\/20")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    it("handles zero values gracefully", () => {
      const zeroProps = {
        floor: 0,
        conservative: 0,
        target: 0,
        aggressive: 0,
        ceiling: 0,
      };
      // Should not throw
      expect(() => render(<NegotiationRange {...zeroProps} />)).not.toThrow();
    });

    it("handles small values", () => {
      const smallProps = {
        floor: 70_000,
        conservative: 85_000,
        target: 100_000,
        aggressive: 120_000,
        ceiling: 150_000,
      };
      render(<NegotiationRange {...smallProps} />);
      // formatCurrencyCompact formats these as K values
      expect(screen.getByText("$70K")).toBeInTheDocument();
      expect(screen.getByText("$100K")).toBeInTheDocument();
    });
  });
});
