import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface MetricCardProps {
  children: React.ReactNode;
  className?: string;
}

interface MetricCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface MetricCardContentProps {
  children: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}

/**
 * MetricCard - Card shell wrapper for metrics display.
 *
 * Provides consistent styling for metric cards used in dashboards
 * and result displays. Uses the terminal-card pattern.
 *
 * @example
 * <MetricCard>
 *   <MetricCardHeader>Net Benefit</MetricCardHeader>
 *   <MetricCardContent subtitle="Worth it!">
 *     <AnimatedCurrencyDisplay value={125000} />
 *   </MetricCardContent>
 * </MetricCard>
 */
export function MetricCard({ children, className }: MetricCardProps) {
  return <Card className={cn("terminal-card h-full overflow-hidden", className)}>{children}</Card>;
}

/**
 * MetricCardHeader - Header section with label styling.
 *
 * Wraps content in CardDescription with data-label styling
 * for consistent uppercase muted labels.
 */
export function MetricCardHeader({ children, className }: MetricCardHeaderProps) {
  return (
    <CardHeader className={cn("px-4 pt-4 pb-2", className)}>
      <CardDescription className="data-label text-xs">{children}</CardDescription>
    </CardHeader>
  );
}

/**
 * MetricCardContent - Content section with value and optional subtitle.
 *
 * Displays the main metric value with CardTitle styling and an
 * optional subtitle below.
 */
export function MetricCardContent({ children, subtitle, className }: MetricCardContentProps) {
  return (
    <CardContent className={cn("px-4 pb-4", className)}>
      <CardTitle className="text-lg font-semibold tracking-tight lg:text-xl">{children}</CardTitle>
      {subtitle && <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">{subtitle}</p>}
    </CardContent>
  );
}
