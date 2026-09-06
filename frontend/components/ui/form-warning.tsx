import * as React from "react";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormWarningProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Warning message component for form fields.
 * Displays domain-aware warnings in amber/yellow styling.
 * Uses role="alert" and aria-live="polite" for accessibility.
 */
export function FormWarning({ children, className }: FormWarningProps) {
  if (!children) {
    return null;
  }

  return (
    <p
      role="alert"
      aria-live="polite"
      className={cn(
        // amber-700, not amber-600: on the white card background amber-600 lands
        // at 3.19:1 and fails WCAG 2 AA for body text. amber-700 clears 4.5:1
        // while still reading as amber.
        "animate-in fade-in flex items-start gap-1.5 text-sm text-amber-700 duration-200 dark:text-amber-500",
        className
      )}
    >
      <Lightbulb className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <span>{children}</span>
    </p>
  );
}
