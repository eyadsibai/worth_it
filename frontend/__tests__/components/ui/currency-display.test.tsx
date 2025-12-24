/**
 * Tests for CurrencyDisplay component
 * Fundcy-style currency display with muted decimals and variants
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CurrencyDisplay } from "@/components/ui/currency-display";

// Mock the media query hook
vi.mock("@/lib/hooks", () => ({
  useMediaQuery: vi.fn(() => true), // Default to large screen
}));

describe("CurrencyDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders the currency value", () => {
      render(<CurrencyDisplay value={1234.56} />);
      expect(screen.getByText(/\$1,234/)).toBeInTheDocument();
    });

    it("applies tabular-nums class", () => {
      render(<CurrencyDisplay value={1000} />);
      const element = screen.getByText(/\$1,000/);
      expect(element).toHaveClass("tabular-nums");
    });

    it("applies custom className", () => {
      render(<CurrencyDisplay value={1000} className="custom-class" />);
      const element = screen.getByText(/\$1,000/);
      expect(element).toHaveClass("custom-class");
    });
  });

  describe("Decimal Display", () => {
    it("hides decimals by default", () => {
      render(<CurrencyDisplay value={1234.56} />);
      expect(screen.queryByText(".56")).not.toBeInTheDocument();
    });

    it("shows decimals when showDecimals is true", () => {
      render(<CurrencyDisplay value={1234.56} showDecimals />);
      expect(screen.getByText(/\.56/)).toBeInTheDocument();
    });

    it("applies currency-decimal class to decimal portion", () => {
      render(<CurrencyDisplay value={1234.56} showDecimals />);
      const decimal = screen.getByText(/\.56/);
      expect(decimal).toHaveClass("currency-decimal");
    });
  });

  describe("Variant Colors", () => {
    it("has no color class by default", () => {
      render(<CurrencyDisplay value={1000} />);
      const element = screen.getByText(/\$1,000/);
      expect(element).not.toHaveClass("text-terminal");
      expect(element).not.toHaveClass("text-destructive");
    });

    it("applies green color for positive variant", () => {
      render(<CurrencyDisplay value={1000} variant="positive" />);
      const element = screen.getByText(/\$1,000/);
      expect(element).toHaveClass("text-terminal");
    });

    it("applies red color for negative variant", () => {
      render(<CurrencyDisplay value={-500} variant="negative" />);
      const element = screen.getByText(/\$-?500/);
      expect(element).toHaveClass("text-destructive");
    });

    it("applies default variant with no color", () => {
      render(<CurrencyDisplay value={1000} variant="default" />);
      const element = screen.getByText(/\$1,000/);
      expect(element).not.toHaveClass("text-terminal");
      expect(element).not.toHaveClass("text-destructive");
    });

    it("can combine variant with custom className", () => {
      render(<CurrencyDisplay value={1000} variant="positive" className="text-lg" />);
      const element = screen.getByText(/\$1,000/);
      expect(element).toHaveClass("text-terminal");
      expect(element).toHaveClass("text-lg");
    });
  });

  describe("Negative Values", () => {
    it("displays negative values correctly", () => {
      render(<CurrencyDisplay value={-1234.56} />);
      expect(screen.getByText(/-\$1,234/)).toBeInTheDocument();
    });

    it("can use negative variant for negative values", () => {
      render(<CurrencyDisplay value={-500} variant="negative" />);
      const element = screen.getByText(/-\$500/);
      expect(element).toHaveClass("text-destructive");
    });
  });

  describe("Zero Values", () => {
    it("displays zero correctly", () => {
      render(<CurrencyDisplay value={0} />);
      expect(screen.getByText(/\$0/)).toBeInTheDocument();
    });

    it("applies no variant color to zero by default", () => {
      render(<CurrencyDisplay value={0} />);
      const element = screen.getByText(/\$0/);
      expect(element).not.toHaveClass("text-terminal");
      expect(element).not.toHaveClass("text-destructive");
    });
  });

  describe("Show Sign", () => {
    it("shows + prefix for positive values when showSign is true", () => {
      render(<CurrencyDisplay value={1000} showSign />);
      expect(screen.getByText(/\+\$1,000/)).toBeInTheDocument();
    });

    it("shows no prefix for positive values when showSign is false", () => {
      render(<CurrencyDisplay value={1000} showSign={false} />);
      expect(screen.getByText(/\$1,000/)).toBeInTheDocument();
      expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
    });

    it("shows - for negative values regardless of showSign", () => {
      render(<CurrencyDisplay value={-500} showSign />);
      expect(screen.getByText(/-\$500/)).toBeInTheDocument();
    });

    it("shows no sign for zero with showSign", () => {
      render(<CurrencyDisplay value={0} showSign />);
      expect(screen.getByText(/\$0/)).toBeInTheDocument();
      expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
    });
  });
});
