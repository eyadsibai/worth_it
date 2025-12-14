"use client";

import * as React from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "transition-colors ml-1 -mt-0.5 align-middle"
          )}
          aria-label="More information"
        >
          <Info
            size={iconSize}
            className={cn("opacity-70 hover:opacity-100 transition-opacity", iconClassName)}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-xs text-sm leading-relaxed"
      >
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Label with integrated info tooltip.
 * Convenience component for form labels that need contextual help.
 *
 * @example
 * <LabelWithTooltip tooltip="Explanation text">Field Label</LabelWithTooltip>
 */
export function LabelWithTooltip({
  children,
  tooltip,
  className,
  htmlFor,
}: {
  children: React.ReactNode;
  tooltip: string;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        "flex items-center gap-1",
        className
      )}
    >
      {children}
      <InfoTooltip content={tooltip} />
    </label>
  );
}
