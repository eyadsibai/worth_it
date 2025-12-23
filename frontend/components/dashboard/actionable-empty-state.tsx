"use client";

import * as React from "react";
import { AlertCircle, ClipboardList, Focus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActionableEmptyStateProps {
  /** The current equity type to show relevant field hints */
  equityType: "RSU" | "STOCK_OPTIONS";
  /** Callback to load an example scenario */
  onLoadExample: () => void;
  /** Callback to focus the first missing field */
  onFocusMissingField: () => void;
}

/**
 * Actionable empty state component for the employee dashboard.
 * Shows when equity data is incomplete and provides quick actions:
 * - Load Example: Loads a pre-configured example scenario
 * - Focus Missing Field: Scrolls to and focuses the first invalid input
 */
export function ActionableEmptyState({
  equityType,
  onLoadExample,
  onFocusMissingField,
}: ActionableEmptyStateProps) {
  const requiredFields =
    equityType === "STOCK_OPTIONS"
      ? "Number of Options, Strike Price, Exit Price Per Share, and Monthly Salary"
      : "Total Equity Grant %, Exit Valuation, and Monthly Salary";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <AlertCircle className="text-accent/40 mx-auto h-12 w-12" />
      <div className="space-y-3">
        <h3 className="text-foreground text-lg font-medium">Complete Equity Details</h3>
        <p className="text-muted-foreground font-mono text-sm leading-relaxed">
          Please fill in all equity fields in the Startup Offer form. Enter values greater than zero
          for:
          <span className="mt-2 block">{requiredFields}</span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button variant="default" size="sm" className="flex-1 gap-2" onClick={onLoadExample}>
          <ClipboardList className="h-4 w-4" />
          Load Example
        </Button>
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={onFocusMissingField}>
          <Focus className="h-4 w-4" />
          Focus Missing Field
        </Button>
      </div>
    </div>
  );
}
