"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { NumberInputField } from "@/components/forms/form-fields";
import type { RevenueMultipleFormData } from "@/lib/schemas";

interface RevenueMultipleFormProps {
  form: UseFormReturn<RevenueMultipleFormData>;
}

export function RevenueMultipleForm({ form }: RevenueMultipleFormProps) {
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

        <NumberInputField
          form={form}
          name="revenueMultiple"
          label="Revenue Multiple"
          description="Comparable company multiple"
          suffix="x"
          min={0.1}
          max={100}
          step={0.1}
          placeholder="10"
          tooltip="Revenue multiple based on comparable public companies or recent transactions (e.g., 10x revenue)"
        />
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
          description="Industry average multiple (optional)"
          suffix="x"
          min={0.1}
          max={100}
          step={0.1}
          placeholder="8"
          tooltip="Average revenue multiple for your industry to compare against"
        />
      </div>
    </div>
  );
}
