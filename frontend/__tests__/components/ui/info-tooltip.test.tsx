/**
 * Tests for InfoTooltip and LabelWithTooltip components
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InfoTooltip, LabelWithTooltip } from "@/components/ui/info-tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";

// Wrapper to provide tooltip context
const renderWithTooltip = (ui: React.ReactElement) => {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
};

describe("InfoTooltip", () => {
  it("renders info icon button", () => {
    renderWithTooltip(<InfoTooltip content="Help text" />);
    expect(screen.getByRole("button", { name: /more information/i })).toBeInTheDocument();
  });

  it("has correct aria-label", () => {
    renderWithTooltip(<InfoTooltip content="Help text" />);
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-label", "More information");
  });
});

describe("LabelWithTooltip", () => {
  describe("Basic Rendering", () => {
    it("renders children text", () => {
      renderWithTooltip(<LabelWithTooltip tooltip="Help text">Field Label</LabelWithTooltip>);
      expect(screen.getByText("Field Label")).toBeInTheDocument();
    });

    it("renders tooltip trigger button", () => {
      renderWithTooltip(<LabelWithTooltip tooltip="Help text">Label</LabelWithTooltip>);
      expect(screen.getByRole("button", { name: /more information/i })).toBeInTheDocument();
    });
  });

  describe("Element Type (as prop)", () => {
    it("renders as label by default", () => {
      renderWithTooltip(<LabelWithTooltip tooltip="Help">Label</LabelWithTooltip>);
      const label = screen.getByText("Label").closest("label");
      expect(label).toBeInTheDocument();
    });

    it("renders as span when as='span'", () => {
      renderWithTooltip(
        <LabelWithTooltip tooltip="Help" as="span">
          Label
        </LabelWithTooltip>
      );
      const element = screen.getByText("Label");
      expect(element.tagName).toBe("SPAN");
    });

    it("renders as div when as='div'", () => {
      renderWithTooltip(
        <LabelWithTooltip tooltip="Help" as="div">
          Label
        </LabelWithTooltip>
      );
      const element = screen.getByText("Label");
      // The text is inside the wrapper div
      expect(element.closest("div")).toBeInTheDocument();
    });
  });

  describe("htmlFor prop", () => {
    it("passes htmlFor to label element", () => {
      renderWithTooltip(
        <LabelWithTooltip tooltip="Help" htmlFor="my-input">
          Label
        </LabelWithTooltip>
      );
      const label = screen.getByText("Label").closest("label");
      expect(label).toHaveAttribute("for", "my-input");
    });

    it("does not add htmlFor to span element", () => {
      renderWithTooltip(
        <LabelWithTooltip tooltip="Help" as="span" htmlFor="my-input">
          Label
        </LabelWithTooltip>
      );
      const span = screen.getByText("Label");
      expect(span).not.toHaveAttribute("for");
    });
  });

  describe("Styling", () => {
    it("applies default flex styling", () => {
      renderWithTooltip(<LabelWithTooltip tooltip="Help">Label</LabelWithTooltip>);
      const label = screen.getByText("Label").closest("label");
      expect(label).toHaveClass("flex");
      expect(label).toHaveClass("items-center");
      expect(label).toHaveClass("gap-1");
    });

    it("applies custom className", () => {
      renderWithTooltip(
        <LabelWithTooltip tooltip="Help" className="custom-class">
          Label
        </LabelWithTooltip>
      );
      const label = screen.getByText("Label").closest("label");
      expect(label).toHaveClass("custom-class");
    });

    it("merges custom className with defaults", () => {
      renderWithTooltip(
        <LabelWithTooltip tooltip="Help" className="mt-4">
          Label
        </LabelWithTooltip>
      );
      const label = screen.getByText("Label").closest("label");
      expect(label).toHaveClass("flex");
      expect(label).toHaveClass("mt-4");
    });
  });

  describe("Content Types", () => {
    it("accepts React nodes as children", () => {
      renderWithTooltip(
        <LabelWithTooltip tooltip="Help">
          <span data-testid="inner">Nested Content</span>
        </LabelWithTooltip>
      );
      expect(screen.getByTestId("inner")).toBeInTheDocument();
    });

    it("accepts React nodes as tooltip", () => {
      renderWithTooltip(
        <LabelWithTooltip tooltip={<strong>Bold tooltip</strong>}>Label</LabelWithTooltip>
      );
      // Tooltip trigger should exist
      expect(screen.getByRole("button")).toBeInTheDocument();
    });
  });
});
