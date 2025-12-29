"use client";

import * as React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { NumberInputField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { BenchmarkWarning } from "./benchmark-warning";
import { useBenchmarkValidation } from "@/lib/hooks";
import { Plus, Trash2 } from "lucide-react";
import type { DCFFormData, BenchmarkMetric } from "@/lib/schemas";

interface DCFFormProps {
  form: UseFormReturn<DCFFormData>;
  /** Selected industry code for benchmark validation */
  industryCode?: string | null;
  /** Loaded benchmark metrics from the selected industry */
  benchmarks?: Record<string, BenchmarkMetric>;
}

export function DCFForm({ form, industryCode, benchmarks }: DCFFormProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "projectedCashFlows",
  });

  const { validations, validateField } = useBenchmarkValidation(industryCode ?? null);

  // Watch the discount rate field to validate on change
  const discountRate = form.watch("discountRate");

  // Validate discount rate when it changes (convert from percentage to decimal)
  React.useEffect(() => {
    if (discountRate !== undefined && industryCode) {
      validateField("discount_rate", discountRate / 100);
    }
  }, [discountRate, industryCode, validateField]);

  const discountRateValidation = validations["discount_rate"];
  const discountRateBenchmark = benchmarks?.["discount_rate"];

  const addYear = () => {
    append({ value: 0 });
  };

  // Format benchmark values for display (convert from decimal to percentage)
  const discountRateMedianDisplay = discountRateBenchmark
    ? `${Math.round(discountRateBenchmark.median * 100)}%`
    : undefined;
  const discountRateRangeDisplay = discountRateBenchmark
    ? `${Math.round(discountRateBenchmark.typical_low * 100)}% - ${Math.round(discountRateBenchmark.typical_high * 100)}%`
    : undefined;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">Projected Free Cash Flows</p>
          <Button type="button" variant="outline" size="sm" onClick={addYear} className="h-8">
            <Plus className="mr-1 h-4 w-4" />
            Add Year
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <span className="text-muted-foreground w-16 text-sm">Year {index + 1}</span>
              <div className="flex-1">
                <NumberInputField
                  form={form}
                  name={`projectedCashFlows.${index}.value`}
                  label=""
                  prefix="$"
                  step={100000}
                  placeholder={String((index + 1) * 500000)}
                  formatDisplay={true}
                />
              </div>
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <NumberInputField
            form={form}
            name="discountRate"
            label="Discount Rate (WACC)"
            description={
              discountRateMedianDisplay
                ? `Industry median: ${discountRateMedianDisplay}`
                : "Required rate of return"
            }
            suffix="%"
            min={1}
            max={100}
            step={0.5}
            placeholder={
              discountRateBenchmark ? String(Math.round(discountRateBenchmark.median * 100)) : "12"
            }
            tooltip="Weighted Average Cost of Capital or required rate of return. Typically 10-20% for startups."
          />
          {discountRateValidation && discountRateValidation.severity !== "ok" && (
            <BenchmarkWarning
              severity={discountRateValidation.severity}
              message={discountRateValidation.message}
              median={
                discountRateValidation.benchmark_median
                  ? Math.round(discountRateValidation.benchmark_median * 100)
                  : undefined
              }
              suggestedRange={
                discountRateValidation.suggested_range
                  ? [
                      Math.round(discountRateValidation.suggested_range[0] * 100),
                      Math.round(discountRateValidation.suggested_range[1] * 100),
                    ]
                  : undefined
              }
              unit="%"
            />
          )}
        </div>

        <NumberInputField
          form={form}
          name="terminalGrowthRate"
          label="Terminal Growth Rate"
          description={
            discountRateRangeDisplay
              ? `Discount range: ${discountRateRangeDisplay}`
              : "Perpetual growth (optional)"
          }
          suffix="%"
          min={0}
          max={10}
          step={0.1}
          placeholder="3"
          tooltip="Expected long-term growth rate after the projection period. Usually 2-4%."
        />
      </div>
    </div>
  );
}
