"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, RefreshCw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format-utils";
import type { RSUForm, StockOptionsForm, StartupScenarioResponse } from "@/lib/schemas";
import { AnimatedCurrencyDisplay } from "@/lib/motion";

interface QuickAdjustPanelProps {
  equityDetails: RSUForm | StockOptionsForm;
  baseResults: StartupScenarioResponse;
  onAdjustedResultsChange: (results: StartupScenarioResponse | null) => void;
  defaultExpanded?: boolean;
  className?: string;
}

/**
 * Calculate the adjusted opportunity cost based on salary difference.
 * Used for both RSU and Stock Options scenarios.
 *
 * @param originalSalary - Original monthly startup salary
 * @param newSalary - Adjusted monthly startup salary
 * @param baseOpportunityCost - Original opportunity cost from scenario
 * @param vestingYears - Number of years to project salary difference
 * @returns Adjusted opportunity cost
 */
function calculateAdjustedOpportunityCost(
  originalSalary: number,
  newSalary: number,
  baseOpportunityCost: number,
  vestingYears: number
): number {
  // Lower startup salary = higher opportunity cost (more foregone income)
  const salaryDiff = (originalSalary - newSalary) * 12 * vestingYears;
  return baseOpportunityCost + salaryDiff;
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
  }, [
    isRSU,
    equityDetails,
    exitValuation,
    equityPct,
    exitPricePerShare,
    numOptions,
    startupSalary,
  ]);

  /**
   * Calculate adjusted net benefit based on simple scaling.
   * This is a CLIENT-SIDE APPROXIMATION for instant feedback.
   *
   * ASSUMPTIONS & LIMITATIONS:
   * - Payout scales linearly with valuation/equity changes (ignores non-linear effects)
   * - Salary difference is projected over the vesting period only
   * - Does NOT account for: dilution from future funding rounds, vesting schedules,
   *   secondary sales, taxes, or exercise costs for options
   * - For complex scenarios with dilution or secondary sales, results may be significantly
   *   different from a full backend recalculation
   *
   * This approximation is suitable for quick "what-if" exploration.
   * For accurate results, users should recalculate with the backend.
   */
  const { adjustedNetBenefit, adjustedPayout, adjustedOpportunityCost } = React.useMemo(() => {
    const baseNetBenefit = baseResults.final_payout_value - baseResults.final_opportunity_cost;

    if (!hasChanges) {
      return {
        adjustedNetBenefit: baseNetBenefit,
        adjustedPayout: baseResults.final_payout_value,
        adjustedOpportunityCost: baseResults.final_opportunity_cost,
      };
    }

    if (isRSU) {
      const rsuDetails = equityDetails as RSUForm;
      const originalValuation = rsuDetails.exit_valuation;
      const originalEquity = rsuDetails.total_equity_grant_pct;
      const vestingYears = rsuDetails.vesting_period;

      // Scale payout proportionally to valuation and equity changes
      const valuationRatio = originalValuation > 0 ? exitValuation / originalValuation : 1;
      const equityRatio = originalEquity > 0 ? equityPct / originalEquity : 1;

      const payout = baseResults.final_payout_value * valuationRatio * equityRatio;
      const opportunityCost = calculateAdjustedOpportunityCost(
        rsuDetails.monthly_salary,
        startupSalary,
        baseResults.final_opportunity_cost,
        vestingYears
      );

      return {
        adjustedNetBenefit: payout - opportunityCost,
        adjustedPayout: payout,
        adjustedOpportunityCost: opportunityCost,
      };
    } else {
      const optionsDetails = equityDetails as StockOptionsForm;
      const originalPrice = optionsDetails.exit_price_per_share;
      const originalOptions = optionsDetails.num_options;
      const strikePrice = optionsDetails.strike_price;
      const vestingYears = optionsDetails.vesting_period;

      // Options value = (exit price - strike) * num options
      // Clamp to zero when exit price is below strike price (options are worthless)
      const originalValue = Math.max(0, (originalPrice - strikePrice) * originalOptions);
      const newValue = Math.max(0, (exitPricePerShare - strikePrice) * numOptions);

      const payoutRatio = originalValue > 0 ? newValue / originalValue : newValue > 0 ? 1 : 0;
      const payout = baseResults.final_payout_value * payoutRatio;

      const opportunityCost = calculateAdjustedOpportunityCost(
        optionsDetails.monthly_salary,
        startupSalary,
        baseResults.final_opportunity_cost,
        vestingYears
      );

      return {
        adjustedNetBenefit: payout - opportunityCost,
        adjustedPayout: payout,
        adjustedOpportunityCost: opportunityCost,
      };
    }
  }, [
    hasChanges,
    isRSU,
    equityDetails,
    baseResults,
    exitValuation,
    equityPct,
    exitPricePerShare,
    numOptions,
    startupSalary,
  ]);

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

  // Use ref to avoid callback dependency causing re-renders
  const onAdjustedResultsChangeRef = React.useRef(onAdjustedResultsChange);
  React.useEffect(() => {
    onAdjustedResultsChangeRef.current = onAdjustedResultsChange;
  }, [onAdjustedResultsChange]);

  // Effect to notify parent of changes
  React.useEffect(() => {
    if (hasChanges) {
      // Create adjusted results with correctly calculated values
      const adjustedResults: StartupScenarioResponse = {
        ...baseResults,
        final_payout_value: adjustedPayout,
        final_opportunity_cost: adjustedOpportunityCost,
      };
      onAdjustedResultsChangeRef.current(adjustedResults);
    } else {
      onAdjustedResultsChangeRef.current(null);
    }
  }, [hasChanges, adjustedPayout, adjustedOpportunityCost, baseResults]);

  const isPositive = adjustedNetBenefit >= 0;

  return (
    <Card className={cn("terminal-card", className)}>
      <CardHeader className="cursor-pointer pb-2" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="text-accent h-4 w-4" />
            <CardTitle className="text-sm font-semibold whitespace-nowrap">
              Quick Adjustments
            </CardTitle>
            {hasChanges && <span className="text-accent text-xs">(modified)</span>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6 pt-2">
          {/* Net Benefit Display */}
          <div className="bg-secondary/30 border-border flex items-center justify-between rounded-lg border p-3">
            <span className="text-muted-foreground text-sm">Net Benefit</span>
            <span
              className={cn(
                "text-lg font-semibold tabular-nums",
                isPositive ? "text-terminal" : "text-destructive"
              )}
            >
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
                    <Label htmlFor="exit-valuation-slider" className="text-sm font-medium">
                      Exit Valuation
                    </Label>
                    <span className="text-accent text-sm tabular-nums">
                      {formatCurrencyCompact(exitValuation)}
                    </span>
                  </div>
                  <Slider
                    id="exit-valuation-slider"
                    aria-label="Exit valuation"
                    value={[exitValuation]}
                    onValueChange={([value]) => setExitValuation(value)}
                    min={1_000_000}
                    max={1_000_000_000}
                    step={1_000_000}
                    className="cursor-pointer"
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>$1M</span>
                    <span>$1B</span>
                  </div>
                </div>

                {/* Equity Percentage Slider (RSU) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="equity-pct-slider" className="text-sm font-medium">
                      Equity %
                    </Label>
                    <span className="text-accent text-sm tabular-nums">
                      {equityPct % 1 === 0 ? equityPct : equityPct.toFixed(2).replace(/\.?0+$/, "")}
                      %
                    </span>
                  </div>
                  <Slider
                    id="equity-pct-slider"
                    aria-label="Equity percentage"
                    value={[equityPct]}
                    onValueChange={([value]) => setEquityPct(value)}
                    min={0.01}
                    max={10}
                    step={0.01}
                    className="cursor-pointer"
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
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
                    <Label htmlFor="exit-price-slider" className="text-sm font-medium">
                      Exit Price/Share
                    </Label>
                    <span className="text-accent text-sm tabular-nums">
                      $
                      {exitPricePerShare % 1 === 0
                        ? exitPricePerShare
                        : exitPricePerShare.toFixed(2).replace(/\.?0+$/, "")}
                    </span>
                  </div>
                  <Slider
                    id="exit-price-slider"
                    aria-label="Exit price per share"
                    value={[exitPricePerShare]}
                    onValueChange={([value]) => setExitPricePerShare(value)}
                    min={0.01}
                    max={100}
                    step={0.01}
                    className="cursor-pointer"
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>$0.01</span>
                    <span>$100</span>
                  </div>
                </div>

                {/* Number of Options Slider (Stock Options) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="num-options-slider" className="text-sm font-medium">
                      Options
                    </Label>
                    <span className="text-accent text-sm tabular-nums">
                      {numOptions.toLocaleString()}
                    </span>
                  </div>
                  <Slider
                    id="num-options-slider"
                    aria-label="Number of options"
                    value={[numOptions]}
                    onValueChange={([value]) => setNumOptions(value)}
                    min={1000}
                    max={500000}
                    step={1000}
                    className="cursor-pointer"
                  />
                  <div className="text-muted-foreground flex justify-between text-xs">
                    <span>1K</span>
                    <span>500K</span>
                  </div>
                </div>
              </>
            )}

            {/* Startup Salary Slider (both types) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="salary-slider" className="text-sm font-medium">
                  Startup Salary
                </Label>
                <span className="text-accent text-sm tabular-nums">
                  {formatCurrency(startupSalary)}/mo
                </span>
              </div>
              <Slider
                id="salary-slider"
                aria-label="Startup monthly salary"
                value={[startupSalary]}
                onValueChange={([value]) => setStartupSalary(value)}
                min={0}
                max={30000}
                step={500}
                className="cursor-pointer"
              />
              <div className="text-muted-foreground flex justify-between text-xs">
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
              className="gap-2"
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
