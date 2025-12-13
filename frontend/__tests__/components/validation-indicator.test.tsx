import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ValidationIndicator } from "@/components/forms/validation-indicator";

describe("ValidationIndicator", () => {
  describe("when field is not touched", () => {
    it("renders nothing", () => {
      const { container } = render(
        <ValidationIndicator
          isValid={false}
          hasError={false}
          hasWarning={false}
          isTouched={false}
          isDirty={false}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe("when field is touched and dirty", () => {
    it("shows checkmark when valid without warnings", () => {
      render(
        <ValidationIndicator
          isValid={true}
          hasError={false}
          hasWarning={false}
          isTouched={true}
          isDirty={true}
        />
      );
      const indicator = screen.getByLabelText("Field is valid");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass("text-chart-3");
    });

    it("shows X when has error", () => {
      render(
        <ValidationIndicator
          isValid={false}
          hasError={true}
          hasWarning={false}
          isTouched={true}
          isDirty={true}
        />
      );
      const indicator = screen.getByLabelText("Field has error");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass("text-destructive");
    });

    it("shows warning icon when valid but has warning", () => {
      render(
        <ValidationIndicator
          isValid={true}
          hasError={false}
          hasWarning={true}
          isTouched={true}
          isDirty={true}
        />
      );
      const indicator = screen.getByLabelText("Field has warning");
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveClass("text-amber-500");
    });

    it("prioritizes error over warning", () => {
      render(
        <ValidationIndicator
          isValid={false}
          hasError={true}
          hasWarning={true}
          isTouched={true}
          isDirty={true}
        />
      );
      const indicator = screen.getByLabelText("Field has error");
      expect(indicator).toBeInTheDocument();
    });
  });

  describe("when only touched but not dirty", () => {
    it("does not show indicator", () => {
      const { container } = render(
        <ValidationIndicator
          isValid={true}
          hasError={false}
          hasWarning={false}
          isTouched={true}
          isDirty={false}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
