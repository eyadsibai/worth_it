"use client";

import { Info } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface MonteCarloToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  simulations: number;
  onSimulationsChange: (simulations: number) => void;
}

export function MonteCarloToggle({
  enabled,
  onEnabledChange,
  simulations,
  onSimulationsChange,
}: MonteCarloToggleProps) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Monte Carlo Simulation</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="text-muted-foreground h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>
                    Run thousands of simulations with varying inputs to see the range of possible
                    valuations and their probabilities.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <Label>Number of Simulations</Label>
              <span className="font-mono">{simulations.toLocaleString()}</span>
            </div>
            <Slider
              value={[simulations]}
              onValueChange={([val]) => onSimulationsChange(val)}
              min={1000}
              max={100000}
              step={1000}
            />
            <p className="text-muted-foreground text-xs">
              More simulations = higher accuracy, longer wait time
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
