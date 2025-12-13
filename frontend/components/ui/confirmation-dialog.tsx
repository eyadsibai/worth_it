"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmationDialogProps {
  /**
   * The element that triggers the dialog when clicked
   */
  trigger: React.ReactNode;

  /**
   * Dialog title shown in the header
   */
  title: string;

  /**
   * Description text explaining what will happen
   */
  description: string;

  /**
   * Callback when user confirms the action
   */
  onConfirm: () => void;

  /**
   * Label for the confirm button (default: "Continue")
   */
  confirmLabel?: string;

  /**
   * Label for the cancel button (default: "Cancel")
   */
  cancelLabel?: string;

  /**
   * Visual variant for the confirm button
   * - "default": Primary button style
   * - "destructive": Red/danger button style for delete actions
   */
  variant?: "default" | "destructive";
}

/**
 * Reusable confirmation dialog for destructive actions.
 *
 * Wraps AlertDialog from shadcn/ui with a simpler API focused on
 * confirmation workflows (delete, remove, clear, etc.)
 *
 * @example
 * ```tsx
 * <ConfirmationDialog
 *   trigger={<Button variant="ghost"><Trash2 /></Button>}
 *   title="Delete stakeholder?"
 *   description="This will remove John from the cap table."
 *   confirmLabel="Delete"
 *   variant="destructive"
 *   onConfirm={() => handleDelete(id)}
 * />
 * ```
 */
export function ConfirmationDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmLabel = "Continue",
  cancelLabel = "Cancel",
  variant = "default",
}: ConfirmationDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              variant === "destructive" &&
                buttonVariants({ variant: "destructive" })
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
