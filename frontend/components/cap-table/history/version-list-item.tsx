"use client";

import { FORMATTING } from "@/lib/constants";
import { Clock, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CapTableVersion } from "./types";

interface VersionListItemProps {
  version: CapTableVersion;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

/**
 * Format timestamp as relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMinutes = Math.floor(diffMs / (FORMATTING.MS_PER_SECOND * FORMATTING.SECONDS_PER_MINUTE));
  const diffHours = Math.floor(diffMs / (FORMATTING.MS_PER_SECOND * FORMATTING.SECONDS_PER_MINUTE * FORMATTING.MINUTES_PER_HOUR));
  const diffDays = Math.floor(diffMs / (FORMATTING.MS_PER_SECOND * FORMATTING.SECONDS_PER_MINUTE * FORMATTING.MINUTES_PER_HOUR * FORMATTING.HOURS_PER_DAY));

  if (diffMinutes < 1) {
    return "Just now";
  } else if (diffMinutes < FORMATTING.MINUTES_PER_HOUR) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < FORMATTING.HOURS_PER_DAY) {
    return `${diffHours}h ago`;
  } else if (diffDays < FORMATTING.DAYS_PER_WEEK) {
    return `${diffDays}d ago`;
  } else {
    return new Date(timestamp).toLocaleDateString();
  }
}

/**
 * Format timestamp as full date/time
 */
function formatFullDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function VersionListItem({
  version,
  isSelected,
  onSelect,
  onRestore,
  onDelete,
}: VersionListItemProps) {
  return (
    <div
      className={cn(
        "group relative cursor-pointer rounded-xl p-4 transition-all",
        "hover:border-primary/20 border",
        isSelected
          ? "bg-primary/5 border-primary/30"
          : "bg-card hover:bg-muted/50 border-transparent"
      )}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* Time indicator */}
      <div className="text-muted-foreground mb-2 flex items-center gap-2 text-xs">
        <Clock className="h-3.5 w-3.5" />
        <span title={formatFullDateTime(version.timestamp)}>
          {formatRelativeTime(version.timestamp)}
        </span>
      </div>

      {/* Description */}
      <p className="text-foreground line-clamp-2 text-sm font-medium">{version.description}</p>

      {/* Action buttons - visible on hover or when selected */}
      <div
        className={cn(
          "absolute top-2 right-2 flex gap-1 transition-opacity",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onRestore();
          }}
          title="Restore this version"
          aria-label="Restore this version"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete this version"
          aria-label="Delete this version"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
