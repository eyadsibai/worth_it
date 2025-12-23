"use client";

/**
 * Timeline Event Filters Component (#228)
 *
 * Toggle chips for filtering which event types to display.
 * Persists filter preferences to localStorage.
 */

import { useCallback, useEffect, useState } from "react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AppMode } from "@/lib/store";
import type { TimelineFilterState } from "./types";
import {
  TIMELINE_FILTER_STORAGE_KEY,
  DEFAULT_FOUNDER_FILTERS,
  DEFAULT_EMPLOYEE_FILTERS,
} from "./types";

// ============================================================================
// Filter Configuration
// ============================================================================

interface FilterOption {
  key: keyof TimelineFilterState;
  label: string;
  mode: "founder" | "employee";
}

const FILTER_OPTIONS: FilterOption[] = [
  // Founder mode filters
  { key: "fundingRound", label: "Funding", mode: "founder" },
  { key: "stakeholderAdded", label: "Added", mode: "founder" },
  { key: "stakeholderRemoved", label: "Removed", mode: "founder" },
  { key: "optionPoolChange", label: "Pool", mode: "founder" },
  { key: "instrumentConverted", label: "Converted", mode: "founder" },
  // Employee mode filters
  { key: "grantDate", label: "Grant", mode: "employee" },
  { key: "cliffDate", label: "Cliff", mode: "employee" },
  { key: "vestingMilestone", label: "Vesting", mode: "employee" },
  { key: "exerciseDeadline", label: "Deadline", mode: "employee" },
];

// ============================================================================
// Hook: useTimelineFilters
// ============================================================================

const getDefaultFilters = (mode: AppMode): TimelineFilterState => ({
  fundingRound: true,
  stakeholderAdded: true,
  stakeholderRemoved: true,
  optionPoolChange: true,
  instrumentConverted: true,
  grantDate: true,
  cliffDate: true,
  vestingMilestone: true,
  exerciseDeadline: true,
  ...(mode === "founder" ? DEFAULT_FOUNDER_FILTERS : DEFAULT_EMPLOYEE_FILTERS),
});

export function useTimelineFilters(mode: AppMode) {
  // Use lazy initialization to load from localStorage synchronously
  const [filters, setFilters] = useState<TimelineFilterState>(() => {
    const defaults = getDefaultFilters(mode);

    // Only run in browser (not during SSR)
    if (typeof window === "undefined") return defaults;

    try {
      const stored = localStorage.getItem(TIMELINE_FILTER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<TimelineFilterState>;
        return { ...defaults, ...parsed };
      }
    } catch {
      // Use defaults on error
    }

    return defaults;
  });

  // Save to localStorage on change
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(TIMELINE_FILTER_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // Ignore storage errors
    }
  }, [filters]);

  const toggleFilter = useCallback((key: keyof TimelineFilterState) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const showAll = useCallback(() => {
    setFilters(getDefaultFilters(mode));
  }, [mode]);

  const hideAll = useCallback(() => {
    const hidden: TimelineFilterState = {
      fundingRound: false,
      stakeholderAdded: false,
      stakeholderRemoved: false,
      optionPoolChange: false,
      instrumentConverted: false,
      grantDate: false,
      cliffDate: false,
      vestingMilestone: false,
      exerciseDeadline: false,
    };
    setFilters(hidden);
  }, []);

  return {
    filters,
    toggleFilter,
    showAll,
    hideAll,
  };
}

// ============================================================================
// Component
// ============================================================================

interface TimelineEventFiltersProps {
  mode: AppMode;
  filters: TimelineFilterState;
  onToggleFilter: (key: keyof TimelineFilterState) => void;
  onShowAll: () => void;
  onHideAll: () => void;
}

export function TimelineEventFilters({
  mode,
  filters,
  onToggleFilter,
  onShowAll,
  onHideAll,
}: TimelineEventFiltersProps) {
  // Filter options for current mode
  const options = FILTER_OPTIONS.filter((opt) => opt.mode === mode);

  // Count active filters
  const activeCount = options.filter((opt) => filters[opt.key]).length;
  const allActive = activeCount === options.length;
  const noneActive = activeCount === 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground mr-1 text-xs tracking-wide uppercase">Show:</span>

      {/* Filter toggles */}
      {options.map((option) => (
        <Toggle
          key={option.key}
          pressed={filters[option.key]}
          onPressedChange={() => onToggleFilter(option.key)}
          size="sm"
          className={cn(
            "h-7 rounded-full px-3 text-xs",
            filters[option.key]
              ? "bg-primary/10 text-primary hover:bg-primary/20"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
          aria-label={`${filters[option.key] ? "Hide" : "Show"} ${option.label} events`}
        >
          {option.label}
        </Toggle>
      ))}

      {/* Quick actions */}
      <div className="ml-2 flex items-center gap-1 border-l pl-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowAll}
          disabled={allActive}
          className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
        >
          All
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onHideAll}
          disabled={noneActive}
          className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
        >
          None
        </Button>
      </div>
    </div>
  );
}
