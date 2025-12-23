"use client";

import * as React from "react";
import { FileText, BarChart2, Save, MoreHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMobileViewSafe, type MobileView } from "@/lib/hooks";

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  /** Show a badge indicator (dot) */
  showBadge?: boolean;
  /** Badge is pulsing (e.g., calculating) */
  badgePulsing?: boolean;
}

function NavItem({
  icon: Icon,
  label,
  onClick,
  isActive = false,
  showBadge = false,
  badgePulsing = false,
}: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={isActive ? "true" : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex min-w-[64px] flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-colors",
        "focus-visible:ring-accent focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
      )}
    >
      <div className="relative">
        <Icon className="h-5 w-5" />
        {showBadge && (
          <span
            className={cn(
              "bg-accent absolute -top-1 -right-1 h-2 w-2 rounded-full",
              badgePulsing && "animate-pulse"
            )}
            aria-label={badgePulsing ? "Calculating" : "Results updated"}
          />
        )}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

interface BottomNavProps {
  /** Callback when Save is clicked */
  onSaveClick: () => void;
  /** Callback when More is clicked */
  onMoreClick: () => void;
}

/**
 * Mobile bottom navigation bar.
 * Uses MobileViewContext to toggle between Inputs and Results views.
 * Shows a badge on Results when calculations are running or results are outdated.
 */
export function BottomNav({ onSaveClick, onMoreClick }: BottomNavProps) {
  const mobileView = useMobileViewSafe();

  // Fallback handlers for when context is not available
  const handleFormsClick = React.useCallback(() => {
    if (mobileView) {
      mobileView.setActiveView("inputs");
    } else {
      // Fallback: scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [mobileView]);

  const handleResultsClick = React.useCallback(() => {
    if (mobileView) {
      mobileView.setActiveView("results");
    } else {
      // Fallback: scroll to results area
      window.scrollTo({ top: window.innerHeight * 0.6, behavior: "smooth" });
    }
  }, [mobileView]);

  // Determine active state
  const activeView: MobileView | undefined = mobileView?.activeView;

  // Show badge when calculating or results are outdated
  const showResultsBadge = mobileView?.isCalculating || mobileView?.hasOutdatedResults;
  const badgePulsing = mobileView?.isCalculating ?? false;

  return (
    <nav
      data-testid="bottom-nav"
      data-bottom-nav
      aria-label="Mobile navigation"
      className="bg-card border-border/50 pb-safe no-print fixed right-0 bottom-0 left-0 z-50 border-t md:hidden"
    >
      <div className="flex justify-around py-2">
        <NavItem
          icon={FileText}
          label="Inputs"
          onClick={handleFormsClick}
          isActive={activeView === "inputs"}
        />
        <NavItem
          icon={BarChart2}
          label="Results"
          onClick={handleResultsClick}
          isActive={activeView === "results"}
          showBadge={showResultsBadge}
          badgePulsing={badgePulsing}
        />
        <NavItem icon={Save} label="Save" onClick={onSaveClick} />
        <NavItem icon={MoreHorizontal} label="More" onClick={onMoreClick} />
      </div>
    </nav>
  );
}

// Re-export MobileView type for consumers
export type { MobileView };
