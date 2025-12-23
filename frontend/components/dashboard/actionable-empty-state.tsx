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
    <div className="space-y-6 max-w-md mx-auto">
      <AlertCircle className="h-12 w-12 text-accent/40 mx-auto" />
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-foreground">
          Complete Equity Details
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed font-mono">
          Please fill in all equity fields in the Startup Offer form. Enter
          values greater than zero for:
          <span className="block mt-2">{requiredFields}</span>
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          variant="default"
          size="sm"
          className="gap-2 flex-1"
          onClick={onLoadExample}
        >
          <ClipboardList className="h-4 w-4" />
          Load Example
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 flex-1"
          onClick={onFocusMissingField}
        >
          <Focus className="h-4 w-4" />
          Focus Missing Field
        </Button>
      </div>
    </div>
  );
}
