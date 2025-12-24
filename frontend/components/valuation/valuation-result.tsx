"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/format-utils";
import type { FrontendValuationResult } from "@/lib/schemas";
import { AnimatedCurrencyDisplay, AnimatedPercentage, AnimatedProgress } from "@/lib/motion";

interface ValuationResultProps {
  result: FrontendValuationResult;
}

const methodLabels: Record<string, string> = {
  revenue_multiple: "Revenue Multiple",
  dcf: "DCF (Discounted Cash Flow)",
  vc_method: "VC Method",
};

const confidenceColors: Record<string, string> = {
  low: "text-destructive",
  medium: "text-amber-500",
  high: "text-terminal",
};

function getConfidenceLevel(confidence: number): "low" | "medium" | "high" {
  if (confidence < 0.5) return "low";
  if (confidence < 0.75) return "medium";
  return "high";
}

export function ValuationResult({ result }: ValuationResultProps) {
  const confidenceLevel = getConfidenceLevel(result.confidence);
  const confidencePercent = Math.round(result.confidence * 100);

  return (
    <Card className="border-0 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_2px_8px_rgba(0,0,0,0.04)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            {methodLabels[result.method] || result.method}
          </CardTitle>
          <Badge variant="outline" className={`text-xs ${confidenceColors[confidenceLevel]}`}>
            <AnimatedPercentage value={confidencePercent} decimals={0} /> confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-muted-foreground mb-1 text-xs tracking-wide uppercase">Valuation</p>
          <p className="text-3xl font-semibold tabular-nums">
            <AnimatedCurrencyDisplay value={result.valuation} showDelta={false} />
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <span className={confidenceColors[confidenceLevel]}>
              {confidenceLevel.charAt(0).toUpperCase() + confidenceLevel.slice(1)}
            </span>
          </div>
          <AnimatedProgress
            value={confidencePercent}
            className="bg-muted h-2 overflow-hidden rounded-full"
            barClassName="bg-primary h-full rounded-full"
          />
        </div>

        {result.notes && (
          <div className="text-muted-foreground bg-muted/50 flex items-start gap-2 rounded-lg p-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{result.notes}</span>
          </div>
        )}

        {Object.keys(result.inputs).length > 0 && (
          <div className="border-border border-t pt-2">
            <div className="mb-2 flex items-center gap-1">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                Calculation Inputs
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Key inputs used in the calculation</TooltipContent>
              </Tooltip>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(result.inputs)
                .slice(0, 6)
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="font-medium tabular-nums">
                      {typeof value === "number"
                        ? value >= 1000
                          ? formatCurrency(value)
                          : value.toLocaleString()
                        : String(value)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
