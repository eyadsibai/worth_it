"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, RefreshCw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-utils";
import type { RSUForm, StockOptionsForm, StartupScenarioResponse } from "@/lib/schemas";
import { AnimatedCurrencyDisplay } from "@/lib/motion";

interface QuickAdjustPanelProps {
  equityDetails: RSUForm | StockOptionsForm;
  baseResults: StartupScenarioResponse;
  onAdjustedResultsChange: (results: StartupScenarioResponse | null) => void;
  defaultExpanded?: boolean;
  className?: string;
}

// Format large numbers with abbreviations
function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  } else if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(0)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(value);
}

export function QuickAdjustPanel({
  equityDetails,
  baseResults,
  onAdjustedResultsChange,
  defaultExpanded = false,
  className,
}: QuickAdjustPanelProps) {
  const isRSU = equityDetails.equity_type === "RSU";
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  // Track adjusted values - start with original values
  const [exitValuation, setExitValuation] = React.useState(
    isRSU ? (equityDetails as RSUForm).exit_valuation : 0
  );
  const [equityPct, setEquityPct] = React.useState(
    isRSU ? (equityDetails as RSUForm).total_equity_grant_pct : 0
  );
  const [exitPricePerShare, setExitPricePerShare] = React.useState(
    !isRSU ? (equityDetails as StockOptionsForm).exit_price_per_share : 0
  );
  const [numOptions, setNumOptions] = React.useState(
    !isRSU ? (equityDetails as StockOptionsForm).num_options : 0
  );
  const [startupSalary, setStartupSalary] = React.useState(equityDetails.monthly_salary);

  // Track if values have changed from original
  const hasChanges = React.useMemo(() => {
    if (isRSU) {
      const rsuDetails = equityDetails as RSUForm;
      return (
        exitValuation !== rsuDetails.exit_valuation ||
        equityPct !== rsuDetails.total_equity_grant_pct ||
        startupSalary !== rsuDetails.monthly_salary
      );
    } else {
      const optionsDetails = equityDetails as StockOptionsForm;
      return (
        exitPricePerShare !== optionsDetails.exit_price_per_share ||
        numOptions !== optionsDetails.num_options ||
        startupSalary !== optionsDetails.monthly_salary
      );
    }
  }, [isRSU, equityDetails, exitValuation, equityPct, exitPricePerShare, numOptions, startupSalary]);

  // Calculate adjusted net benefit based on simple scaling
  // This is a client-side approximation for instant feedback
  const adjustedNetBenefit = React.useMemo(() => {
    const baseNetBenefit = baseResults.final_payout_value - baseResults.final_opportunity_cost;

    if (!hasChanges) {
      return baseNetBenefit;
    }

    if (isRSU) {
      const rsuDetails = equityDetails as RSUForm;
      const originalValuation = rsuDetails.exit_valuation;
      const originalEquity = rsuDetails.total_equity_grant_pct;

      // Scale payout proportionally to valuation and equity changes
      const valuationRatio = originalValuation > 0 ? exitValuation / originalValuation : 1;
      const equityRatio = originalEquity > 0 ? equityPct / originalEquity : 1;

      const adjustedPayout = baseResults.final_payout_value * valuationRatio * equityRatio;

      // Salary changes affect opportunity cost (lower startup salary = higher opportunity cost)
      const originalSalary = rsuDetails.monthly_salary;
      const salaryDiff = (originalSalary - startupSalary) * 12 * 4; // Rough 4-year estimate
      const adjustedOpportunityCost = baseResults.final_opportunity_cost + salaryDiff;

      return adjustedPayout - adjustedOpportunityCost;
    } else {
      const optionsDetails = equityDetails as StockOptionsForm;
      const originalPrice = optionsDetails.exit_price_per_share;
      const originalOptions = optionsDetails.num_options;
      const strikePrice = optionsDetails.strike_price;

      // Options value = (exit price - strike) * num options
      const originalValue = (originalPrice - strikePrice) * originalOptions;
      const newValue = (exitPricePerShare - strikePrice) * numOptions;

      const payoutRatio = originalValue > 0 ? newValue / originalValue : 1;
      const adjustedPayout = baseResults.final_payout_value * payoutRatio;

      // Salary adjustment
      const originalSalary = optionsDetails.monthly_salary;
      const salaryDiff = (originalSalary - startupSalary) * 12 * 4;
      const adjustedOpportunityCost = baseResults.final_opportunity_cost + salaryDiff;

      return adjustedPayout - adjustedOpportunityCost;
    }
  }, [hasChanges, isRSU, equityDetails, baseResults, exitValuation, equityPct, exitPricePerShare, numOptions, startupSalary]);

  // Reset all values to original
  const handleReset = () => {
    if (isRSU) {
      const rsuDetails = equityDetails as RSUForm;
      setExitValuation(rsuDetails.exit_valuation);
      setEquityPct(rsuDetails.total_equity_grant_pct);
      setStartupSalary(rsuDetails.monthly_salary);
    } else {
      const optionsDetails = equityDetails as StockOptionsForm;
      setExitPricePerShare(optionsDetails.exit_price_per_share);
      setNumOptions(optionsDetails.num_options);
      setStartupSalary(optionsDetails.monthly_salary);
    }
    onAdjustedResultsChange(null);
  };

  // Effect to notify parent of changes
  React.useEffect(() => {
    if (hasChanges) {
      // Create adjusted results (simplified approximation)
      const adjustedResults: StartupScenarioResponse = {
        ...baseResults,
        final_payout_value: adjustedNetBenefit + baseResults.final_opportunity_cost,
      };
      onAdjustedResultsChange(adjustedResults);
    } else {
      onAdjustedResultsChange(null);
    }
  }, [hasChanges, adjustedNetBenefit, baseResults, onAdjustedResultsChange]);

  const isPositive = adjustedNetBenefit >= 0;

  return (
    <Card className={cn("terminal-card", className)}>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-accent" />
            <CardTitle className="text-sm font-semibold">Quick Adjustments</CardTitle>
            {hasChanges && (
              <span className="text-xs text-accent font-mono">(modified)</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 pt-2">
          {/* Net Benefit Display */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <span className="text-sm text-muted-foreground">Net Benefit</span>
            <span className={cn(
              "text-lg font-semibold tabular-nums",
              isPositive ? "text-terminal" : "text-destructive"
            )}>
              <AnimatedCurrencyDisplay value={adjustedNetBenefit} />
            </span>
          </div>

          {/* Sliders */}
          <div className="space-y-5">
            {isRSU ? (
              <>
                {/* Exit Valuation Slider (RSU) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Exit Valuation</Label>
                    <span className="text-sm font-mono text-accent">
                      {formatCompactCurrency(exitValuation)}
                    </span>
                  </div>
                  <Slider
                    value={[exitValuation]}
                    onValueChange={([value]) => setExitValuation(value)}
                    min={1_000_000}
                    max={1_000_000_000}
                    step={1_000_000}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$1M</span>
                    <span>$1B</span>
                  </div>
                </div>

                {/* Equity Percentage Slider (RSU) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Equity %</Label>
                    <span className="text-sm font-mono text-accent">
                      {equityPct.toFixed(2)}%
                    </span>
                  </div>
                  <Slider
                    value={[equityPct]}
                    onValueChange={([value]) => setEquityPct(value)}
                    min={0.01}
                    max={10}
                    step={0.01}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.01%</span>
                    <span>10%</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Exit Price Per Share Slider (Stock Options) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Exit Price/Share</Label>
                    <span className="text-sm font-mono text-accent">
                      ${exitPricePerShare.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[exitPricePerShare]}
                    onValueChange={([value]) => setExitPricePerShare(value)}
                    min={0.01}
                    max={100}
                    step={0.01}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>$0.01</span>
                    <span>$100</span>
                  </div>
                </div>

                {/* Number of Options Slider (Stock Options) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Options</Label>
                    <span className="text-sm font-mono text-accent">
                      {numOptions.toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    value={[numOptions]}
                    onValueChange={([value]) => setNumOptions(value)}
                    min={1000}
                    max={500000}
                    step={1000}
                    className="cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1K</span>
                    <span>500K</span>
                  </div>
                </div>
              </>
            )}

            {/* Startup Salary Slider (both types) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Startup Salary</Label>
                <span className="text-sm font-mono text-accent">
                  {formatCurrency(startupSalary)}/mo
                </span>
              </div>
              <Slider
                value={[startupSalary]}
                onValueChange={([value]) => setStartupSalary(value)}
                min={0}
                max={30000}
                step={500}
                className="cursor-pointer"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$0</span>
                <span>$30K</span>
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges}
              className="font-mono gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              Reset
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
