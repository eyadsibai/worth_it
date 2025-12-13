import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormWarning } from "@/components/ui/form-warning";

describe("FormWarning", () => {
  it("renders warning message", () => {
    render(<FormWarning>This is a warning</FormWarning>);
    expect(screen.getByText("This is a warning")).toBeInTheDocument();
  });

  it("has role='alert' for accessibility", () => {
    render(<FormWarning>Warning message</FormWarning>);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
  });

  it("has aria-live='polite' for screen readers", () => {
    render(<FormWarning>Warning message</FormWarning>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("renders with amber/warning styling", () => {
    render(<FormWarning>Warning message</FormWarning>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("text-amber-600");
  });

  it("renders nothing when children is null", () => {
    const { container } = render(<FormWarning>{null}</FormWarning>);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when children is undefined", () => {
    const { container } = render(<FormWarning>{undefined}</FormWarning>);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when children is empty string", () => {
    const { container } = render(<FormWarning>{""}</FormWarning>);
    expect(container.firstChild).toBeNull();
  });

  it("accepts custom className", () => {
    render(<FormWarning className="custom-class">Warning</FormWarning>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("custom-class");
  });

  it("renders with lightbulb icon", () => {
    render(<FormWarning>Warning message</FormWarning>);
    // Icon should be present (SVG)
    const alert = screen.getByRole("alert");
    const svg = alert.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
