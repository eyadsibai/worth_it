import * as React from "react";
import { cn } from "@/lib/utils";

export interface InformationBoxProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Section title displayed at the top */
  title?: string;
  /** Optional description below the title */
  description?: string;
  /** Background variant: muted, gradient, or default (white) */
  variant?: "default" | "muted" | "gradient";
  /** Accent color for the title dot indicator */
  accentColor?: "primary" | "chart-1" | "chart-2" | "chart-3" | "accent";
  /** Inner spacing variant */
  spacing?: "default" | "compact";
  /** Remove border for use inside already-bordered containers */
  borderless?: boolean;
}

const accentColorMap = {
  primary: "bg-primary",
  "chart-1": "bg-chart-1",
  "chart-2": "bg-chart-2",
  "chart-3": "bg-chart-3",
  accent: "bg-accent",
};

const variantClassMap = {
  default: "bg-background",
  muted: "bg-muted/50 dark:bg-muted/30",
  gradient: "bg-gradient-to-br from-muted/30 to-muted/50 dark:from-muted/20 dark:to-muted/40",
};

/**
 * InformationBox - A styled container for grouping related form fields or content.
 *
 * Consolidates the common `p-4 border rounded-lg bg-muted/50` pattern used throughout
 * the application, with support for titles, descriptions, and accent colors.
 *
 * @example
 * // Basic usage
 * <InformationBox title="Settings">
 *   <SliderField ... />
 * </InformationBox>
 *
 * @example
 * // With accent color and description
 * <InformationBox
 *   title="Salary Surplus Investment"
 *   description="If your startup salary is lower, the difference will be invested"
 *   variant="gradient"
 *   accentColor="chart-3"
 * >
 *   <SliderField ... />
 * </InformationBox>
 */
export function InformationBox({
  children,
  className,
  title,
  description,
  variant = "muted",
  accentColor,
  spacing = "default",
  borderless = false,
  ...props
}: InformationBoxProps) {
  return (
    <div
      className={cn(
        "rounded-lg",
        !borderless && "border-border border",
        spacing === "compact" ? "p-3" : "p-4",
        variantClassMap[variant],
        className
      )}
      {...props}
    >
      {(title || description) && (
        <div className={cn("space-y-1", children ? "mb-4" : "")}>
          {title && (
            <h4 className="flex items-center gap-2 text-sm font-semibold">
              {accentColor && (
                <div className={cn("h-1.5 w-1.5 rounded-full", accentColorMap[accentColor])} />
              )}
              {title}
            </h4>
          )}
          {description && (
            <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
