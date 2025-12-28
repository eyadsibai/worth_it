"use client";

import * as React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { NumberInputField, TextInputField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, RotateCcw } from "lucide-react";
import type { ScorecardFormData } from "@/lib/schemas";

interface ScorecardFormProps {
  form: UseFormReturn<ScorecardFormData>;
}

/**
 * Default Scorecard factors based on Bill Payne's methodology.
 * These represent the standard angel investor evaluation criteria.
 */
const DEFAULT_FACTORS = [
  { name: "Strength of Management Team", weight: 0.3, score: 1.0 },
  { name: "Size of Opportunity", weight: 0.25, score: 1.0 },
  { name: "Product/Technology", weight: 0.15, score: 1.0 },
  { name: "Competitive Environment", weight: 0.1, score: 1.0 },
  { name: "Marketing/Sales Channels", weight: 0.1, score: 1.0 },
  { name: "Need for Additional Investment", weight: 0.05, score: 1.0 },
  { name: "Other Factors", weight: 0.05, score: 1.0 },
];

/**
 * Form for the Scorecard Method (Bill Payne Method) valuation.
 *
 * Compares a startup to average companies in the region/stage using
 * weighted factors. A score of 1.0 equals average.
 * Ideal for seed-stage startups with comparable companies in the market.
 */
export function ScorecardForm({ form }: ScorecardFormProps) {
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "factors",
  });

  const addFactor = () => {
    append({ name: "", weight: 0.1, score: 1.0 });
  };

  const resetToDefaults = () => {
    replace(DEFAULT_FACTORS);
  };

  // Calculate total weight for validation feedback
  const totalWeight = fields.reduce((sum, _field, index) => {
    const weight = form.watch(`factors.${index}.weight`) || 0;
    return sum + weight;
  }, 0);

  const weightIsValid = Math.abs(totalWeight - 1.0) < 0.01;

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
            <p className="text-sm font-medium">Evaluation Factors</p>
            <p className="text-muted-foreground text-xs">
              Weight sum:{" "}
              <span className={weightIsValid ? "text-terminal" : "text-destructive"}>
                {totalWeight.toFixed(2)}
              </span>
              {!weightIsValid && " (should be 1.0)"}
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
          <span className="text-muted-foreground col-span-5">Factor Name</span>
          <span className="text-muted-foreground col-span-3 text-center">Weight (0-1)</span>
          <span className="text-muted-foreground col-span-3 text-center">Score (0-2)</span>
          <span className="col-span-1"></span>
        </div>

        {/* Factor Rows */}
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 items-center gap-2">
              <div className="col-span-12 md:col-span-5">
                <TextInputField
                  form={form}
                  name={`factors.${index}.name`}
                  label=""
                  placeholder="Factor name"
                />
              </div>
              <div className="col-span-5 md:col-span-3">
                <NumberInputField
                  form={form}
                  name={`factors.${index}.weight`}
                  label=""
                  min={0}
                  max={1}
                  step={0.05}
                  placeholder="0.10"
                  tooltip="Weight as decimal (0-1). E.g., 0.30 = 30%. All weights should sum to 1.0."
                />
              </div>
              <div className="col-span-5 md:col-span-3">
                <NumberInputField
                  form={form}
                  name={`factors.${index}.score`}
                  label=""
                  suffix="x"
                  min={0}
                  max={2}
                  step={0.1}
                  placeholder="1.0"
                  tooltip="1.0 = average, <1.0 = below average, >1.0 = above average. Max 2.0."
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
