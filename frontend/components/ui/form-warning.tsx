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
        "flex items-start gap-1.5 text-sm text-amber-600 dark:text-amber-500 animate-in fade-in duration-200",
        className
      )}
    >
      <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <span>{children}</span>
    </p>
  );
}
