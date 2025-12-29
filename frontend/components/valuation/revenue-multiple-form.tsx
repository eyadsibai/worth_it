"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { NumberInputField } from "@/components/forms/form-fields";
import { BenchmarkWarning } from "./benchmark-warning";
import { useBenchmarkValidation } from "@/lib/hooks";
import type { RevenueMultipleFormData, BenchmarkMetric } from "@/lib/schemas";

interface RevenueMultipleFormProps {
  form: UseFormReturn<RevenueMultipleFormData>;
  /** Selected industry code for benchmark validation */
  industryCode?: string | null;
  /** Loaded benchmark metrics from the selected industry */
  benchmarks?: Record<string, BenchmarkMetric>;
}

export function RevenueMultipleForm({ form, industryCode, benchmarks }: RevenueMultipleFormProps) {
  const { validations, validateField } = useBenchmarkValidation(industryCode ?? null);

  // Watch the revenue multiple field to validate on change
  const revenueMultiple = form.watch("revenueMultiple");

  // Validate revenue multiple when it changes
  React.useEffect(() => {
    if (revenueMultiple !== undefined && industryCode) {
      validateField("revenue_multiple", revenueMultiple);
    }
  }, [revenueMultiple, industryCode, validateField]);

  const revenueMultipleValidation = validations["revenue_multiple"];
  const revMultipleBenchmark = benchmarks?.["revenue_multiple"];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <NumberInputField
          form={form}
          name="annualRevenue"
          label="Annual Revenue"
          description="ARR or TTM revenue"
          prefix="$"
          min={0}
          step={100000}
          placeholder="1000000"
          formatDisplay={true}
          tooltip="Your company's annual recurring revenue (ARR) or trailing twelve months (TTM) revenue"
        />

        <div className="space-y-2">
          <NumberInputField
            form={form}
            name="revenueMultiple"
            label="Revenue Multiple"
            description={
              revMultipleBenchmark
                ? `Industry median: ${revMultipleBenchmark.median}x`
                : "Comparable company multiple"
            }
            suffix="x"
            min={0.1}
            max={100}
            step={0.1}
            placeholder={revMultipleBenchmark ? String(revMultipleBenchmark.median) : "10"}
            tooltip="Revenue multiple based on comparable public companies or recent transactions (e.g., 10x revenue)"
          />
          {revenueMultipleValidation && revenueMultipleValidation.severity !== "ok" && (
            <BenchmarkWarning
              severity={revenueMultipleValidation.severity}
              message={revenueMultipleValidation.message}
              median={revenueMultipleValidation.benchmark_median}
              suggestedRange={revenueMultipleValidation.suggested_range}
              unit="x"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumberInputField
          form={form}
          name="growthRate"
          label="Growth Rate"
          description="YoY revenue growth (optional)"
          suffix="%"
          min={-100}
          max={1000}
          step={1}
          placeholder="50"
          tooltip="Year-over-year revenue growth rate. Higher growth typically justifies higher multiples."
        />

        <NumberInputField
          form={form}
          name="industryBenchmarkMultiple"
          label="Industry Benchmark"
          description={
            revMultipleBenchmark
              ? `Typical: ${revMultipleBenchmark.typical_low}x - ${revMultipleBenchmark.typical_high}x`
              : "Industry average multiple (optional)"
          }
          suffix="x"
          min={0.1}
          max={100}
          step={0.1}
          placeholder={revMultipleBenchmark ? String(revMultipleBenchmark.median) : "8"}
          tooltip="Average revenue multiple for your industry to compare against"
        />
      </div>
    </div>
  );
}
