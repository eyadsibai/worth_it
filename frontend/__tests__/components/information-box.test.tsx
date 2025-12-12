/**
 * Tests for InformationBox component
 * Following TDD - tests written first
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InformationBox } from "@/components/ui/information-box";

describe("InformationBox", () => {
  it("renders children content", () => {
    render(
      <InformationBox>
        <p>Test content</p>
      </InformationBox>
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("applies default styling classes", () => {
    render(
      <InformationBox data-testid="info-box">
        <p>Content</p>
      </InformationBox>
    );

    const box = screen.getByTestId("info-box");
    expect(box).toHaveClass("p-4");
    expect(box).toHaveClass("border");
    expect(box).toHaveClass("rounded-lg");
  });

  it("accepts additional className", () => {
    render(
      <InformationBox className="mt-4" data-testid="info-box">
        <p>Content</p>
      </InformationBox>
    );

    const box = screen.getByTestId("info-box");
    expect(box).toHaveClass("mt-4");
  });

  it("renders with title when provided", () => {
    render(
      <InformationBox title="Preview">
        <p>Content</p>
      </InformationBox>
    );

    expect(screen.getByText("Preview")).toBeInTheDocument();
  });

  it("supports different variants", () => {
    const { rerender } = render(
      <InformationBox variant="muted" data-testid="info-box">
        <p>Content</p>
      </InformationBox>
    );

    expect(screen.getByTestId("info-box")).toHaveClass("bg-muted/50");

    rerender(
      <InformationBox variant="default" data-testid="info-box">
        <p>Content</p>
      </InformationBox>
    );

    expect(screen.getByTestId("info-box")).toHaveClass("bg-background");
  });

  it("renders multiple children", () => {
    render(
      <InformationBox>
        <div>First item</div>
        <div>Second item</div>
      </InformationBox>
    );

    expect(screen.getByText("First item")).toBeInTheDocument();
    expect(screen.getByText("Second item")).toBeInTheDocument();
  });
});
