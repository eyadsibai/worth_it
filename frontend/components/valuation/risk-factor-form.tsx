"use client";

import * as React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { NumberInputField, TextInputField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import type { RiskFactorSummationFormData } from "@/lib/schemas";

interface RiskFactorFormProps {
  form: UseFormReturn<RiskFactorSummationFormData>;
}

/**
 * Standard 12 risk factors from Ohio TechAngels methodology.
 * Each factor can adjust the valuation by -$500K to +$500K.
 */
const DEFAULT_FACTORS = [
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
];

/**
 * Form for the Risk Factor Summation Method valuation.
 *
 * Starts with a base valuation and adjusts by +/- amounts for 12 standard risk factors.
 * Each factor can add or subtract up to $500K from the base.
 * Ideal for early-stage companies with identifiable risk factors.
 */
export function RiskFactorForm({ form }: RiskFactorFormProps) {
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "factors",
  });

  const addFactor = () => {
    append({ name: "", adjustment: 0 });
  };

  const resetToDefaults = () => {
    replace(DEFAULT_FACTORS);
  };

  // Calculate total adjustment for feedback
  const totalAdjustment = fields.reduce((sum, _field, index) => {
    const adjustment = form.watch(`factors.${index}.adjustment`) || 0;
    return sum + adjustment;
  }, 0);

  const formatAdjustment = (value: number) => {
    const absValue = Math.abs(value);
    const formatted =
      absValue >= 1_000_000
        ? `$${(absValue / 1_000_000).toFixed(1)}M`
        : `$${(absValue / 1_000).toFixed(0)}K`;
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
  };

  return (
    <div className="space-y-4">
      {/* Base Valuation */}
      <NumberInputField
        form={form}
        name="baseValuation"
        label="Base Valuation"
        description="Average pre-money valuation for similar companies in your region/stage"
        prefix="$"
        min={0}
        step={100_000}
        placeholder="1500000"
        formatDisplay={true}
        tooltip="The median pre-money valuation for angel-funded companies in your region and stage. Usually $1M-$3M for seed stage."
      />

      {/* Factors Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Risk Factors</p>
            <p className="text-muted-foreground text-xs">
              Total adjustment:{" "}
              <span className={totalAdjustment >= 0 ? "text-terminal" : "text-destructive"}>
                {formatAdjustment(totalAdjustment)}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resetToDefaults}
              className="h-8"
            >
              <RotateCcw className="mr-1 h-4 w-4" />
              Reset
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={addFactor} className="h-8">
              <Plus className="mr-1 h-4 w-4" />
              Add Factor
            </Button>
          </div>
        </div>

        {/* Factor Headers */}
        <div className="border-muted hidden grid-cols-12 gap-2 border-b pb-2 text-xs md:grid">
          <span className="text-muted-foreground col-span-6">Risk Factor</span>
          <span className="text-muted-foreground col-span-5 text-center">
            Adjustment (-$500K to +$500K)
          </span>
          <span className="col-span-1"></span>
        </div>

        {/* Factor Rows */}
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-12 md:col-span-6">
                <TextInputField
                  form={form}
                  name={`factors.${index}.name`}
                  label=""
                  placeholder="Risk factor name"
                />
              </div>
              <div className="col-span-10 md:col-span-5">
                <NumberInputField
                  form={form}
                  name={`factors.${index}.adjustment`}
                  label=""
                  prefix="$"
                  min={-500_000}
                  max={500_000}
                  step={250_000}
                  placeholder="0"
                  formatDisplay={true}
                  tooltip="Positive = risk mitigated, Negative = elevated risk. Scale: +2 (+$500K), +1 (+$250K), 0 (neutral), -1 (-$250K), -2 (-$500K)."
                />
              </div>
              <div className="col-span-2 flex justify-center md:col-span-1">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
