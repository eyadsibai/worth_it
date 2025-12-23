/**
 * Tests for ProFormaToggle component
 * Following TDD - tests written first
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProFormaToggle } from "@/components/cap-table/pro-forma-toggle";

describe("ProFormaToggle", () => {
  it("renders toggle with current state unchecked by default", () => {
    render(<ProFormaToggle isProForma={false} onToggle={() => {}} />);

    expect(screen.getByRole("switch")).toBeInTheDocument();
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("shows current cap table label when toggle is off", () => {
    render(<ProFormaToggle isProForma={false} onToggle={() => {}} />);

    expect(screen.getByText(/current/i)).toBeInTheDocument();
  });

  it("shows pro-forma label when toggle is on", () => {
    render(<ProFormaToggle isProForma={true} onToggle={() => {}} />);

    expect(screen.getByText(/pro-forma/i)).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("calls onToggle when clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(<ProFormaToggle isProForma={false} onToggle={onToggle} />);

    await user.click(screen.getByRole("switch"));

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("calls onToggle with false when turned off", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(<ProFormaToggle isProForma={true} onToggle={onToggle} />);

    await user.click(screen.getByRole("switch"));

    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("is disabled when disabled prop is true", () => {
    render(<ProFormaToggle isProForma={false} onToggle={() => {}} disabled />);

    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("shows tooltip hint about pro-forma", () => {
    render(<ProFormaToggle isProForma={false} onToggle={() => {}} />);

    // Should have descriptive text about what pro-forma means
    expect(screen.getByText(/after.*conversion/i)).toBeInTheDocument();
  });
});
