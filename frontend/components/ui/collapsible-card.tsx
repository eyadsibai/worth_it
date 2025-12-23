"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  /** Card title displayed in header */
  title: React.ReactNode;
  /** Optional description below title */
  description?: React.ReactNode;
  /** Card content that can be collapsed */
  children: React.ReactNode;
  /** Additional className for the card container */
  className?: string;
  /** Whether the card can be collapsed (default: true) */
  collapsible?: boolean;
  /** Whether the card starts open (default: true) */
  defaultOpen?: boolean;
  /** Controlled open state */
  open?: boolean;
  /** Callback when open state changes */
  onOpenChange?: (open: boolean) => void;
  /** Color accent for the left border (matches form card patterns) */
  accentColor?: "primary" | "chart-3" | "chart-1" | "chart-2" | "accent";
  /** Optional icon to show before title */
  icon?: React.ReactNode;
  /** Data attribute for testing/tours */
  dataTour?: string;
}

/**
 * CollapsibleCard - A card component with collapsible content.
 *
 * Wraps the Radix Collapsible primitive with the terminal-card styling pattern.
 * Click the header to expand/collapse the content.
 */
export function CollapsibleCard({
  title,
  description,
  children,
  className,
  collapsible = true,
  defaultOpen = true,
  open,
  onOpenChange,
  accentColor = "primary",
  icon,
  dataTour,
}: CollapsibleCardProps) {
  const accentColorMap = {
    primary: "border-l-primary/50",
    "chart-1": "border-l-chart-1/60",
    "chart-2": "border-l-chart-2/60",
    "chart-3": "border-l-chart-3/60",
    accent: "border-l-accent/60",
  };

  const dotColorMap = {
    primary: "bg-primary",
    "chart-1": "bg-chart-1",
    "chart-2": "bg-chart-2",
    "chart-3": "bg-chart-3",
    accent: "bg-accent",
  };

  const cardClassName = cn(
    "terminal-card animate-slide-up border-l-4",
    accentColorMap[accentColor],
    className
  );

  const headerContent = (
    <div className="space-y-1.5">
      <div className="text-lg font-semibold flex items-center gap-2">
        {icon ?? <div className={cn("h-2 w-2 rounded-full", dotColorMap[accentColor])} />}
        {title}
      </div>
      {description && (
        <div className="text-sm text-muted-foreground">{description}</div>
      )}
    </div>
  );

  // Non-collapsible static card
  if (!collapsible) {
    return (
      <div className={cardClassName} data-tour={dataTour}>
        <div className="px-6 pt-6 pb-4">
          {headerContent}
        </div>
        <div className="px-6 pb-6">
          {children}
        </div>
      </div>
    );
  }

  // Collapsible card (default)
  return (
    <Collapsible
      defaultOpen={defaultOpen}
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className={cardClassName} data-tour={dataTour}>
        {/* Clickable Header */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="group w-full px-6 pt-6 pb-4 text-left flex items-center justify-between hover:bg-muted/30 transition-colors rounded-t-2xl"
          >
            {headerContent}
            <ChevronDown
              className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-data-[state=closed]:rotate-[-90deg]"
              aria-hidden="true"
            />
          </button>
        </CollapsibleTrigger>

        {/* Collapsible Content */}
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="px-6 pb-6">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
