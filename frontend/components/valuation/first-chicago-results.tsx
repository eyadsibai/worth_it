"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, Calculator, BarChart3 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency } from "@/lib/format-utils";
import type { FrontendFirstChicagoResult } from "@/lib/schemas";
import { AnimatedCurrencyDisplay } from "@/lib/motion";

interface FirstChicagoResultsProps {
  result: FrontendFirstChicagoResult;
}

export function FirstChicagoResults({ result }: FirstChicagoResultsProps) {
  const scenarioNames = Object.keys(result.scenarioValues);
  const hasMultipleScenarios = scenarioNames.length > 1;

  // Calculate the discount factor implied by the difference between weighted and present value
  const impliedDiscount =
    result.weightedValue > 0
      ? ((result.weightedValue - result.presentValue) / result.weightedValue) * 100
      : 0;

  return (
    <Card className="border-0 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_2px_8px_rgba(0,0,0,0.04)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-muted-foreground text-sm font-medium">
            First Chicago Method
          </CardTitle>
          <Badge variant="outline" className="text-terminal text-xs">
            <BarChart3 className="mr-1 h-3 w-3" />
            {scenarioNames.length} Scenarios
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Valuation */}
        <div>
          <div className="mb-1 flex items-center gap-1">
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Present Value</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                The probability-weighted exit value discounted to today&apos;s dollars. This is the
                fair value of the company today.
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-3xl font-semibold tabular-nums">
            <AnimatedCurrencyDisplay value={result.presentValue} showDelta={false} />
          </p>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="mb-1 flex items-center gap-1">
              <TrendingUp className="text-muted-foreground h-3 w-3" />
              <span className="text-muted-foreground text-xs">Weighted Value</span>
            </div>
            <p className="font-semibold tabular-nums">{formatCurrency(result.weightedValue)}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">Before discounting</p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3">
            <div className="mb-1 flex items-center gap-1">
              <Calculator className="text-muted-foreground h-3 w-3" />
              <span className="text-muted-foreground text-xs">Discount Impact</span>
            </div>
            <p className="text-destructive font-semibold tabular-nums">
              -{impliedDiscount.toFixed(1)}%
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">Time value adjustment</p>
          </div>
        </div>

        {/* Scenario Breakdown */}
        {hasMultipleScenarios && (
          <div className="border-border border-t pt-4">
            <div className="mb-3 flex items-center gap-1">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">
                Scenario Breakdown
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Individual scenario contributions weighted by probability and discounted to
                  present value.
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-2">
              {scenarioNames.map((name) => {
                const exitValue = result.scenarioValues[name];
                const presentValue = result.scenarioPresentValues[name];
                // Calculate contribution percentage to total present value
                const contributionPct =
                  result.presentValue > 0 ? (presentValue / result.presentValue) * 100 : 0;

                return (
                  <div
                    key={name}
                    className="bg-muted/30 flex items-center justify-between rounded-lg p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{name}</p>
                      <p className="text-muted-foreground text-xs">
                        Exit: {formatCurrency(exitValue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold tabular-nums">{formatCurrency(presentValue)}</p>
                      <p className="text-muted-foreground text-xs">
                        {contributionPct.toFixed(1)}% of total
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Method Note */}
        <div className="text-muted-foreground bg-muted/50 flex items-start gap-2 rounded-lg p-3 text-sm">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            The First Chicago Method values early-stage companies by weighting multiple exit
            scenarios by their probabilities and discounting to present value.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
