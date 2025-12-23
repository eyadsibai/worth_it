"use client";

import * as React from "react";
import { Scale, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppMode } from "@/lib/store";

interface ModeToggleProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const MODE_CONFIG = {
  employee: {
    icon: Scale,
    label: "Analyze Offer",
    shortLabel: "Analyze",
  },
  founder: {
    icon: PieChart,
    label: "Model Cap Table",
    shortLabel: "Cap Table",
  },
} as const;

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div
      className="bg-muted/50 border-border/50 inline-flex rounded-xl border p-1"
      role="tablist"
      aria-label="Application mode"
      data-tour="cap-table-nav"
    >
      {(["employee", "founder"] as const).map((modeKey) => {
        const config = MODE_CONFIG[modeKey];
        const Icon = config.icon;
        const isActive = mode === modeKey;

        return (
          <button
            key={modeKey}
            role="tab"
            aria-selected={isActive}
            onClick={() => onModeChange(modeKey)}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium",
              "transition-all duration-200 ease-out",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            />
            <span className="hidden sm:inline">{config.label}</span>
            <span className="sm:hidden">{config.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
