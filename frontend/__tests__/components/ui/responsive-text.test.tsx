/**
 * Tests for ResponsiveText component
 * A primitive for showing different text at breakpoints
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResponsiveText } from "@/components/ui/responsive-text";

describe("ResponsiveText", () => {
  describe("Basic Rendering", () => {
    it("renders both full and short versions in DOM", () => {
      render(<ResponsiveText full="Opportunity Cost" short="Opp. Cost" />);

      expect(screen.getByText("Opportunity Cost")).toBeInTheDocument();
      expect(screen.getByText("Opp. Cost")).toBeInTheDocument();
    });

    it("renders as a span wrapper", () => {
      const { container } = render(<ResponsiveText full="Full" short="Short" />);
      expect(container.firstChild?.nodeName).toBe("SPAN");
    });
  });

  describe("Responsive Classes", () => {
    it("hides full text on mobile with hidden sm:inline", () => {
      render(<ResponsiveText full="Full Text" short="Short" />);
      const fullElement = screen.getByText("Full Text");
      expect(fullElement).toHaveClass("hidden");
      expect(fullElement).toHaveClass("sm:inline");
    });

    it("shows short text on mobile with sm:hidden", () => {
      render(<ResponsiveText full="Full" short="Short Text" />);
      const shortElement = screen.getByText("Short Text");
      expect(shortElement).toHaveClass("sm:hidden");
    });
  });

  describe("Custom Styling", () => {
    it("applies className to wrapper span", () => {
      render(<ResponsiveText full="Full" short="Short" className="custom-class" />);
      const wrapper = screen.getByText("Full").parentElement;
      expect(wrapper).toHaveClass("custom-class");
    });
  });

  describe("Content Types", () => {
    it("accepts React nodes for full prop", () => {
      render(<ResponsiveText full={<strong>Bold Full</strong>} short="Short" />);
      expect(screen.getByText("Bold Full").tagName).toBe("STRONG");
    });

    it("accepts React nodes for short prop", () => {
      render(<ResponsiveText full="Full" short={<em>Italic Short</em>} />);
      expect(screen.getByText("Italic Short").tagName).toBe("EM");
    });
  });
});
