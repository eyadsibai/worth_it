/**
 * Tests for AnimatedText component from motion.tsx
 * Following TDD - tests verify smooth text transitions and accessibility
 */
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AnimatedText } from "@/lib/motion";

// Mock framer-motion to simplify testing
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    // AnimatePresence - render children immediately
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    // motion.* - render as regular HTML elements
    motion: {
      span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
        <span data-motion="true" {...props}>{children}</span>
      ),
      p: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
        <p data-motion="true" {...props}>{children}</p>
      ),
      h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h1 data-motion="true" {...props}>{children}</h1>
      ),
      h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h2 data-motion="true" {...props}>{children}</h2>
      ),
      h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
        <h3 data-motion="true" {...props}>{children}</h3>
      ),
    },
  };
});

// Mock the useReducedMotion hook
const mockUseReducedMotion = vi.fn();
vi.mock("@/lib/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

describe("AnimatedText", () => {
  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset reduced motion mock to false (animations enabled)
    mockUseReducedMotion.mockReturnValue(false);

    // Mock matchMedia for any framer-motion internal usage
    matchMediaMock = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("basic rendering", () => {
    it("renders text content correctly", () => {
      render(<AnimatedText text="Hello World" />);

      expect(screen.getByText("Hello World")).toBeInTheDocument();
    });

    it("renders as span by default", () => {
      render(<AnimatedText text="Test" />);

      const element = screen.getByText("Test");
      expect(element.tagName).toBe("SPAN");
    });

    it("applies custom className", () => {
      render(<AnimatedText text="Styled" className="custom-class" />);

      const element = screen.getByText("Styled");
      expect(element).toHaveClass("custom-class");
    });
  });

  describe("element types", () => {
    it("renders as paragraph when as='p'", () => {
      render(<AnimatedText text="Paragraph" as="p" />);

      const element = screen.getByText("Paragraph");
      expect(element.tagName).toBe("P");
    });

    it("renders as h1 when as='h1'", () => {
      render(<AnimatedText text="Heading 1" as="h1" />);

      const element = screen.getByText("Heading 1");
      expect(element.tagName).toBe("H1");
    });

    it("renders as h2 when as='h2'", () => {
      render(<AnimatedText text="Heading 2" as="h2" />);

      const element = screen.getByText("Heading 2");
      expect(element.tagName).toBe("H2");
    });

    it("renders as h3 when as='h3'", () => {
      render(<AnimatedText text="Heading 3" as="h3" />);

      const element = screen.getByText("Heading 3");
      expect(element.tagName).toBe("H3");
    });
  });

  describe("reduced motion accessibility", () => {
    it("renders without motion wrapper when user prefers reduced motion", () => {
      mockUseReducedMotion.mockReturnValue(true);

      render(<AnimatedText text="No Animation" />);

      const element = screen.getByText("No Animation");
      // Should not have motion data attribute when reduced motion is preferred
      expect(element).not.toHaveAttribute("data-motion");
    });

    it("renders with motion wrapper when user allows motion", () => {
      mockUseReducedMotion.mockReturnValue(false);

      render(<AnimatedText text="With Animation" />);

      const element = screen.getByText("With Animation");
      // Should have motion data attribute when animations are allowed
      expect(element).toHaveAttribute("data-motion", "true");
    });

    it("preserves element type when reduced motion is preferred", () => {
      mockUseReducedMotion.mockReturnValue(true);

      render(<AnimatedText text="Heading" as="h2" />);

      const element = screen.getByText("Heading");
      expect(element.tagName).toBe("H2");
    });

    it("preserves className when reduced motion is preferred", () => {
      mockUseReducedMotion.mockReturnValue(true);

      render(<AnimatedText text="Styled" className="my-class" />);

      const element = screen.getByText("Styled");
      expect(element).toHaveClass("my-class");
    });
  });

  describe("text updates", () => {
    it("updates text content when text prop changes", () => {
      const { rerender } = render(<AnimatedText text="Initial" />);

      expect(screen.getByText("Initial")).toBeInTheDocument();

      rerender(<AnimatedText text="Updated" />);

      expect(screen.getByText("Updated")).toBeInTheDocument();
      expect(screen.queryByText("Initial")).not.toBeInTheDocument();
    });

    it("maintains element type across text updates", () => {
      const { rerender } = render(<AnimatedText text="First" as="h1" />);

      expect(screen.getByText("First").tagName).toBe("H1");

      rerender(<AnimatedText text="Second" as="h1" />);

      expect(screen.getByText("Second").tagName).toBe("H1");
    });
  });
});
