"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface InfoTooltipProps {
  /** The tooltip content - can be a string or React node */
  content: React.ReactNode;
  /** Optional side for the tooltip (default: top) */
  side?: "top" | "right" | "bottom" | "left";
  /** Optional custom icon size */
  iconSize?: number;
  /** Optional custom class for the icon */
  iconClassName?: string;
  /** Optional delay before showing tooltip (ms) */
  delayDuration?: number;
}

/**
 * Info tooltip component that shows a help icon with explanatory content on hover.
 * Used to provide contextual help for complex financial terms and form fields.
 *
 * @example
 * <Label>
 *   Exit Valuation <InfoTooltip content="The expected company value at exit" />
 * </Label>
 */
export function InfoTooltip({
  content,
  side = "top",
  iconSize = 14,
  iconClassName,
  delayDuration = 200,
}: InfoTooltipProps) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            "text-muted-foreground hover:text-foreground",
            "focus-visible:ring-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
            "-mt-0.5 ml-1 align-middle transition-colors"
          )}
          aria-label="More information"
        >
          <Info
            size={iconSize}
            className={cn("opacity-70 transition-opacity hover:opacity-100", iconClassName)}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs text-sm leading-relaxed">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

interface LabelWithTooltipProps {
  children: React.ReactNode;
  /** Tooltip content - can be a string or React node */
  tooltip: React.ReactNode;
  className?: string;
  /** For label elements - associates with form input */
  htmlFor?: string;
  /** Element type to render (default: "label") */
  as?: "label" | "span" | "div";
}

/**
 * Label with integrated info tooltip.
 * Convenience component for labels that need contextual help.
 *
 * Use `as="span"` or `as="div"` for non-form contexts (e.g., card headers).
 *
 * @example
 * // Form label (default)
 * <LabelWithTooltip tooltip="Explanation text" htmlFor="my-input">
 *   Field Label
 * </LabelWithTooltip>
 *
 * // Non-form context (e.g., metric card header)
 * <LabelWithTooltip tooltip="Help text" as="span">
 *   <ResponsiveText full="Full Label" short="Short" />
 * </LabelWithTooltip>
 */
export function LabelWithTooltip({
  children,
  tooltip,
  className,
  htmlFor,
  as: Component = "label",
}: LabelWithTooltipProps) {
  const baseClasses = cn(
    "text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    "flex items-center gap-1",
    className
  );

  // Only pass htmlFor to label elements
  const labelProps = Component === "label" ? { htmlFor } : {};

  return (
    <Component className={baseClasses} {...labelProps}>
      {children}
      <InfoTooltip content={tooltip} />
    </Component>
  );
}
