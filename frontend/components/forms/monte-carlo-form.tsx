"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInputField, SliderField } from "./form-fields";
import { Progress } from "@/components/ui/progress";
import { Loader2, PlayCircle, CheckCircle2 } from "lucide-react";
import { useMonteCarloWebSocket } from "@/lib/api-client";
import type { MonteCarloRequest } from "@/lib/schemas";

const MonteCarloFormSchema = z.object({
  num_simulations: z.number().int().min(100).max(10000),
  exit_valuation_mean: z.number().min(0),
  exit_valuation_std: z.number().min(0),
  growth_rate_mean: z.number().min(-50).max(100),
  growth_rate_std: z.number().min(0).max(50),
});

type MonteCarloForm = z.infer<typeof MonteCarloFormSchema>;

interface MonteCarloFormComponentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  baseParams: Record<string, any>;
  onComplete?: (results: { net_outcomes: number[]; simulated_valuations: number[] }) => void;
}

export function MonteCarloFormComponent({
  baseParams,
  onComplete,
}: MonteCarloFormComponentProps) {
  const form = useForm<MonteCarloForm>({
    resolver: zodResolver(MonteCarloFormSchema),
    defaultValues: {
      num_simulations: 1000,
      exit_valuation_mean: 100000000, // 100M
      exit_valuation_std: 50000000, // 50M
      growth_rate_mean: 5,
      growth_rate_std: 2,
    },
  });

  const { progress, isConnected, error, result, runSimulation, cancel } = useMonteCarloWebSocket();

  // Call onComplete when result is available
  React.useEffect(() => {
    if (result && onComplete) {
      onComplete({
        net_outcomes: result.net_outcomes,
        simulated_valuations: result.simulated_valuations,
      });
    }
  }, [result, onComplete]);

  const onSubmit = (data: MonteCarloForm) => {
    const request: MonteCarloRequest = {
      num_simulations: data.num_simulations,
      base_params: baseParams,
      sim_param_configs: {
        exit_valuation: {
          type: "normal",
          mean: data.exit_valuation_mean,
          std: data.exit_valuation_std,
        },
        growth_rate: {
          type: "normal",
          mean: data.growth_rate_mean / 100,
          std: data.growth_rate_std / 100,
        },
      },
    };

    runSimulation(request);
  };

  const isRunning = isConnected && progress !== null && progress.percentage < 100;
  const isComplete = progress !== null && progress.percentage === 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monte Carlo Simulation</CardTitle>
        <CardDescription>
          Run probabilistic analysis with thousands of scenarios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <SliderField
              form={form}
              name="num_simulations"
              label="Number of Simulations"
              description="More simulations = more accurate results (but slower)"
              min={100}
              max={10000}
              step={100}
              formatValue={(value) => `${value.toLocaleString()}`}
            />

            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium text-sm">Exit Valuation Distribution</h4>

              <NumberInputField
                form={form}
                name="exit_valuation_mean"
                label="Mean Valuation"
                description="Expected exit valuation"
                min={0}
                step={1000000}
                prefix="SAR"
                placeholder="100000000"
              />

              <NumberInputField
                form={form}
                name="exit_valuation_std"
                label="Standard Deviation"
                description="Uncertainty in valuation"
                min={0}
                step={1000000}
                prefix="SAR"
                placeholder="50000000"
              />
            </div>

            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium text-sm">Salary Growth Rate Distribution</h4>

              <NumberInputField
                form={form}
                name="growth_rate_mean"
                label="Mean Growth Rate"
                description="Expected annual salary growth"
                min={-50}
                max={100}
                step={0.5}
                suffix="%"
                placeholder="5"
              />

              <NumberInputField
                form={form}
                name="growth_rate_std"
                label="Standard Deviation"
                description="Uncertainty in growth rate"
                min={0}
                max={50}
                step={0.5}
                suffix="%"
                placeholder="2"
              />
            </div>

            {/* Progress Display */}
            {(isRunning || isComplete) && progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {isComplete ? "Simulation Complete!" : "Running Simulation..."}
                  </span>
                  <span className="text-muted-foreground">
                    {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
                  </span>
                </div>
                <Progress value={progress.percentage} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {progress.percentage.toFixed(1)}% complete
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-4 border border-destructive rounded-lg bg-destructive/10 text-destructive text-sm">
                <p className="font-medium">Simulation Error</p>
                <p>{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={isRunning || !form.formState.isValid}
                className="flex-1"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : isComplete ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Run Again
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Run Simulation
                  </>
                )}
              </Button>

              {(isComplete || error) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    cancel();
                    form.reset();
                  }}
                >
                  Reset
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
