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
    <div className={cn("terminal-card-sm text-sm", className)}>
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-medium">Form Status</span>
          {status.isAllComplete ? (
            <Check className="text-chart-3 h-4 w-4" aria-label="All complete" />
          ) : status.sectionsWithErrors > 0 ? (
            <X className="text-destructive h-4 w-4" aria-label="Has errors" />
          ) : status.sectionsWithWarnings > 0 ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Has warnings" />
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{status.summaryText}</span>
          {isExpanded ? (
            <ChevronUp className="text-muted-foreground h-4 w-4" />
          ) : (
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {isExpanded && sectionNames.length > 0 && (
        <div className="border-border mt-3 space-y-2 border-t pt-3">
          {sectionNames.map((name) => {
            const section = status.sections[name];
            const { icon: Icon, className: iconClass, label } = getStatusIcon(section.status);

            return (
              <div key={name} className="flex items-start gap-2">
                <Icon
                  className={cn("mt-0.5 h-4 w-4 flex-shrink-0", iconClass)}
                  aria-label={label}
                />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">{name}</span>
                  {section.firstError && section.status === "incomplete" && (
                    <p className="text-destructive mt-0.5 truncate text-xs">{section.firstError}</p>
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
