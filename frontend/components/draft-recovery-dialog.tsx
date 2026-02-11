"use client";

/** Time conversion constants */
const TIME = {
  MS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  MINUTES_THRESHOLD_2H: 120,
  MINUTES_PER_DAY: 1440,
} as const;

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { DraftData } from "@/lib/hooks/use-draft-auto-save";
import { formatCurrency } from "@/lib/format-utils";

interface DraftRecoveryDialogProps {
  open: boolean;
  draft: DraftData;
  onRestore: () => void;
  onDiscard: () => void;
}

/**
 * Calculate relative time string from ISO date
 */
function getRelativeTime(isoDate: string): string {
  const savedDate = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - savedDate.getTime();
  const diffMinutes = Math.floor(diffMs / (TIME.MS_PER_SECOND * TIME.SECONDS_PER_MINUTE));

  if (diffMinutes < 1) {
    return "just now";
  } else if (diffMinutes === 1) {
    return "1 minute ago";
  } else if (diffMinutes < TIME.MINUTES_PER_HOUR) {
    return `${diffMinutes} minutes ago`;
  } else if (diffMinutes < TIME.MINUTES_THRESHOLD_2H) {
    return "1 hour ago";
  } else if (diffMinutes < TIME.MINUTES_PER_DAY) {
    const hours = Math.floor(diffMinutes / TIME.MINUTES_PER_HOUR);
    return `${hours} hours ago`;
  } else {
    const days = Math.floor(diffMinutes / TIME.MINUTES_PER_DAY);
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }
}

/**
 * Dialog to prompt user to restore or discard saved draft
 */
export function DraftRecoveryDialog({
  open,
  draft,
  onRestore,
  onDiscard,
}: DraftRecoveryDialogProps) {
  const { data, savedAt } = draft;
  const relativeTime = getRelativeTime(savedAt);

  // Build summary of saved data
  const summaryItems: string[] = [];

  if (data.globalSettings?.exit_year) {
    summaryItems.push(`Exit Year: ${data.globalSettings.exit_year}`);
  }

  if (data.currentJob?.monthly_salary) {
    summaryItems.push(`Current Salary: ${formatCurrency(data.currentJob.monthly_salary)}/mo`);
  }

  if (data.equityDetails) {
    if ("equity_type" in data.equityDetails) {
      if (
        data.equityDetails.equity_type === "RSU" &&
        "total_equity_grant_pct" in data.equityDetails
      ) {
        const pct = data.equityDetails.total_equity_grant_pct;
        if (pct !== undefined) {
          summaryItems.push(`Equity: ${pct}%`);
        }
      } else if (
        data.equityDetails.equity_type === "STOCK_OPTIONS" &&
        "num_options" in data.equityDetails
      ) {
        const numOptions = data.equityDetails.num_options;
        if (numOptions !== undefined) {
          summaryItems.push(`${numOptions.toLocaleString()} options`);
        }
      }
    }
  }

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Resume where you left off?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-muted-foreground">Found unsaved work from {relativeTime}.</p>
              {summaryItems.length > 0 && (
                <div className="bg-muted/50 space-y-1 rounded-lg p-3 text-sm tabular-nums">
                  {summaryItems.map((item, index) => (
                    <p key={index} className="text-foreground">
                      {item}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDiscard}>Discard</AlertDialogCancel>
          <AlertDialogAction onClick={onRestore}>Restore Draft</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
