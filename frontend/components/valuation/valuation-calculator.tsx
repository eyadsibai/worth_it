"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calculator, TrendingUp, DollarSign, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { RevenueMultipleForm } from "./revenue-multiple-form";
import { DCFForm } from "./dcf-form";
import { VCMethodForm } from "./vc-method-form";
import { ValuationResult } from "./valuation-result";
import { ValuationComparison } from "./valuation-comparison";
import {
  useCalculateRevenueMultiple,
  useCalculateDCF,
  useCalculateVCMethod,
  useCompareValuations,
} from "@/lib/api-client";
import {
  RevenueMultipleFormSchema,
  DCFFormSchema,
  VCMethodFormSchema,
  transformValuationResult,
  transformValuationComparison,
  type RevenueMultipleFormData,
  type DCFFormData,
  type VCMethodFormData,
  type FrontendValuationResult,
  type FrontendValuationComparison,
} from "@/lib/schemas";

type ValuationMethod = "revenue_multiple" | "dcf" | "vc_method";

interface MethodResult {
  method: ValuationMethod;
  result: FrontendValuationResult | null;
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

export function ValuationCalculator() {
  const [activeMethod, setActiveMethod] = React.useState<ValuationMethod>("revenue_multiple");
  const [methodResults, setMethodResults] = React.useState<MethodResult[]>([]);
  const [comparison, setComparison] = React.useState<FrontendValuationComparison | null>(null);

  // API mutations
  const revenueMultipleMutation = useCalculateRevenueMultiple();
  const dcfMutation = useCalculateDCF();
  const vcMethodMutation = useCalculateVCMethod();
  const compareMutation = useCompareValuations();

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

  const isLoading =
    revenueMultipleMutation.isPending ||
    dcfMutation.isPending ||
    vcMethodMutation.isPending ||
    compareMutation.isPending;

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
        terminal_growth_rate: data.terminalGrowthRate
          ? data.terminalGrowthRate / 100
          : undefined,
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
        target_irr:
          data.returnType === "irr" && data.targetIRR
            ? data.targetIRR / 100
            : undefined,
        expected_dilution: data.expectedDilution / 100,
        exit_probability: data.exitProbability / 100,
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

  const updateMethodResult = (
    method: ValuationMethod,
    result: FrontendValuationResult | null,
    error: string | null
  ) => {
    setMethodResults((prev) => {
      const existing = prev.filter((r) => r.method !== method);
      return [...existing, { method, result, error }];
    });
  };

  // Compare all methods with results
  const handleCompare = async () => {
    const revenueMultipleData = revenueMultipleForm.getValues();
    const dcfData = dcfForm.getValues();
    const vcMethodData = vcMethodForm.getValues();

    try {
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
            vcMethodData.returnType === "multiple"
              ? vcMethodData.targetReturnMultiple
              : undefined,
          target_irr:
            vcMethodData.returnType === "irr" && vcMethodData.targetIRR
              ? vcMethodData.targetIRR / 100
              : undefined,
          expected_dilution: vcMethodData.expectedDilution / 100,
          exit_probability: vcMethodData.exitProbability / 100,
          investment_amount: vcMethodData.investmentAmount,
        },
      });
      const comparisonResult = transformValuationComparison(response);
      setComparison(comparisonResult);

      // Also update individual results
      comparisonResult.results.forEach((r) => {
        updateMethodResult(r.method as ValuationMethod, r, null);
      });
      toast.success("Comparison complete", {
        description: `Analyzed ${comparisonResult.results.length} valuation methods`,
      });
    } catch (error) {
      console.error("Comparison failed:", error);
      toast.error("Comparison failed", {
        description: (error as Error).message || "Failed to compare valuation methods",
      });
    }
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
    }
  };

  const currentResult = methodResults.find((r) => r.method === activeMethod);

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-[0_1px_2px_rgba(0,0,0,0.03),0_2px_8px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            <CardTitle>Startup Valuation Calculator</CardTitle>
          </div>
          <CardDescription>
            Calculate your startup&apos;s valuation using multiple methods and compare results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeMethod}
            onValueChange={(v) => setActiveMethod(v as ValuationMethod)}
          >
            <TabsList className="grid w-full grid-cols-3 mb-6">
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
            </TabsList>

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
          </Tabs>

          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              Calculate Valuation
            </Button>
            <Button
              variant="outline"
              onClick={handleCompare}
              disabled={isLoading}
            >
              Compare All Methods
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Result */}
      {currentResult?.result && (
        <ValuationResult result={currentResult.result} />
      )}

      {currentResult?.error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-destructive">{currentResult.error}</p>
          </CardContent>
        </Card>
      )}

      {/* Comparison Results */}
      {comparison && <ValuationComparison comparison={comparison} />}
    </div>
  );
}
