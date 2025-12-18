"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type ErrorType = "network" | "validation" | "calculation" | "generic";

interface ErrorCardProps {
  /** Custom title for the error card */
  title?: string;
  /** Main error message to display */
  message: string;
  /** Technical error details (stack trace, etc.) */
  errorDetails?: string;
  /** Type of error for context-specific suggestions */
  errorType?: ErrorType;
  /** Custom suggestions to display */
  suggestions?: string[];
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Custom label for retry button */
  retryLabel?: string;
  /** Whether retry is in progress */
  isRetrying?: boolean;
  /** Whether to show a toggle for error details */
  showDetailsToggle?: boolean;
  /** Additional className for the card */
  className?: string;
}

const ERROR_SUGGESTIONS: Record<ErrorType, string[]> = {
  network: [
    "Server is temporarily unavailable",
    "Network connection was interrupted",
    "Try checking your internet connection",
  ],
  validation: [
    "Check your input values for errors",
    "Ensure all required fields are filled",
    "Verify numeric values are within valid ranges",
  ],
  calculation: [
    "Unexpected values in the calculation",
    "Try adjusting your input parameters",
    "Some values may be outside the expected range",
  ],
  generic: [
    "Server is temporarily unavailable",
    "Network connection was interrupted",
  ],
};

export function ErrorCard({
  title = "Something went wrong",
  message,
  errorDetails,
  errorType,
  suggestions,
  onRetry,
  retryLabel,
  isRetrying = false,
  showDetailsToggle = false,
  className,
}: ErrorCardProps) {
  const [copied, setCopied] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);

  // Get suggestions based on error type or use custom suggestions
  const displaySuggestions = suggestions || ERROR_SUGGESTIONS[errorType || "generic"];

  const handleCopyError = React.useCallback(async () => {
    const textToCopy = errorDetails
      ? `Error: ${message}\n\nDetails:\n${errorDetails}`
      : `Error: ${message}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy error details:", err);
    }
  }, [message, errorDetails]);

  const getRetryButtonLabel = () => {
    if (isRetrying) return "Trying...";
    return retryLabel || "Try Again";
  };

  return (
    <Card
      data-slot="card"
      className={cn(
        "terminal-card border-destructive/30 animate-scale-in",
        className
      )}
    >
      <CardContent className="py-8">
        <div role="alert" className="flex flex-col items-center gap-4 max-w-md mx-auto text-center">
          {/* Error Icon */}
          <AlertTriangle className="h-10 w-10 text-destructive" aria-hidden="true" />

          {/* Title */}
          <h3 className="text-lg font-medium text-foreground">{title}</h3>

          {/* Message */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {message}
          </p>

          {/* Suggestions */}
          <div className="w-full text-left space-y-2 mt-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              This usually happens when:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              {displaySuggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-destructive/60 mt-1" aria-hidden="true">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Error Details Toggle */}
          {showDetailsToggle && errorDetails && (
            <div className="w-full">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-muted-foreground"
                aria-expanded={showDetails}
                aria-controls="error-details"
              >
                {showDetails ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Hide Details
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Show Details
                  </>
                )}
              </Button>
              {showDetails && (
                <pre
                  id="error-details"
                  className="mt-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground overflow-auto max-h-40 text-left font-mono"
                >
                  {errorDetails}
                </pre>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 mt-4">
            {onRetry && (
              <Button
                onClick={onRetry}
                disabled={isRetrying}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRetrying && "animate-spin")} />
                {getRetryButtonLabel()}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={handleCopyError}
              className="gap-2"
              aria-label="Copy error details"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Error Details
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
