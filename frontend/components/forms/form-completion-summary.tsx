"use client";

import * as React from "react";
import { Check, X, AlertTriangle, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FormStatus, SectionStatus } from "@/lib/hooks/use-form-status";

interface FormCompletionSummaryProps {
  status: FormStatus;
  className?: string;
  defaultExpanded?: boolean;
}

/**
 * Get the icon and styling for a section status
 */
function getStatusIcon(status: SectionStatus) {
  switch (status) {
    case "complete":
      return {
        icon: Check,
        className: "text-chart-3",
        label: "Complete",
      };
    case "has_warnings":
      return {
        icon: AlertTriangle,
        className: "text-amber-500",
        label: "Has warnings",
      };
    case "incomplete":
      return {
        icon: X,
        className: "text-destructive",
        label: "Incomplete",
      };
    case "not_started":
    default:
      return {
        icon: Circle,
        className: "text-muted-foreground",
        label: "Not started",
      };
  }
}

/**
 * Summary component showing form completion status across multiple sections.
 * Collapsible to show condensed or detailed view.
 */
export function FormCompletionSummary({
  status,
  className,
  defaultExpanded = false,
}: FormCompletionSummaryProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  const sectionNames = Object.keys(status.sections);

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3 text-sm",
        className
      )}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-medium text-muted-foreground">Form Status</span>
          {status.isAllComplete ? (
            <Check className="h-4 w-4 text-chart-3" aria-label="All complete" />
          ) : status.sectionsWithErrors > 0 ? (
            <X className="h-4 w-4 text-destructive" aria-label="Has errors" />
          ) : status.sectionsWithWarnings > 0 ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Has warnings" />
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{status.summaryText}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && sectionNames.length > 0 && (
        <div className="mt-3 space-y-2 border-t pt-3">
          {sectionNames.map((name) => {
            const section = status.sections[name];
            const { icon: Icon, className: iconClass, label } = getStatusIcon(section.status);

            return (
              <div key={name} className="flex items-start gap-2">
                <Icon
                  className={cn("h-4 w-4 mt-0.5 flex-shrink-0", iconClass)}
                  aria-label={label}
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{name}</span>
                  {section.firstError && section.status === "incomplete" && (
                    <p className="text-destructive text-xs mt-0.5 truncate">
                      {section.firstError}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
