"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NumberInputField, SliderField } from "./form-fields";
import { Progress } from "@/components/ui/progress";
import { Loader2, PlayCircle, CheckCircle2, ChevronDown } from "lucide-react";
import { useRunMonteCarlo } from "@/lib/api-client";
import type { MonteCarloRequest } from "@/lib/schemas";

const MonteCarloFormSchema = z.object({
  num_simulations: z.number().int().min(100).max(10000),
  // Exit Valuation (normal distribution)
  exit_valuation_mean: z.number().min(0),
  exit_valuation_std: z.number().min(0),
  // Salary Growth Rate (PERT distribution)
  growth_rate_enabled: z.boolean(),
  growth_rate_min: z.number().min(-50).max(100),
  growth_rate_mode: z.number().min(-50).max(100),
  growth_rate_max: z.number().min(-50).max(100),
  // ROI (normal distribution)
  roi_enabled: z.boolean(),
  roi_mean: z.number().min(0).max(50),
  roi_std: z.number().min(0).max(20),
  // Exit Year (PERT distribution)
  exit_year_enabled: z.boolean(),
  exit_year_min: z.number().int().min(1).max(20),
  exit_year_mode: z.number().int().min(1).max(20),
  exit_year_max: z.number().int().min(1).max(20),
  // Dilution (PERT distribution)
  dilution_enabled: z.boolean(),
  dilution_min: z.number().min(0).max(100),
  dilution_mode: z.number().min(0).max(100),
  dilution_max: z.number().min(0).max(100),
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
      // Exit Valuation (normal distribution)
      exit_valuation_mean: 100000000, // 100M
      exit_valuation_std: 50000000, // 50M
      // Salary Growth Rate (PERT distribution)
      growth_rate_enabled: false,
      growth_rate_min: 2,
      growth_rate_mode: 5,
      growth_rate_max: 12,
      // ROI (normal distribution)
      roi_enabled: false,
      roi_mean: 7,
      roi_std: 2,
      // Exit Year (PERT distribution)
      exit_year_enabled: false,
      exit_year_min: 3,
      exit_year_mode: 5,
      exit_year_max: 10,
      // Dilution (PERT distribution)
      dilution_enabled: false,
      dilution_min: 10,
      dilution_mode: 25,
      dilution_max: 50,
    },
  });

  const monteCarloMutation = useRunMonteCarlo();

  // Call onComplete when result is available
  React.useEffect(() => {
    if (monteCarloMutation.data && onComplete) {
      onComplete({
        net_outcomes: monteCarloMutation.data.net_outcomes,
        simulated_valuations: monteCarloMutation.data.simulated_valuations,
      });
    }
  }, [monteCarloMutation.data, onComplete]);

  const onSubmit = (data: MonteCarloForm) => {
    const sim_param_configs: Record<string, any> = {};

    // Exit Valuation (always enabled as normal distribution)
    sim_param_configs.exit_valuation = {
      type: "normal",
      mean: data.exit_valuation_mean,
      std: data.exit_valuation_std,
    };

    // Salary Growth Rate (PERT distribution)
    if (data.growth_rate_enabled) {
      sim_param_configs.salary_growth = {
        min_val: data.growth_rate_min / 100,
        mode: data.growth_rate_mode / 100,
        max_val: data.growth_rate_max / 100,
      };
    }

    // ROI (normal distribution)
    if (data.roi_enabled) {
      sim_param_configs.roi = {
        mean: data.roi_mean / 100,
        std_dev: data.roi_std / 100,
      };
    }

    // Exit Year (PERT distribution)
    if (data.exit_year_enabled) {
      sim_param_configs.exit_year = {
        min_val: data.exit_year_min,
        mode: data.exit_year_mode,
        max_val: data.exit_year_max,
      };
    }

    // Dilution (PERT distribution)
    if (data.dilution_enabled) {
      sim_param_configs.dilution = {
        min_val: data.dilution_min / 100,
        mode: data.dilution_mode / 100,
        max_val: data.dilution_max / 100,
      };
    }

    const request: MonteCarloRequest = {
      num_simulations: data.num_simulations,
      base_params: baseParams,
      sim_param_configs,
    };

    monteCarloMutation.mutate(request);
  };

  const isRunning = monteCarloMutation.isPending;
  const isComplete = monteCarloMutation.isSuccess;

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

            {/* Exit Valuation - Always enabled */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
              <h4 className="font-medium text-sm">Exit Valuation Distribution (Normal)</h4>

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

            {/* Salary Growth Rate */}
            <Collapsible open={form.watch("growth_rate_enabled")}>
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <FormField
                  control={form.control}
                  name="growth_rate_enabled"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">Salary Growth Rate Distribution (PERT)</h4>
                        <p className="text-xs text-muted-foreground">Simulate uncertainty in salary growth rates</p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                
                <CollapsibleContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <NumberInputField
                      form={form}
                      name="growth_rate_min"
                      label="Minimum"
                      description="Pessimistic case"
                      min={-50}
                      max={100}
                      step={0.5}
                      suffix="%"
                      placeholder="2"
                    />
                    
                    <NumberInputField
                      form={form}
                      name="growth_rate_mode"
                      label="Most Likely"
                      description="Expected case"
                      min={-50}
                      max={100}
                      step={0.5}
                      suffix="%"
                      placeholder="5"
                    />
                    
                    <NumberInputField
                      form={form}
                      name="growth_rate_max"
                      label="Maximum"
                      description="Optimistic case"
                      min={-50}
                      max={100}
                      step={0.5}
                      suffix="%"
                      placeholder="12"
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* ROI */}
            <Collapsible open={form.watch("roi_enabled")}>
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <FormField
                  control={form.control}
                  name="roi_enabled"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">Investment ROI Distribution (Normal)</h4>
                        <p className="text-xs text-muted-foreground">Simulate uncertainty in investment returns</p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                
                <CollapsibleContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <NumberInputField
                      form={form}
                      name="roi_mean"
                      label="Mean ROI"
                      description="Expected annual return"
                      min={0}
                      max={50}
                      step={0.5}
                      suffix="%"
                      placeholder="7"
                    />
                    
                    <NumberInputField
                      form={form}
                      name="roi_std"
                      label="Standard Deviation"
                      description="Uncertainty in returns"
                      min={0}
                      max={20}
                      step={0.5}
                      suffix="%"
                      placeholder="2"
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Exit Year */}
            <Collapsible open={form.watch("exit_year_enabled")}>
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <FormField
                  control={form.control}
                  name="exit_year_enabled"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">Exit Year Distribution (PERT)</h4>
                        <p className="text-xs text-muted-foreground">Simulate uncertainty in when exit occurs</p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                
                <CollapsibleContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <NumberInputField
                      form={form}
                      name="exit_year_min"
                      label="Earliest Exit"
                      description="Minimum years"
                      min={1}
                      max={20}
                      step={1}
                      suffix=" yrs"
                      placeholder="3"
                    />
                    
                    <NumberInputField
                      form={form}
                      name="exit_year_mode"
                      label="Expected Exit"
                      description="Most likely years"
                      min={1}
                      max={20}
                      step={1}
                      suffix=" yrs"
                      placeholder="5"
                    />
                    
                    <NumberInputField
                      form={form}
                      name="exit_year_max"
                      label="Latest Exit"
                      description="Maximum years"
                      min={1}
                      max={20}
                      step={1}
                      suffix=" yrs"
                      placeholder="10"
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Dilution */}
            <Collapsible open={form.watch("dilution_enabled")}>
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <FormField
                  control={form.control}
                  name="dilution_enabled"
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-sm">Dilution Distribution (PERT)</h4>
                        <p className="text-xs text-muted-foreground">Simulate uncertainty in equity dilution</p>
                      </div>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </div>
                  )}
                />
                
                <CollapsibleContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <NumberInputField
                      form={form}
                      name="dilution_min"
                      label="Minimum Dilution"
                      description="Best case"
                      min={0}
                      max={100}
                      step={1}
                      suffix="%"
                      placeholder="10"
                    />
                    
                    <NumberInputField
                      form={form}
                      name="dilution_mode"
                      label="Expected Dilution"
                      description="Most likely"
                      min={0}
                      max={100}
                      step={1}
                      suffix="%"
                      placeholder="25"
                    />
                    
                    <NumberInputField
                      form={form}
                      name="dilution_max"
                      label="Maximum Dilution"
                      description="Worst case"
                      min={0}
                      max={100}
                      step={1}
                      suffix="%"
                      placeholder="50"
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Progress Display */}
            {isRunning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Running Simulation...</span>
                  <span className="text-muted-foreground">Processing...</span>
                </div>
                <Progress value={undefined} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  This may take a moment for large numbers of simulations
                </p>
              </div>
            )}
            
            {isComplete && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-green-600">Simulation Complete!</span>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
              </div>
            )}

            {/* Error Display */}
            {monteCarloMutation.isError && (
              <div className="p-4 border border-destructive rounded-lg bg-destructive/10 text-destructive text-sm">
                <p className="font-medium">Simulation Error</p>
                <p>{monteCarloMutation.error?.message || "An error occurred during simulation"}</p>
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

              {(isComplete || monteCarloMutation.isError) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    monteCarloMutation.reset();
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
