/**
 * Tests for DataLabel component
 * A primitive for uppercase muted data labels
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DataLabel } from "@/components/ui/data-label";

describe("DataLabel", () => {
  describe("Basic Rendering", () => {
    it("renders children text", () => {
      render(<DataLabel>Total Balance</DataLabel>);
      expect(screen.getByText("Total Balance")).toBeInTheDocument();
    });

    it("renders as a span element", () => {
      render(<DataLabel>Label</DataLabel>);
      const element = screen.getByText("Label");
      expect(element.tagName).toBe("SPAN");
    });
  });

  describe("Styling", () => {
    it("applies muted foreground color", () => {
      render(<DataLabel>Label</DataLabel>);
      const element = screen.getByText("Label");
      expect(element).toHaveClass("text-muted-foreground");
    });

    it("applies small text size", () => {
      render(<DataLabel>Label</DataLabel>);
      const element = screen.getByText("Label");
      expect(element).toHaveClass("text-xs");
    });

    it("applies uppercase styling", () => {
      render(<DataLabel>Label</DataLabel>);
      const element = screen.getByText("Label");
      expect(element).toHaveClass("uppercase");
    });

    it("applies tracking-wide for letter spacing", () => {
      render(<DataLabel>Label</DataLabel>);
      const element = screen.getByText("Label");
      expect(element).toHaveClass("tracking-wide");
    });

    it("applies custom className", () => {
      render(<DataLabel className="custom-class">Label</DataLabel>);
      const element = screen.getByText("Label");
      expect(element).toHaveClass("custom-class");
    });

    it("merges custom className with default classes", () => {
      render(<DataLabel className="mt-4">Label</DataLabel>);
      const element = screen.getByText("Label");
      expect(element).toHaveClass("text-muted-foreground");
      expect(element).toHaveClass("mt-4");
    });
  });

  describe("Content Types", () => {
    it("renders React nodes as children", () => {
      render(
        <DataLabel>
          <span data-testid="inner">Nested</span>
        </DataLabel>
      );
      expect(screen.getByTestId("inner")).toBeInTheDocument();
    });
  });
});
