"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InformationBox } from "@/components/ui/information-box";
import { NumberInputField, SliderField } from "./form-fields";
import { DistributionSection } from "./distribution-section";
import { Progress } from "@/components/ui/progress";
import { Loader2, PlayCircle, CheckCircle2 } from "lucide-react";
import { TOOLTIPS } from "@/lib/constants/tooltips";
import { useRunMonteCarlo } from "@/lib/api-client";
import type { MonteCarloRequest, TypedBaseParams, SimParamConfigs } from "@/lib/schemas";

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

// Type definitions for Monte Carlo simulation parameters
interface NormalDistribution {
  type: "normal";
  mean: number;
  std?: number;
  std_dev?: number;
}

interface PertDistribution {
  min_val: number;
  mode: number;
  max_val: number;
}

type SimParamConfig = NormalDistribution | PertDistribution;

interface MonteCarloFormComponentProps {
  baseParams: TypedBaseParams;
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
    // Issue #248: Use simple min/max ranges for typed API format
    // Backend conversion layer transforms to PERT/Normal distributions
    const sim_param_configs: SimParamConfigs = {};

    // Exit Valuation - convert from normal (mean ± 2*std) to min/max range
    // Using ±2 standard deviations captures ~95% of the distribution
    sim_param_configs.exit_valuation = {
      min: Math.max(0, data.exit_valuation_mean - 2 * data.exit_valuation_std),
      max: data.exit_valuation_mean + 2 * data.exit_valuation_std,
    };

    // Salary Growth Rate - convert PERT to simple range (drop mode)
    if (data.growth_rate_enabled) {
      sim_param_configs.current_job_salary_growth_rate = {
        min: data.growth_rate_min / 100,
        max: data.growth_rate_max / 100,
      };
    }

    // ROI - convert from normal to min/max range
    if (data.roi_enabled) {
      sim_param_configs.annual_roi = {
        min: Math.max(0, data.roi_mean / 100 - 2 * data.roi_std / 100),
        max: data.roi_mean / 100 + 2 * data.roi_std / 100,
      };
    }

    // Exit Year - convert PERT to simple range
    if (data.exit_year_enabled) {
      sim_param_configs.exit_year = {
        min: data.exit_year_min,
        max: data.exit_year_max,
      };
    }

    // Note: Dilution is not currently in the typed API format
    // It would need to be added to VariableParamEnum if needed

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
    <Card data-tour="monte-carlo-section">
      <CardHeader>
        <CardTitle>Monte Carlo Simulation</CardTitle>
        <CardDescription>
          Run probabilistic analysis with thousands of scenarios
        </CardDescription>
      </CardHeader>
      <CardContent data-tour="monte-carlo-parameters">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <SliderField
              form={form}
              name="num_simulations"
              label="Number of Simulations"
              description="More simulations = more accurate results (but slower)"
              tooltip={TOOLTIPS.numSimulations}
              min={100}
              max={10000}
              step={100}
              formatValue={(value) => `${value.toLocaleString()}`}
            />

            {/* Exit Valuation - Always enabled */}
            <InformationBox
              title="Exit Valuation Distribution (Normal)"
              className="space-y-4"
            >
              <NumberInputField
                form={form}
                name="exit_valuation_mean"
                label="Mean Valuation"
                description="Expected exit valuation"
                tooltip={TOOLTIPS.exitValuationMean}
                min={0}
                step={1000000}
                prefix="SAR"
                placeholder="100000000"
                formatDisplay={true}
              />

              <NumberInputField
                form={form}
                name="exit_valuation_std"
                label="Standard Deviation"
                description="Uncertainty in valuation"
                tooltip={TOOLTIPS.exitValuationStd}
                min={0}
                step={1000000}
                prefix="SAR"
                placeholder="50000000"
                formatDisplay={true}
              />
            </InformationBox>

            {/* Salary Growth Rate */}
            <DistributionSection
              form={form}
              enabledFieldName="growth_rate_enabled"
              title="Salary Growth Rate Distribution"
              description="Simulate uncertainty in salary growth rates"
              distributionType="PERT"
            >
              <NumberInputField
                form={form}
                name="growth_rate_min"
                label="Minimum"
                description="Pessimistic case"
                tooltip={TOOLTIPS.salaryGrowthMin}
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
                tooltip={TOOLTIPS.salaryGrowthMode}
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
                tooltip={TOOLTIPS.salaryGrowthMax}
                min={-50}
                max={100}
                step={0.5}
                suffix="%"
                placeholder="12"
              />
            </DistributionSection>

            {/* ROI */}
            <DistributionSection
              form={form}
              enabledFieldName="roi_enabled"
              title="Investment ROI Distribution"
              description="Simulate uncertainty in investment returns"
              distributionType="Normal"
              columns={2}
            >
              <NumberInputField
                form={form}
                name="roi_mean"
                label="Mean ROI"
                description="Expected annual return"
                tooltip={TOOLTIPS.roiMean}
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
                tooltip={TOOLTIPS.roiStd}
                min={0}
                max={20}
                step={0.5}
                suffix="%"
                placeholder="2"
              />
            </DistributionSection>

            {/* Exit Year */}
            <DistributionSection
              form={form}
              enabledFieldName="exit_year_enabled"
              title="Exit Year Distribution"
              description="Simulate uncertainty in when exit occurs"
              distributionType="PERT"
            >
              <NumberInputField
                form={form}
                name="exit_year_min"
                label="Earliest Exit"
                description="Minimum years"
                tooltip={TOOLTIPS.exitYearMin}
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
                tooltip={TOOLTIPS.exitYearMode}
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
                tooltip={TOOLTIPS.exitYearMax}
                min={1}
                max={20}
                step={1}
                suffix=" yrs"
                placeholder="10"
              />
            </DistributionSection>

            {/* Dilution */}
            <DistributionSection
              form={form}
              enabledFieldName="dilution_enabled"
              title="Dilution Distribution"
              description="Simulate uncertainty in equity dilution"
              distributionType="PERT"
            >
              <NumberInputField
                form={form}
                name="dilution_min"
                label="Minimum Dilution"
                description="Best case"
                tooltip={TOOLTIPS.dilutionMin}
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
                tooltip={TOOLTIPS.dilutionMode}
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
                tooltip={TOOLTIPS.dilutionMax}
                min={0}
                max={100}
                step={1}
                suffix="%"
                placeholder="50"
              />
            </DistributionSection>

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
            <div className="flex gap-2" data-tour="monte-carlo-run">
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
