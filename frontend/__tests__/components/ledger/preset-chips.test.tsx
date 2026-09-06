import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PresetChips } from "@/components/ledger/preset-chips";

const options = [
  { label: "$50M", value: 50_000_000 },
  { label: "$100M", value: 100_000_000 },
  { label: "$250M", value: 250_000_000 },
];

describe("PresetChips", () => {
  it("fires onSelect with the clicked chip's value", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<PresetChips options={options} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "$100M" }));

    expect(onSelect).toHaveBeenCalledWith(100_000_000);
  });

  it("marks the selected chip with aria-pressed=true and the rest as false", () => {
    render(<PresetChips options={options} selected={100_000_000} onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "$100M" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "$50M" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "$250M" })).toHaveAttribute("aria-pressed", "false");
  });

  it("marks every chip unpressed when nothing is selected", () => {
    render(<PresetChips options={options} onSelect={vi.fn()} />);

    for (const option of options) {
      expect(screen.getByRole("button", { name: option.label })).toHaveAttribute(
        "aria-pressed",
        "false"
      );
    }
  });
});
