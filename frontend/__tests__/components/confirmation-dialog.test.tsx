/**
 * Tests for ConfirmationDialog component
 * Following TDD - tests written first
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

describe("ConfirmationDialog", () => {
  it("renders the trigger element", () => {
    render(
      <ConfirmationDialog
        trigger={<Button data-testid="delete-btn">Delete</Button>}
        title="Confirm Delete"
        description="Are you sure?"
        onConfirm={vi.fn()}
      />
    );

    expect(screen.getByTestId("delete-btn")).toBeInTheDocument();
  });

  it("shows dialog when trigger is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ConfirmationDialog
        trigger={<Button>Delete</Button>}
        title="Confirm Delete"
        description="Are you sure you want to delete this item?"
        onConfirm={vi.fn()}
      />
    );

    // Dialog should not be visible initially
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    // Click trigger
    await user.click(screen.getByRole("button", { name: /delete/i }));

    // Dialog should appear
    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
    expect(screen.getByText("Are you sure you want to delete this item?")).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmationDialog
        trigger={<Button>Delete</Button>}
        title="Confirm Delete"
        description="Are you sure?"
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    // Click confirm button (default label is "Continue")
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes dialog when cancel is clicked without calling onConfirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmationDialog
        trigger={<Button>Delete</Button>}
        title="Confirm Delete"
        description="Are you sure?"
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    // Click cancel button
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("uses custom button labels", async () => {
    const user = userEvent.setup();

    render(
      <ConfirmationDialog
        trigger={<Button>Remove</Button>}
        title="Remove Item"
        description="This cannot be undone."
        onConfirm={vi.fn()}
        confirmLabel="Yes, Remove"
        cancelLabel="Keep It"
      />
    );

    await user.click(screen.getByRole("button", { name: /remove/i }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /yes, remove/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /keep it/i })).toBeInTheDocument();
  });

  it("applies destructive variant to confirm button", async () => {
    const user = userEvent.setup();

    render(
      <ConfirmationDialog
        trigger={<Button>Delete</Button>}
        title="Delete Item"
        description="This is permanent."
        onConfirm={vi.fn()}
        variant="destructive"
        confirmLabel="Delete"
      />
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    // The confirm button should have destructive styling
    const confirmBtn = screen.getByRole("button", { name: /^delete$/i });
    expect(confirmBtn).toHaveClass("bg-destructive");
  });

  it("renders with icon trigger", async () => {
    const user = userEvent.setup();

    render(
      <ConfirmationDialog
        trigger={
          <Button variant="ghost" size="icon" aria-label="Delete stakeholder">
            <Trash2 className="h-4 w-4" />
          </Button>
        }
        title="Delete Stakeholder"
        description="This will remove them from the cap table."
        onConfirm={vi.fn()}
      />
    );

    const trigger = screen.getByRole("button", { name: /delete stakeholder/i });
    expect(trigger).toBeInTheDocument();

    await user.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
    expect(screen.getByText("Delete Stakeholder")).toBeInTheDocument();
  });

  it("closes dialog after confirm action completes", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(
      <ConfirmationDialog
        trigger={<Button>Delete</Button>}
        title="Confirm"
        description="Proceed?"
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /continue/i }));

    // Dialog should close after confirm
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
  });
});
