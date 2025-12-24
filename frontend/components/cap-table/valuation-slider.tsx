"use client";

import * as React from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp } from "lucide-react";
import { formatLargeNumber } from "@/lib/format-utils";

interface ValuationSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  breakevenPoints?: Record<string, number>;
}

// Parse user input to number
function parseInputValue(input: string): number | null {
  // Remove any non-numeric characters except decimals
  const cleaned = input.replace(/[^0-9.]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

export function ValuationSlider({
  value,
  onChange,
  min = 0,
  max = 500_000_000,
  step = 1_000_000,
  breakevenPoints = {},
}: ValuationSliderProps) {
  const [inputValue, setInputValue] = React.useState(value.toString());

  // Update input when slider changes
  React.useEffect(() => {
    setInputValue((value / 1_000_000).toString());
  }, [value]);

  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputBlur = () => {
    const parsed = parseInputValue(inputValue);
    if (parsed !== null) {
      // Input is in millions
      const valueInDollars = parsed * 1_000_000;
      const clamped = Math.max(min, Math.min(max, valueInDollars));
      onChange(clamped);
    } else {
      // Reset to current value
      setInputValue((value / 1_000_000).toString());
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
    }
  };

  // Quick select buttons for common valuations
  const quickSelects = [
    { label: "$10M", value: 10_000_000 },
    { label: "$25M", value: 25_000_000 },
    { label: "$50M", value: 50_000_000 },
    { label: "$100M", value: 100_000_000 },
    { label: "$250M", value: 250_000_000 },
    { label: "$500M", value: 500_000_000 },
  ];

  // Find breakeven points relative to current value
  const relevantBreakevens = Object.entries(breakevenPoints)
    .filter(([, breakeven]) => breakeven > 0 && breakeven <= max)
    .sort(([, a], [, b]) => a - b);

  return (
    <Card className="terminal-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Exit Valuation
        </CardTitle>
        <CardDescription>
          Adjust the exit valuation to see how proceeds are distributed
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Value Display */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <DollarSign className="text-muted-foreground h-6 w-6" />
            <div className="relative">
              <Input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className="w-32 border-none p-0 text-center text-4xl font-bold tabular-nums shadow-none focus-visible:ring-0"
              />
              <span className="text-muted-foreground absolute top-1/2 right-0 -translate-y-1/2 text-lg">
                M
              </span>
            </div>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {formatLargeNumber(value)} exit valuation
          </p>
        </div>

        {/* Slider */}
        <div className="space-y-2">
          <Slider
            value={[value]}
            onValueChange={handleSliderChange}
            min={min}
            max={max}
            step={step}
            className="w-full"
          />
          <div className="text-muted-foreground flex justify-between text-xs">
            <span>{formatLargeNumber(min)}</span>
            <span>{formatLargeNumber(max)}</span>
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-sm">Quick Select</Label>
          <div className="flex flex-wrap gap-2">
            {quickSelects.map((qs) => (
              <Button
                key={qs.value}
                variant={value === qs.value ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(qs.value)}
                className="tabular-nums"
              >
                {qs.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Breakeven Points */}
        {relevantBreakevens.length > 0 && (
          <div className="border-border space-y-2 border-t pt-2">
            <Label className="text-muted-foreground text-sm">Breakeven Points</Label>
            <div className="space-y-1">
              {relevantBreakevens.map(([name, breakeven]) => (
                <div
                  key={name}
                  className={`flex justify-between rounded p-2 text-sm ${
                    value >= breakeven
                      ? "bg-green-500/10 text-green-500"
                      : "bg-muted/50 text-muted-foreground"
                  }`}
                >
                  <span>{name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange(breakeven)}
                    className="h-auto px-2 py-0 text-xs tabular-nums"
                  >
                    {formatLargeNumber(breakeven)}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
