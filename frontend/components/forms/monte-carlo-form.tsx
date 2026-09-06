"use client";

/** Monte Carlo schema bounds */
const MC = {
  SIM_MIN: 100,
  SIM_MAX: 10000,
  GROWTH_MIN: -50,
  GROWTH_MAX: 100,
  ROI_MEAN_MAX: 50,
  ROI_STD_MAX: 20,
  EXIT_YEAR_MAX: 20,
  DILUTION_MAX: 100,
  /** Standard deviations for 95% confidence interval */
  STD_DEV_FACTOR: 2,
  /** Percentage to decimal divisor */
  PCT_DIVISOR: 100,
  /** Logarithmic slider bounds for a whole-company exit valuation (RSU scenarios) */
  VALUATION_MIN: 1_000_000,
  VALUATION_MAX: 10_000_000_000,
  VALUATION_STD_MAX: 5_000_000_000,
  /** Linear slider bounds for a per-share exit price (matches stock-options-form) */
  PRICE_PER_SHARE_MIN: 0,
  PRICE_PER_SHARE_MAX: 500,
  PRICE_PER_SHARE_STEP: 1,
  /** Used only when the scenario has not supplied an exit price yet */
  FALLBACK_VALUATION: 100_000_000,
  FALLBACK_PRICE_PER_SHARE: 50,
  /** Default spread: half the expected exit price */
  DEFAULT_STD_FRACTION: 0.5,
} as const;

/**
 * Tooltips for the per-share exit price sliders.
 *
 * These live here rather than in `lib/constants/tooltips.ts` so that the
 * per-share wording stays adjacent to the fields it describes; the valuation
 * equivalents (`TOOLTIPS.exitValuationMean` / `exitValuationStd`) talk about a
 * whole-company valuation and would be actively misleading here.
 */
const PRICE_PER_SHARE_TOOLTIPS = {
  mean: "Expected (average) price of a single share at exit. The simulation generates share prices centered around this number.",
  std: "Standard deviation measures uncertainty. Higher values mean more variance in simulated exit share prices. ~68% of outcomes fall within ±1 std dev of the mean.",
} as const;

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InformationBox } from "@/components/ui/information-box";
import { SliderField, LogarithmicSliderField, CurrencySliderField } from "./form-fields";
import { DistributionSection } from "./distribution-section";
import { Progress } from "@/components/ui/progress";
import { Loader2, PlayCircle, CheckCircle2 } from "lucide-react";
import { TOOLTIPS } from "@/lib/constants/tooltips";
import { useRunMonteCarlo } from "@/lib/api-client";
import type { MonteCarloRequest, TypedBaseParams, SimParamConfigs } from "@/lib/schemas";

const MonteCarloFormSchema = z.object({
  num_simulations: z.number().int().min(MC.SIM_MIN).max(MC.SIM_MAX),
  // Exit Valuation (normal distribution) - RSU scenarios only
  exit_valuation_mean: z.number().min(0),
  exit_valuation_std: z.number().min(0),
  // Exit Price Per Share (normal distribution) - stock option scenarios only
  exit_price_per_share_mean: z.number().min(0),
  exit_price_per_share_std: z.number().min(0),
  // Salary Growth Rate (PERT distribution)
  growth_rate_enabled: z.boolean(),
  growth_rate_min: z.number().min(MC.GROWTH_MIN).max(MC.GROWTH_MAX),
  growth_rate_mode: z.number().min(MC.GROWTH_MIN).max(MC.GROWTH_MAX),
  growth_rate_max: z.number().min(MC.GROWTH_MIN).max(MC.GROWTH_MAX),
  // ROI (normal distribution)
  roi_enabled: z.boolean(),
  roi_mean: z.number().min(0).max(MC.ROI_MEAN_MAX),
  roi_std: z.number().min(0).max(MC.ROI_STD_MAX),
  // Exit Year (PERT distribution)
  exit_year_enabled: z.boolean(),
  exit_year_min: z.number().int().min(1).max(MC.EXIT_YEAR_MAX),
  exit_year_mode: z.number().int().min(1).max(MC.EXIT_YEAR_MAX),
  exit_year_max: z.number().int().min(1).max(MC.EXIT_YEAR_MAX),
  // Dilution (PERT distribution)
  dilution_enabled: z.boolean(),
  dilution_min: z.number().min(0).max(MC.DILUTION_MAX),
  dilution_mode: z.number().min(0).max(MC.DILUTION_MAX),
  dilution_max: z.number().min(0).max(MC.DILUTION_MAX),
});

export type MonteCarloForm = z.infer<typeof MonteCarloFormSchema>;

export type StartupParams = TypedBaseParams["startup_params"];
export type EquityType = StartupParams["equity_type"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Mean/std slider pair converted to the min/max range the API expects. */
function toRange(mean: number, stdDev: number): { min: number; max: number } {
  // +/- 2 standard deviations captures ~95% of the normal distribution.
  return {
    min: Math.max(0, mean - MC.STD_DEV_FACTOR * stdDev),
    max: mean + MC.STD_DEV_FACTOR * stdDev,
  };
}

/** The scenario's own exit assumption, in the units of its equity type. */
export function scenarioExitPriceOf(startupParams: StartupParams): number {
  return startupParams.equity_type === "STOCK_OPTIONS"
    ? startupParams.exit_price_per_share
    : startupParams.exit_valuation;
}

/**
 * Seed the exit-price sliders from the scenario itself.
 *
 * RSU payouts are priced off the whole company; option payouts off a single
 * share. The two differ by orders of magnitude, so each equity type gets its
 * own slider with its own units - a $60M-$140M range is nonsense as a share
 * price, and $30-$70 is nonsense as a company valuation. Only the slider pair
 * matching `equityType` is seeded from the scenario; the other keeps a generic
 * fallback so it is sensible if the user switches equity type later.
 */
export function deriveExitPriceSeed(equityType: EquityType, scenarioExitPrice: number) {
  const isStockOptions = equityType === "STOCK_OPTIONS";
  const valuationCenter =
    !isStockOptions && scenarioExitPrice > 0
      ? clamp(scenarioExitPrice, MC.VALUATION_MIN, MC.VALUATION_MAX)
      : MC.FALLBACK_VALUATION;
  const priceCenter =
    isStockOptions && scenarioExitPrice > 0
      ? clamp(scenarioExitPrice, MC.PRICE_PER_SHARE_MIN, MC.PRICE_PER_SHARE_MAX)
      : MC.FALLBACK_PRICE_PER_SHARE;

  return {
    exit_valuation_mean: valuationCenter,
    exit_valuation_std: clamp(
      valuationCenter * MC.DEFAULT_STD_FRACTION,
      MC.VALUATION_MIN,
      MC.VALUATION_STD_MAX
    ),
    exit_price_per_share_mean: priceCenter,
    exit_price_per_share_std: clamp(
      priceCenter * MC.DEFAULT_STD_FRACTION,
      MC.PRICE_PER_SHARE_MIN,
      MC.PRICE_PER_SHARE_MAX
    ),
  };
}

/**
 * Translate the form state into the typed `sim_param_configs` wire payload.
 *
 * The exit-price key MUST match the scenario's equity type. The backend picks
 * the driving parameter from `equity_type` (RSU -> `exit_valuation`,
 * STOCK_OPTIONS -> `exit_price_per_share`) and silently ignores a key that does
 * not apply - which turns the whole simulation into a zero-variance point mass
 * that still looks plausible on a chart.
 */
export function buildSimParamConfigs(
  equityType: EquityType,
  data: MonteCarloForm
): SimParamConfigs {
  const sim_param_configs: SimParamConfigs = {};

  // Exit price - always simulated, keyed by equity type.
  if (equityType === "STOCK_OPTIONS") {
    sim_param_configs.exit_price_per_share = toRange(
      data.exit_price_per_share_mean,
      data.exit_price_per_share_std
    );
  } else {
    sim_param_configs.exit_valuation = toRange(data.exit_valuation_mean, data.exit_valuation_std);
  }

  // Salary Growth Rate - convert PERT to simple range (drop mode)
  if (data.growth_rate_enabled) {
    sim_param_configs.current_job_salary_growth_rate = {
      min: data.growth_rate_min / MC.PCT_DIVISOR,
      max: data.growth_rate_max / MC.PCT_DIVISOR,
    };
  }

  // ROI - convert from normal to min/max range
  if (data.roi_enabled) {
    sim_param_configs.annual_roi = toRange(
      data.roi_mean / MC.PCT_DIVISOR,
      data.roi_std / MC.PCT_DIVISOR
    );
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

  return sim_param_configs;
}

interface MonteCarloFormComponentProps {
  baseParams: TypedBaseParams;
  onComplete?: (results: { net_outcomes: number[]; simulated_valuations: number[] }) => void;
}

export function MonteCarloFormComponent({ baseParams, onComplete }: MonteCarloFormComponentProps) {
  const equityType = baseParams.startup_params.equity_type;
  const isStockOptions = equityType === "STOCK_OPTIONS";
  const scenarioExitPrice = scenarioExitPriceOf(baseParams.startup_params);

  const form = useForm<MonteCarloForm>({
    resolver: zodResolver(MonteCarloFormSchema),
    defaultValues: {
      num_simulations: 1000,
      // Exit price (normal distribution) - seeded from the scenario's own
      // exit assumption so the units match the equity type.
      ...deriveExitPriceSeed(equityType, scenarioExitPrice),
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

  // The scenario's equity type can flip while this form stays mounted. A
  // per-share price and a whole-company valuation are not interchangeable, so
  // re-seed the exit-price sliders whenever the type changes. Deliberate slider
  // edits survive everything else - only an equity-type switch re-seeds.
  const { setValue } = form;
  const [seededEquityType, setSeededEquityType] = React.useState(equityType);
  React.useEffect(() => {
    if (seededEquityType === equityType) return;
    setSeededEquityType(equityType);
    const seed = deriveExitPriceSeed(equityType, scenarioExitPrice);
    setValue("exit_valuation_mean", seed.exit_valuation_mean);
    setValue("exit_valuation_std", seed.exit_valuation_std);
    setValue("exit_price_per_share_mean", seed.exit_price_per_share_mean);
    setValue("exit_price_per_share_std", seed.exit_price_per_share_std);
  }, [equityType, seededEquityType, scenarioExitPrice, setValue]);

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
    const request: MonteCarloRequest = {
      num_simulations: data.num_simulations,
      base_params: baseParams,
      sim_param_configs: buildSimParamConfigs(baseParams.startup_params.equity_type, data),
    };

    monteCarloMutation.mutate(request);
  };

  const isRunning = monteCarloMutation.isPending;
  const isComplete = monteCarloMutation.isSuccess;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monte Carlo Simulation</CardTitle>
        <CardDescription>Run probabilistic analysis with thousands of scenarios</CardDescription>
      </CardHeader>
      <CardContent>
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

            {/* Exit price - always enabled, units follow the scenario's equity type */}
            {isStockOptions ? (
              <InformationBox
                title="Exit Price Per Share Distribution (Normal)"
                className="space-y-4"
              >
                <CurrencySliderField
                  form={form}
                  name="exit_price_per_share_mean"
                  label="Mean Exit Price Per Share"
                  description="Expected price of one share at exit"
                  tooltip={PRICE_PER_SHARE_TOOLTIPS.mean}
                  min={MC.PRICE_PER_SHARE_MIN}
                  max={MC.PRICE_PER_SHARE_MAX}
                  step={MC.PRICE_PER_SHARE_STEP}
                  displayFormat="full"
                />

                <CurrencySliderField
                  form={form}
                  name="exit_price_per_share_std"
                  label="Standard Deviation"
                  description="Uncertainty in the exit share price"
                  tooltip={PRICE_PER_SHARE_TOOLTIPS.std}
                  min={MC.PRICE_PER_SHARE_MIN}
                  max={MC.PRICE_PER_SHARE_MAX}
                  step={MC.PRICE_PER_SHARE_STEP}
                  displayFormat="full"
                />
              </InformationBox>
            ) : (
              <InformationBox title="Exit Valuation Distribution (Normal)" className="space-y-4">
                <LogarithmicSliderField
                  form={form}
                  name="exit_valuation_mean"
                  label="Mean Valuation"
                  description="Expected exit valuation"
                  tooltip={TOOLTIPS.exitValuationMean}
                  min={MC.VALUATION_MIN}
                  max={MC.VALUATION_MAX}
                />

                <LogarithmicSliderField
                  form={form}
                  name="exit_valuation_std"
                  label="Standard Deviation"
                  description="Uncertainty in valuation"
                  tooltip={TOOLTIPS.exitValuationStd}
                  min={MC.VALUATION_MIN}
                  max={MC.VALUATION_STD_MAX}
                />
              </InformationBox>
            )}

            {/* Salary Growth Rate */}
            <DistributionSection
              form={form}
              enabledFieldName="growth_rate_enabled"
              title="Salary Growth Rate Distribution"
              description="Simulate uncertainty in salary growth rates"
              distributionType="PERT"
            >
              <SliderField
                form={form}
                name="growth_rate_min"
                label="Minimum"
                description="Pessimistic case"
                tooltip={TOOLTIPS.salaryGrowthMin}
                min={-50}
                max={100}
                step={0.5}
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
              <SliderField
                form={form}
                name="growth_rate_mode"
                label="Most Likely"
                description="Expected case"
                tooltip={TOOLTIPS.salaryGrowthMode}
                min={-50}
                max={100}
                step={0.5}
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
              <SliderField
                form={form}
                name="growth_rate_max"
                label="Maximum"
                description="Optimistic case"
                tooltip={TOOLTIPS.salaryGrowthMax}
                min={-50}
                max={100}
                step={0.5}
                formatValue={(v) => `${v.toFixed(1)}%`}
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
              <SliderField
                form={form}
                name="roi_mean"
                label="Mean ROI"
                description="Expected annual return"
                tooltip={TOOLTIPS.roiMean}
                min={0}
                max={50}
                step={0.5}
                formatValue={(v) => `${v.toFixed(1)}%`}
              />
              <SliderField
                form={form}
                name="roi_std"
                label="Standard Deviation"
                description="Uncertainty in returns"
                tooltip={TOOLTIPS.roiStd}
                min={0}
                max={20}
                step={0.5}
                formatValue={(v) => `${v.toFixed(1)}%`}
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
              <SliderField
                form={form}
                name="exit_year_min"
                label="Earliest Exit"
                description="Minimum years"
                tooltip={TOOLTIPS.exitYearMin}
                min={1}
                max={20}
                step={1}
                formatValue={(v) => `${v} yrs`}
              />
              <SliderField
                form={form}
                name="exit_year_mode"
                label="Expected Exit"
                description="Most likely years"
                tooltip={TOOLTIPS.exitYearMode}
                min={1}
                max={20}
                step={1}
                formatValue={(v) => `${v} yrs`}
              />
              <SliderField
                form={form}
                name="exit_year_max"
                label="Latest Exit"
                description="Maximum years"
                tooltip={TOOLTIPS.exitYearMax}
                min={1}
                max={20}
                step={1}
                formatValue={(v) => `${v} yrs`}
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
              <SliderField
                form={form}
                name="dilution_min"
                label="Minimum Dilution"
                description="Best case"
                tooltip={TOOLTIPS.dilutionMin}
                min={0}
                max={100}
                step={1}
                formatValue={(v) => `${v}%`}
              />
              <SliderField
                form={form}
                name="dilution_mode"
                label="Expected Dilution"
                description="Most likely"
                tooltip={TOOLTIPS.dilutionMode}
                min={0}
                max={100}
                step={1}
                formatValue={(v) => `${v}%`}
              />
              <SliderField
                form={form}
                name="dilution_max"
                label="Maximum Dilution"
                description="Worst case"
                tooltip={TOOLTIPS.dilutionMax}
                min={0}
                max={100}
                step={1}
                formatValue={(v) => `${v}%`}
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
                <p className="text-muted-foreground text-center text-xs">
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
              <div className="border-destructive bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
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
