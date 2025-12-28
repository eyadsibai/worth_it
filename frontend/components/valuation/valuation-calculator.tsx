"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calculator,
  TrendingUp,
  DollarSign,
  Target,
  Loader2,
  BarChart3,
  Lightbulb,
  ClipboardList,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { RevenueMultipleForm } from "./revenue-multiple-form";
import { DCFForm } from "./dcf-form";
import { VCMethodForm } from "./vc-method-form";
import { FirstChicagoForm, DEFAULT_SCENARIOS } from "./first-chicago-form";
import { BerkusForm } from "./berkus-form";
import { ScorecardForm } from "./scorecard-form";
import { RiskFactorForm } from "./risk-factor-form";
import { ValuationResult } from "./valuation-result";
import { ValuationComparison } from "./valuation-comparison";
import { FirstChicagoResults } from "./first-chicago-results";
import { MonteCarloToggle } from "./monte-carlo-toggle";
import { MonteCarloResults, type MonteCarloResultData } from "./monte-carlo-results";
import { DistributionInput, type DistributionValue } from "./distribution-input";
import { useValuationMonteCarlo, distributionsToApiFormat } from "@/lib/hooks";
import {
  useCalculateRevenueMultiple,
  useCalculateDCF,
  useCalculateVCMethod,
  useCalculateFirstChicago,
  useCompareValuations,
  useCalculateBerkus,
  useCalculateScorecard,
  useCalculateRiskFactorSummation,
} from "@/lib/api-client";
import {
  RevenueMultipleFormSchema,
  DCFFormSchema,
  VCMethodFormSchema,
  FirstChicagoFormSchema,
  BerkusFormSchema,
  ScorecardFormSchema,
  RiskFactorSummationFormSchema,
  transformValuationResult,
  transformValuationComparison,
  transformFirstChicagoResponse,
  transformBerkusResult,
  transformScorecardResult,
  transformRiskFactorSummationResult,
  type RevenueMultipleFormData,
  type DCFFormData,
  type VCMethodFormData,
  type FirstChicagoFormData,
  type BerkusFormData,
  type ScorecardFormData,
  type RiskFactorSummationFormData,
  type FrontendValuationResult,
  type FrontendValuationComparison,
  type FrontendFirstChicagoResult,
  type FrontendBerkusResult,
  type FrontendScorecardResult,
  type FrontendRiskFactorSummationResult,
} from "@/lib/schemas";

type ValuationMethod =
  | "revenue_multiple"
  | "dcf"
  | "vc_method"
  | "first_chicago"
  | "berkus"
  | "scorecard"
  | "risk_factor_summation";

type PreRevenueResult =
  | FrontendBerkusResult
  | FrontendScorecardResult
  | FrontendRiskFactorSummationResult;

interface MethodResult {
  method: ValuationMethod;
  result: FrontendValuationResult | PreRevenueResult | null;
  error: string | null;
}

const defaultRevenueMultipleValues: RevenueMultipleFormData = {
  annualRevenue: 1000000,
  revenueMultiple: 10,
  growthRate: undefined,
  industryBenchmarkMultiple: undefined,
};

const defaultDCFValues: DCFFormData = {
  projectedCashFlows: [
    { value: 500000 },
    { value: 750000 },
    { value: 1000000 },
    { value: 1500000 },
    { value: 2000000 },
  ],
  discountRate: 12,
  terminalGrowthRate: undefined,
};

const defaultVCMethodValues: VCMethodFormData = {
  projectedExitValue: 100000000,
  exitYear: 5,
  returnType: "multiple",
  targetReturnMultiple: 10,
  targetIRR: undefined,
  expectedDilution: 30,
  exitProbability: 30,
  investmentAmount: undefined,
};

const defaultFirstChicagoValues: FirstChicagoFormData = {
  scenarios: DEFAULT_SCENARIOS,
  discountRate: 25,
  currentInvestment: undefined,
};

// Pre-revenue method defaults
const defaultBerkusValues: BerkusFormData = {
  soundIdea: 250_000,
  prototype: 200_000,
  qualityTeam: 300_000,
  strategicRelationships: 150_000,
  productRollout: 100_000,
  maxPerCriterion: 500_000,
};

const defaultScorecardValues: ScorecardFormData = {
  baseValuation: 1_500_000,
  factors: [
    { name: "Strength of Management Team", weight: 0.3, score: 1.0 },
    { name: "Size of Opportunity", weight: 0.25, score: 1.0 },
    { name: "Product/Technology", weight: 0.15, score: 1.0 },
    { name: "Competitive Environment", weight: 0.1, score: 1.0 },
    { name: "Marketing/Sales Channels", weight: 0.1, score: 1.0 },
    { name: "Need for Additional Investment", weight: 0.05, score: 1.0 },
    { name: "Other Factors", weight: 0.05, score: 1.0 },
  ],
};

const defaultRiskFactorValues: RiskFactorSummationFormData = {
  baseValuation: 1_500_000,
  factors: [
    { name: "Management Risk", adjustment: 0 },
    { name: "Stage of Business", adjustment: 0 },
    { name: "Legislation/Political Risk", adjustment: 0 },
    { name: "Manufacturing Risk", adjustment: 0 },
    { name: "Sales and Marketing Risk", adjustment: 0 },
    { name: "Funding/Capital Raising Risk", adjustment: 0 },
    { name: "Competition Risk", adjustment: 0 },
    { name: "Technology Risk", adjustment: 0 },
    { name: "Litigation Risk", adjustment: 0 },
    { name: "International Risk", adjustment: 0 },
    { name: "Reputation Risk", adjustment: 0 },
    { name: "Exit Potential", adjustment: 0 },
  ],
};

// Default distribution configurations for First Chicago Monte Carlo
const DEFAULT_MC_DISTRIBUTIONS: Record<string, DistributionValue> = {
  best_value: { type: "triangular", params: { min: 40000000, mode: 50000000, max: 80000000 } },
  base_value: { type: "triangular", params: { min: 15000000, mode: 20000000, max: 30000000 } },
  worst_value: { type: "triangular", params: { min: 0, mode: 5000000, max: 10000000 } },
  discount_rate: { type: "normal", params: { mean: 0.25, std: 0.03 } },
};

// Type guard for pre-revenue results
function isPreRevenueResult(
  result: FrontendValuationResult | PreRevenueResult
): result is PreRevenueResult {
  return (
    result.method === "berkus" ||
    result.method === "scorecard" ||
    result.method === "risk_factor_summation"
  );
}

// Format currency helper
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Simple result card for pre-revenue methods
function PreRevenueResultCard({ result }: { result: PreRevenueResult }) {
  const methodLabels = {
    berkus: "Berkus Method",
    scorecard: "Scorecard Method",
    risk_factor_summation: "Risk Factor Summation",
  };

  return (
    <Card className="border-0 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_2px_8px_rgba(0,0,0,0.04)]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="text-primary h-5 w-5" />
          <CardTitle>{methodLabels[result.method]}</CardTitle>
        </div>
        <CardDescription>Pre-revenue valuation estimate</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Estimated Valuation
            </p>
            <p className="text-4xl font-semibold tabular-nums">
              {formatCurrency(result.valuation)}
            </p>
          </div>

          {/* Breakdown for Berkus */}
          {"breakdown" in result && (
            <div className="border-t pt-4">
              <p className="text-muted-foreground mb-2 text-sm font-medium">
                Breakdown by Criterion
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(result.breakdown).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}
                    </span>
                    <span className="font-medium">{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Adjustment factor for Scorecard */}
          {"adjustmentFactor" in result && (
            <div className="border-t pt-4">
              <p className="text-muted-foreground mb-2 text-sm font-medium">Scorecard Details</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adjustment Factor</span>
                  <span className="font-medium">{result.adjustmentFactor.toFixed(2)}x</span>
                </div>
              </div>
            </div>
          )}

          {/* Total adjustment for Risk Factor */}
          {"totalAdjustment" in result && (
            <div className="border-t pt-4">
              <p className="text-muted-foreground mb-2 text-sm font-medium">Risk Adjustment</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Adjustment</span>
                <span
                  className={`font-medium ${result.totalAdjustment >= 0 ? "text-terminal" : "text-destructive"}`}
                >
                  {result.totalAdjustment >= 0 ? "+" : ""}
                  {formatCurrency(result.totalAdjustment)}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ValuationCalculator() {
  const [activeMethod, setActiveMethod] = React.useState<ValuationMethod>("revenue_multiple");
  const [methodResults, setMethodResults] = React.useState<MethodResult[]>([]);
  const [comparison, setComparison] = React.useState<FrontendValuationComparison | null>(null);
  const [firstChicagoResult, setFirstChicagoResult] =
    React.useState<FrontendFirstChicagoResult | null>(null);
  const [firstChicagoError, setFirstChicagoError] = React.useState<string | null>(null);

  // Monte Carlo state
  const [mcEnabled, setMcEnabled] = React.useState(false);
  const [mcSimulations, setMcSimulations] = React.useState(10000);
  const [mcDistributions, setMcDistributions] =
    React.useState<Record<string, DistributionValue>>(DEFAULT_MC_DISTRIBUTIONS);
  const [mcResult, setMcResult] = React.useState<MonteCarloResultData | null>(null);

  // Monte Carlo WebSocket hook
  const {
    isRunning: mcIsRunning,
    progress: mcProgress,
    result: mcStreamResult,
    error: mcError,
    runSimulation: runMonteCarlo,
  } = useValuationMonteCarlo({
    onComplete: (result) => {
      toast.success("Monte Carlo simulation complete", {
        description: `Ran ${mcSimulations.toLocaleString()} simulations`,
      });
      setMcResult(result);
    },
    onError: (error) => {
      toast.error("Simulation failed", { description: error });
    },
  });

  // Update mcResult when streaming result changes
  React.useEffect(() => {
    if (mcStreamResult) {
      setMcResult(mcStreamResult);
    }
  }, [mcStreamResult]);

  // API mutations - revenue-based methods
  const revenueMultipleMutation = useCalculateRevenueMultiple();
  const dcfMutation = useCalculateDCF();
  const vcMethodMutation = useCalculateVCMethod();
  const firstChicagoMutation = useCalculateFirstChicago();
  const compareMutation = useCompareValuations();

  // API mutations - pre-revenue methods
  const berkusMutation = useCalculateBerkus();
  const scorecardMutation = useCalculateScorecard();
  const riskFactorMutation = useCalculateRiskFactorSummation();

  // Forms
  const revenueMultipleForm = useForm<RevenueMultipleFormData>({
    resolver: zodResolver(RevenueMultipleFormSchema),
    defaultValues: defaultRevenueMultipleValues,
  });

  const dcfForm = useForm<DCFFormData>({
    resolver: zodResolver(DCFFormSchema),
    defaultValues: defaultDCFValues,
  });

  const vcMethodForm = useForm<VCMethodFormData>({
    resolver: zodResolver(VCMethodFormSchema),
    defaultValues: defaultVCMethodValues,
  });

  const firstChicagoForm = useForm<FirstChicagoFormData>({
    resolver: zodResolver(FirstChicagoFormSchema),
    defaultValues: defaultFirstChicagoValues,
  });

  // Pre-revenue forms
  const berkusForm = useForm<BerkusFormData>({
    resolver: zodResolver(BerkusFormSchema),
    defaultValues: defaultBerkusValues,
  });

  const scorecardForm = useForm<ScorecardFormData>({
    resolver: zodResolver(ScorecardFormSchema),
    defaultValues: defaultScorecardValues,
  });

  const riskFactorForm = useForm<RiskFactorSummationFormData>({
    resolver: zodResolver(RiskFactorSummationFormSchema),
    defaultValues: defaultRiskFactorValues,
  });

  const isLoading =
    revenueMultipleMutation.isPending ||
    dcfMutation.isPending ||
    vcMethodMutation.isPending ||
    firstChicagoMutation.isPending ||
    berkusMutation.isPending ||
    scorecardMutation.isPending ||
    riskFactorMutation.isPending ||
    compareMutation.isPending ||
    mcIsRunning;

  // Handle Monte Carlo simulation for First Chicago
  const handleFirstChicagoMonteCarlo = () => {
    const formData = firstChicagoForm.getValues();

    // Build distributions from form data + user configured distributions
    const distributions = [
      {
        name: "best_prob",
        distribution_type: "fixed",
        params: { value: formData.scenarios[0].probability / 100 },
      },
      {
        name: "base_prob",
        distribution_type: "fixed",
        params: { value: formData.scenarios[1].probability / 100 },
      },
      {
        name: "worst_prob",
        distribution_type: "fixed",
        params: { value: formData.scenarios[2].probability / 100 },
      },
      {
        name: "years",
        distribution_type: "fixed",
        params: { value: formData.scenarios[0].yearsToExit },
      },
      ...distributionsToApiFormat(mcDistributions),
    ];

    runMonteCarlo({
      method: "first_chicago",
      distributions,
      n_simulations: mcSimulations,
    });
  };

  // Update distribution helper
  const updateDistribution = (name: string, value: DistributionValue) => {
    setMcDistributions((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Revenue Multiple submission
  const handleRevenueMultiple = async (data: RevenueMultipleFormData) => {
    try {
      const response = await revenueMultipleMutation.mutateAsync({
        annual_revenue: data.annualRevenue,
        revenue_multiple: data.revenueMultiple,
        growth_rate: data.growthRate ? data.growthRate / 100 : undefined,
        industry_benchmark_multiple: data.industryBenchmarkMultiple,
      });
      const result = transformValuationResult(response);
      updateMethodResult("revenue_multiple", result, null);
    } catch (error) {
      const message = (error as Error).message;
      updateMethodResult("revenue_multiple", null, message);
      toast.error("Calculation failed", { description: message });
    }
  };

  // Handle DCF submission
  const handleDCF = async (data: DCFFormData) => {
    try {
      const response = await dcfMutation.mutateAsync({
        projected_cash_flows: data.projectedCashFlows.map((cf) => cf.value),
        discount_rate: data.discountRate / 100,
        terminal_growth_rate: data.terminalGrowthRate ? data.terminalGrowthRate / 100 : undefined,
      });
      const result = transformValuationResult(response);
      updateMethodResult("dcf", result, null);
    } catch (error) {
      const message = (error as Error).message;
      updateMethodResult("dcf", null, message);
      toast.error("Calculation failed", { description: message });
    }
  };

  // Handle VC Method submission
  const handleVCMethod = async (data: VCMethodFormData) => {
    try {
      const response = await vcMethodMutation.mutateAsync({
        projected_exit_value: data.projectedExitValue,
        exit_year: data.exitYear,
        target_return_multiple:
          data.returnType === "multiple" ? data.targetReturnMultiple : undefined,
        target_irr: data.returnType === "irr" && data.targetIRR ? data.targetIRR / 100 : undefined,
        expected_dilution: data.expectedDilution / 100,
        exit_probability: data.exitProbability ? data.exitProbability / 100 : 1,
        investment_amount: data.investmentAmount,
      });
      const result = transformValuationResult(response);
      updateMethodResult("vc_method", result, null);
    } catch (error) {
      const message = (error as Error).message;
      updateMethodResult("vc_method", null, message);
      toast.error("Calculation failed", { description: message });
    }
  };

  // Handle First Chicago submission
  const handleFirstChicago = async (data: FirstChicagoFormData) => {
    try {
      // Validate that probabilities sum to 100%
      const totalProbability = data.scenarios.reduce((sum, s) => sum + s.probability, 0);
      if (Math.abs(totalProbability - 100) > 0.01) {
        throw new Error(`Scenario probabilities must sum to 100% (currently ${totalProbability}%)`);
      }

      const response = await firstChicagoMutation.mutateAsync({
        scenarios: data.scenarios.map((s) => ({
          name: s.name,
          probability: s.probability / 100,
          exit_value: s.exitValue,
          years_to_exit: s.yearsToExit,
        })),
        discount_rate: data.discountRate / 100,
        current_investment: data.currentInvestment,
      });
      const result = transformFirstChicagoResponse(response);
      setFirstChicagoResult(result);
      setFirstChicagoError(null);
    } catch (error) {
      const message = (error as Error).message;
      setFirstChicagoResult(null);
      setFirstChicagoError(message);
      toast.error("Calculation failed", { description: message });
    }
  };

  // Handle Berkus Method submission
  const handleBerkus = async (data: BerkusFormData) => {
    try {
      const response = await berkusMutation.mutateAsync({
        sound_idea: data.soundIdea,
        prototype: data.prototype,
        quality_team: data.qualityTeam,
        strategic_relationships: data.strategicRelationships,
        product_rollout: data.productRollout,
        max_per_criterion: data.maxPerCriterion,
      });
      const result = transformBerkusResult(response);
      updateMethodResult("berkus", result, null);
    } catch (error) {
      const message = (error as Error).message;
      updateMethodResult("berkus", null, message);
      toast.error("Calculation failed", { description: message });
    }
  };

  // Handle Scorecard Method submission
  const handleScorecard = async (data: ScorecardFormData) => {
    try {
      const response = await scorecardMutation.mutateAsync({
        base_valuation: data.baseValuation,
        factors: data.factors.map((f) => ({
          name: f.name,
          weight: f.weight,
          score: f.score,
        })),
      });
      const result = transformScorecardResult(response);
      updateMethodResult("scorecard", result, null);
    } catch (error) {
      const message = (error as Error).message;
      updateMethodResult("scorecard", null, message);
      toast.error("Calculation failed", { description: message });
    }
  };

  // Handle Risk Factor Summation submission
  const handleRiskFactor = async (data: RiskFactorSummationFormData) => {
    try {
      const response = await riskFactorMutation.mutateAsync({
        base_valuation: data.baseValuation,
        factors: data.factors.map((f) => ({
          name: f.name,
          adjustment: f.adjustment,
        })),
      });
      const result = transformRiskFactorSummationResult(response);
      updateMethodResult("risk_factor_summation", result, null);
    } catch (error) {
      const message = (error as Error).message;
      updateMethodResult("risk_factor_summation", null, message);
      toast.error("Calculation failed", { description: message });
    }
  };

  const updateMethodResult = (
    method: ValuationMethod,
    result: FrontendValuationResult | PreRevenueResult | null,
    error: string | null
  ) => {
    setMethodResults((prev) => {
      const existing = prev.filter((r) => r.method !== method);
      return [...existing, { method, result, error }];
    });
  };

  const handleSubmit = () => {
    switch (activeMethod) {
      case "revenue_multiple":
        revenueMultipleForm.handleSubmit(handleRevenueMultiple)();
        break;
      case "dcf":
        dcfForm.handleSubmit(handleDCF)();
        break;
      case "vc_method":
        vcMethodForm.handleSubmit(handleVCMethod)();
        break;
      case "first_chicago":
        firstChicagoForm.handleSubmit(handleFirstChicago)();
        break;
      case "berkus":
        berkusForm.handleSubmit(handleBerkus)();
        break;
      case "scorecard":
        scorecardForm.handleSubmit(handleScorecard)();
        break;
      case "risk_factor_summation":
        riskFactorForm.handleSubmit(handleRiskFactor)();
        break;
    }
  };

  const handleCompare = async () => {
    try {
      const revenueMultipleData = revenueMultipleForm.getValues();
      const dcfData = dcfForm.getValues();
      const vcMethodData = vcMethodForm.getValues();

      const response = await compareMutation.mutateAsync({
        revenue_multiple: {
          annual_revenue: revenueMultipleData.annualRevenue,
          revenue_multiple: revenueMultipleData.revenueMultiple,
          growth_rate: revenueMultipleData.growthRate
            ? revenueMultipleData.growthRate / 100
            : undefined,
          industry_benchmark_multiple: revenueMultipleData.industryBenchmarkMultiple,
        },
        dcf: {
          projected_cash_flows: dcfData.projectedCashFlows.map((cf) => cf.value),
          discount_rate: dcfData.discountRate / 100,
          terminal_growth_rate: dcfData.terminalGrowthRate
            ? dcfData.terminalGrowthRate / 100
            : undefined,
        },
        vc_method: {
          projected_exit_value: vcMethodData.projectedExitValue,
          exit_year: vcMethodData.exitYear,
          target_return_multiple:
            vcMethodData.returnType === "multiple" ? vcMethodData.targetReturnMultiple : undefined,
          target_irr:
            vcMethodData.returnType === "irr" && vcMethodData.targetIRR
              ? vcMethodData.targetIRR / 100
              : undefined,
          expected_dilution: vcMethodData.expectedDilution / 100,
          exit_probability: vcMethodData.exitProbability ? vcMethodData.exitProbability / 100 : 1,
          investment_amount: vcMethodData.investmentAmount,
        },
      });
      const result = transformValuationComparison(response);
      setComparison(result);
    } catch (error) {
      const message = (error as Error).message;
      toast.error("Comparison failed", { description: message });
    }
  };

  const currentResult = methodResults.find((r) => r.method === activeMethod);

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="text-primary h-6 w-6" />
            <CardTitle>Startup Valuation Calculator</CardTitle>
          </div>
          <CardDescription>
            Calculate your startup&apos;s valuation using multiple methods and compare results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeMethod} onValueChange={(v) => setActiveMethod(v as ValuationMethod)}>
            {/* Revenue-Based Methods */}
            <div className="mb-4">
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Revenue-Based Methods
              </p>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="revenue_multiple" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Revenue Multiple</span>
                  <span className="sm:hidden">Revenue</span>
                </TabsTrigger>
                <TabsTrigger value="dcf" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">DCF</span>
                  <span className="sm:hidden">DCF</span>
                </TabsTrigger>
                <TabsTrigger value="vc_method" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  <span className="hidden sm:inline">VC Method</span>
                  <span className="sm:hidden">VC</span>
                </TabsTrigger>
                <TabsTrigger value="first_chicago" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">First Chicago</span>
                  <span className="sm:hidden">Chicago</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Pre-Revenue Methods */}
            <div className="mb-6">
              <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
                Pre-Revenue Methods
              </p>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="berkus" className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4" />
                  <span className="hidden sm:inline">Berkus</span>
                  <span className="sm:hidden">Berkus</span>
                </TabsTrigger>
                <TabsTrigger value="scorecard" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  <span className="hidden sm:inline">Scorecard</span>
                  <span className="sm:hidden">Score</span>
                </TabsTrigger>
                <TabsTrigger value="risk_factor_summation" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="hidden sm:inline">Risk Factor</span>
                  <span className="sm:hidden">Risk</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Revenue-Based Tab Contents */}
            <TabsContent value="revenue_multiple">
              <Form {...revenueMultipleForm}>
                <form onSubmit={revenueMultipleForm.handleSubmit(handleRevenueMultiple)}>
                  <RevenueMultipleForm form={revenueMultipleForm} />
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="dcf">
              <Form {...dcfForm}>
                <form onSubmit={dcfForm.handleSubmit(handleDCF)}>
                  <DCFForm form={dcfForm} />
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="vc_method">
              <Form {...vcMethodForm}>
                <form onSubmit={vcMethodForm.handleSubmit(handleVCMethod)}>
                  <VCMethodForm form={vcMethodForm} />
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="first_chicago">
              <div className="space-y-4">
                <Form {...firstChicagoForm}>
                  <form onSubmit={firstChicagoForm.handleSubmit(handleFirstChicago)}>
                    <FirstChicagoForm form={firstChicagoForm} />
                  </form>
                </Form>

                {/* Monte Carlo Enhancement */}
                <MonteCarloToggle
                  enabled={mcEnabled}
                  onEnabledChange={setMcEnabled}
                  simulations={mcSimulations}
                  onSimulationsChange={setMcSimulations}
                />

                {mcEnabled && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Distribution Configuration</CardTitle>
                      <CardDescription>
                        Configure probability distributions for Monte Carlo simulation parameters
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DistributionInput
                        name="best_value"
                        label="Best Case Exit Value"
                        value={mcDistributions.best_value}
                        onChange={(v) => updateDistribution("best_value", v)}
                        prefix="$"
                        description="Exit value in best case scenario"
                      />
                      <DistributionInput
                        name="base_value"
                        label="Base Case Exit Value"
                        value={mcDistributions.base_value}
                        onChange={(v) => updateDistribution("base_value", v)}
                        prefix="$"
                        description="Exit value in base case scenario"
                      />
                      <DistributionInput
                        name="worst_value"
                        label="Worst Case Exit Value"
                        value={mcDistributions.worst_value}
                        onChange={(v) => updateDistribution("worst_value", v)}
                        prefix="$"
                        description="Exit value in worst case scenario"
                      />
                      <DistributionInput
                        name="discount_rate"
                        label="Discount Rate"
                        value={mcDistributions.discount_rate}
                        onChange={(v) => updateDistribution("discount_rate", v)}
                        description="Required rate of return (as decimal, e.g., 0.25 for 25%)"
                      />

                      <Button
                        type="button"
                        onClick={handleFirstChicagoMonteCarlo}
                        disabled={mcIsRunning}
                        className="w-full"
                      >
                        {mcIsRunning ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        Run Monte Carlo Simulation
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Pre-Revenue Tab Contents */}
            <TabsContent value="berkus">
              <Form {...berkusForm}>
                <form onSubmit={berkusForm.handleSubmit(handleBerkus)}>
                  <BerkusForm form={berkusForm} />
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="scorecard">
              <Form {...scorecardForm}>
                <form onSubmit={scorecardForm.handleSubmit(handleScorecard)}>
                  <ScorecardForm form={scorecardForm} />
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="risk_factor_summation">
              <Form {...riskFactorForm}>
                <form onSubmit={riskFactorForm.handleSubmit(handleRiskFactor)}>
                  <RiskFactorForm form={riskFactorForm} />
                </form>
              </Form>
            </TabsContent>
          </Tabs>

          <div className="border-border mt-6 flex flex-wrap gap-3 border-t pt-4">
            <Button onClick={handleSubmit} disabled={isLoading} className="flex-1">
              {isLoading && !mcIsRunning ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Calculator className="mr-2 h-4 w-4" />
              )}
              Calculate {activeMethod.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </Button>
            <Button variant="outline" onClick={handleCompare} disabled={isLoading}>
              Compare All Methods
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Result */}
      {activeMethod !== "first_chicago" &&
        currentResult?.result &&
        (isPreRevenueResult(currentResult.result) ? (
          <PreRevenueResultCard result={currentResult.result} />
        ) : (
          <ValuationResult result={currentResult.result} />
        ))}

      {activeMethod !== "first_chicago" && currentResult?.error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">{currentResult.error}</p>
          </CardContent>
        </Card>
      )}

      {/* First Chicago Results */}
      {activeMethod === "first_chicago" && firstChicagoResult && (
        <FirstChicagoResults result={firstChicagoResult} />
      )}

      {activeMethod === "first_chicago" && firstChicagoError && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">{firstChicagoError}</p>
          </CardContent>
        </Card>
      )}

      {/* Monte Carlo Results */}
      {activeMethod === "first_chicago" && mcEnabled && (mcResult || mcIsRunning) && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="text-primary h-5 w-5" />
            <h3 className="text-lg font-semibold">Monte Carlo Simulation Results</h3>
          </div>
          {mcResult ? (
            <MonteCarloResults result={mcResult} progress={mcProgress} isRunning={mcIsRunning} />
          ) : mcIsRunning ? (
            <Card>
              <CardContent className="py-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Running simulation...</span>
                    <span className="font-mono">{Math.round(mcProgress * 100)}%</span>
                  </div>
                  <Progress value={mcProgress * 100} />
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {activeMethod === "first_chicago" && mcEnabled && mcError && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">{mcError}</p>
          </CardContent>
        </Card>
      )}

      {/* Comparison Results */}
      {comparison && <ValuationComparison comparison={comparison} />}
    </div>
  );
}
