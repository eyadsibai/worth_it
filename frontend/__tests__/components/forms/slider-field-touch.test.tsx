/**
 * Tests for touch-friendly SliderField enhancements (Issue #139)
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { SliderField } from "@/components/forms/form-fields";

const SliderTestSchema = z.object({
  years: z.number().min(1).max(10),
  percentage: z.number().min(0).max(100),
});

type SliderTestFormData = z.infer<typeof SliderTestSchema>;

function SliderTestWrapper({
  children,
  defaultValues = { years: 5, percentage: 50 },
}: {
  children: (form: ReturnType<typeof useForm<SliderTestFormData>>) => React.ReactNode;
  defaultValues?: SliderTestFormData;
}) {
  const form = useForm<SliderTestFormData>({
    resolver: zodResolver(SliderTestSchema) as unknown as undefined,
    defaultValues,
  });
  return (
    <Form {...form}>
      <form>{children(form)}</form>
    </Form>
  );
}

describe("SliderField touch-friendly enhancements", () => {
  describe("stepper buttons", () => {
    it("renders decrement and increment stepper buttons", () => {
      render(
        <SliderTestWrapper>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      expect(screen.getByRole("button", { name: /decrease years/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /increase years/i })).toBeInTheDocument();
    });

    it("increments value when + button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <SliderTestWrapper defaultValues={{ years: 5, percentage: 50 }}>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      await user.click(screen.getByRole("button", { name: /increase years/i }));
      expect(screen.getByRole("button", { name: /edit years value/i })).toHaveTextContent("6");
    });

    it("decrements value when - button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <SliderTestWrapper defaultValues={{ years: 5, percentage: 50 }}>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      await user.click(screen.getByRole("button", { name: /decrease years/i }));
      expect(screen.getByRole("button", { name: /edit years value/i })).toHaveTextContent("4");
    });

    it("disables decrement button at min value", () => {
      render(
        <SliderTestWrapper defaultValues={{ years: 1, percentage: 50 }}>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      expect(screen.getByRole("button", { name: /decrease years/i })).toBeDisabled();
    });

    it("disables increment button at max value", () => {
      render(
        <SliderTestWrapper defaultValues={{ years: 10, percentage: 50 }}>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      expect(screen.getByRole("button", { name: /increase years/i })).toBeDisabled();
    });
  });

  describe("tappable value input", () => {
    it("shows clickable value display by default", () => {
      render(
        <SliderTestWrapper>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      const valueButton = screen.getByRole("button", { name: /edit years value/i });
      expect(valueButton).toBeInTheDocument();
      expect(valueButton).toHaveTextContent("5");
    });

    it("opens input field when value is clicked", async () => {
      const user = userEvent.setup();
      render(
        <SliderTestWrapper>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      await user.click(screen.getByRole("button", { name: /edit years value/i }));
      expect(screen.getByRole("spinbutton")).toHaveValue(5);
    });

    it("updates value when typing and pressing Enter", async () => {
      const user = userEvent.setup();
      render(
        <SliderTestWrapper>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      await user.click(screen.getByRole("button", { name: /edit years value/i }));
      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "8");
      await user.keyboard("{Enter}");
      expect(screen.getByRole("button", { name: /edit years value/i })).toHaveTextContent("8");
    });

    it("clamps input value to min when below range", async () => {
      const user = userEvent.setup();
      render(
        <SliderTestWrapper>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      await user.click(screen.getByRole("button", { name: /edit years value/i }));
      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "0");
      await user.keyboard("{Enter}");
      expect(screen.getByRole("button", { name: /edit years value/i })).toHaveTextContent("1");
    });

    it("clamps input value to max when above range", async () => {
      const user = userEvent.setup();
      render(
        <SliderTestWrapper>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      await user.click(screen.getByRole("button", { name: /edit years value/i }));
      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "15");
      await user.keyboard("{Enter}");
      expect(screen.getByRole("button", { name: /edit years value/i })).toHaveTextContent("10");
    });

    it("cancels edit when Escape is pressed", async () => {
      const user = userEvent.setup();
      render(
        <SliderTestWrapper>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      await user.click(screen.getByRole("button", { name: /edit years value/i }));
      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "8");
      await user.keyboard("{Escape}");
      // Verify original value is preserved
      expect(screen.getByRole("button", { name: /edit years value/i })).toHaveTextContent("5");
      // Verify input is closed (not in edit mode)
      expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
    });

    it("keeps previous value when invalid (non-numeric) input is entered", async () => {
      const user = userEvent.setup();
      render(
        <SliderTestWrapper defaultValues={{ years: 5, percentage: 50 }}>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      await user.click(screen.getByRole("button", { name: /edit years value/i }));
      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "abc");
      await user.keyboard("{Enter}");
      // Should keep original value when input is invalid
      expect(screen.getByRole("button", { name: /edit years value/i })).toHaveTextContent("5");
    });

    it("keeps previous value when empty input is submitted", async () => {
      const user = userEvent.setup();
      render(
        <SliderTestWrapper defaultValues={{ years: 5, percentage: 50 }}>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      await user.click(screen.getByRole("button", { name: /edit years value/i }));
      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.keyboard("{Enter}");
      // Should keep original value when input is empty
      expect(screen.getByRole("button", { name: /edit years value/i })).toHaveTextContent("5");
    });

    it("does not apply escaped value on subsequent blur", async () => {
      const user = userEvent.setup();
      render(
        <SliderTestWrapper defaultValues={{ years: 5, percentage: 50 }}>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      await user.click(screen.getByRole("button", { name: /edit years value/i }));
      const input = screen.getByRole("spinbutton");
      await user.clear(input);
      await user.type(input, "9");
      await user.keyboard("{Escape}");
      // Value should remain unchanged after Escape
      expect(screen.getByRole("button", { name: /edit years value/i })).toHaveTextContent("5");
    });
  });

  describe("keyboard navigation", () => {
    it("preserves slider keyboard navigation (Arrow keys)", async () => {
      const user = userEvent.setup();
      render(
        <SliderTestWrapper defaultValues={{ years: 5, percentage: 50 }}>
          {(form) => <SliderField form={form} name="years" label="Years" min={1} max={10} />}
        </SliderTestWrapper>
      );
      const slider = screen.getByRole("slider");
      slider.focus();
      await user.keyboard("{ArrowRight}");
      expect(slider).toHaveAttribute("aria-valuenow", "6");
    });
  });
});
