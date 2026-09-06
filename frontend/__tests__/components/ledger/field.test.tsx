import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { Field } from "@/components/ledger/field";

describe("Field", () => {
  it("calls onValueChange with the parsed number once the field is blurred", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Field label="Salary" value={null} onValueChange={onValueChange} />);

    const input = screen.getByRole("textbox", { name: "Salary" });
    await user.type(input, "12000");
    await user.tab();

    expect(onValueChange).toHaveBeenCalledWith(12000);
  });

  it("calls onValueChange with null when the field is cleared", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Field label="Salary" value={12000} onValueChange={onValueChange} />);

    const input = screen.getByRole("textbox", { name: "Salary" });
    await user.clear(input);
    await user.tab();

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it("does not call onValueChange while the field is still being typed into", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Field label="Salary" value={null} onValueChange={onValueChange} />);

    const input = screen.getByRole("textbox", { name: "Salary" });
    await user.type(input, "12000");

    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("hides the error before the first blur", () => {
    render(<Field label="Salary" value={-5} onValueChange={vi.fn()} error="Must be positive" />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the error once the field has been touched", async () => {
    const user = userEvent.setup();
    render(<Field label="Salary" value={-5} onValueChange={vi.fn()} error="Must be positive" />);

    const input = screen.getByRole("textbox", { name: "Salary" });
    await user.click(input);
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent("Must be positive");
  });

  it("renders the hint in annotation color when there is no error showing", () => {
    render(
      <Field label="Salary" value={null} onValueChange={vi.fn()} hint="Monthly, before tax" />
    );

    expect(screen.getByText("Monthly, before tax")).toHaveClass("text-annotation");
  });

  it("hides the hint once a touched error is shown", async () => {
    const user = userEvent.setup();
    render(
      <Field
        label="Salary"
        value={-5}
        onValueChange={vi.fn()}
        hint="Monthly, before tax"
        error="Must be positive"
      />
    );

    const input = screen.getByRole("textbox", { name: "Salary" });
    await user.click(input);
    await user.tab();

    expect(screen.queryByText("Monthly, before tax")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Must be positive");
  });

  it("renders the unit suffix beside the input", () => {
    render(<Field label="Vesting" value={4} onValueChange={vi.fn()} unit="years" />);

    expect(screen.getByText("years")).toBeInTheDocument();
  });

  it("clamps a value below min up to min on blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Field label="Percent" value={null} onValueChange={onValueChange} min={0} max={100} />);

    const input = screen.getByRole("textbox", { name: "Percent" });
    await user.type(input, "-5");
    await user.tab();

    expect(onValueChange).toHaveBeenCalledWith(0);
    expect(input).toHaveValue("0");
  });

  it("clamps a value above max down to max on blur", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Field label="Percent" value={null} onValueChange={onValueChange} min={0} max={100} />);

    const input = screen.getByRole("textbox", { name: "Percent" });
    await user.type(input, "150");
    await user.tab();

    expect(onValueChange).toHaveBeenCalledWith(100);
    expect(input).toHaveValue("100");
  });

  it("passes an in-range value through untouched", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Field label="Percent" value={null} onValueChange={onValueChange} min={0} max={100} />);

    const input = screen.getByRole("textbox", { name: "Percent" });
    await user.type(input, "42");
    await user.tab();

    expect(onValueChange).toHaveBeenCalledWith(42);
    expect(input).toHaveValue("42");
  });

  it("calls onValueChange with null when the typed text doesn't parse as a number", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Field label="Salary" value={null} onValueChange={onValueChange} />);

    const input = screen.getByRole("textbox", { name: "Salary" });
    await user.type(input, "12abc");
    await user.tab();

    expect(onValueChange).toHaveBeenCalledWith(null);
  });

  it("calls onValueChange with null for a lone minus sign", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Field label="Salary" value={null} onValueChange={onValueChange} hint="Monthly, before tax" />
    );

    const input = screen.getByRole("textbox", { name: "Salary" });
    await user.type(input, "-");
    await user.tab();

    expect(onValueChange).toHaveBeenCalledWith(null);
    // No error was supplied, so the hint keeps showing and nothing crashes.
    expect(screen.getByText("Monthly, before tax")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("describes the input by the hint's id when the hint is showing", () => {
    render(
      <Field label="Salary" value={null} onValueChange={vi.fn()} hint="Monthly, before tax" />
    );

    const input = screen.getByRole("textbox", { name: "Salary" });
    const hint = screen.getByText("Monthly, before tax");
    expect(input).toHaveAttribute("aria-describedby", hint.id);
  });

  it("stamps a data-field attribute on the input when dataField is given, for robust external targeting", () => {
    render(<Field label="Salary" value={null} onValueChange={vi.fn()} dataField="salary" />);

    expect(screen.getByRole("textbox", { name: "Salary" })).toHaveAttribute("data-field", "salary");
  });

  it("describes the input by the error's id (not the hint's) once both would show", async () => {
    const user = userEvent.setup();
    render(
      <Field
        label="Salary"
        value={-5}
        onValueChange={vi.fn()}
        hint="Monthly, before tax"
        error="Must be positive"
      />
    );

    const input = screen.getByRole("textbox", { name: "Salary" });
    await user.click(input);
    await user.tab();

    const alert = screen.getByRole("alert");
    expect(input).toHaveAttribute("aria-describedby", alert.id);
  });
});
