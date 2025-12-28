"use client";

import * as React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { NumberInputField, TextInputField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { FirstChicagoFormData } from "@/lib/schemas";

interface FirstChicagoFormProps {
  form: UseFormReturn<FirstChicagoFormData>;
}

const DEFAULT_SCENARIOS = [
  { name: "Best Case", probability: 25, exitValue: 50000000, yearsToExit: 5 },
  { name: "Base Case", probability: 50, exitValue: 20000000, yearsToExit: 5 },
  { name: "Worst Case", probability: 25, exitValue: 5000000, yearsToExit: 5 },
];

export function FirstChicagoForm({ form }: FirstChicagoFormProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "scenarios",
  });

  const addScenario = () => {
    const scenarioNumber = fields.length + 1;
    append({
      name: `Scenario ${scenarioNumber}`,
      probability: 0,
      exitValue: 10000000,
      yearsToExit: 5,
    });
  };

  // Calculate total probability for validation hint
  const scenarios = form.watch("scenarios");
  const totalProbability = scenarios?.reduce((sum, s) => sum + (s.probability || 0), 0) || 0;
  const probabilityValid = Math.abs(totalProbability - 100) < 0.01;

  return (
    <div className="space-y-6">
      {/* Scenarios Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Scenarios</p>
            <p className="text-muted-foreground text-xs">
              Define exit scenarios with probabilities (must sum to 100%)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addScenario}
            className="h-8"
            disabled={fields.length >= 10}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Scenario
          </Button>
        </div>

        {/* Probability indicator */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Total Probability:</span>
          <span
            className={
              probabilityValid ? "font-medium text-green-600" : "text-destructive font-medium"
            }
          >
            {totalProbability.toFixed(1)}%
          </span>
          {!probabilityValid && <span className="text-destructive text-xs">(must equal 100%)</span>}
        </div>

        {/* Scenario Cards */}
        <div className="space-y-4">
          {fields.map((field, index) => (
            <div key={field.id} className="bg-muted/50 relative rounded-lg border p-4">
              {/* Remove button */}
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(index)}
                  className="text-destructive hover:text-destructive absolute top-2 right-2 h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}

              {/* Scenario Name */}
              <div className="mb-4 pr-10">
                <TextInputField
                  form={form}
                  name={`scenarios.${index}.name`}
                  label="Scenario Name"
                  placeholder="e.g., Best Case"
                />
              </div>

              {/* Scenario Parameters */}
              <div className="grid grid-cols-3 gap-4">
                <NumberInputField
                  form={form}
                  name={`scenarios.${index}.probability`}
                  label="Probability"
                  suffix="%"
                  min={0}
                  max={100}
                  step={5}
                  placeholder="25"
                  tooltip="Likelihood of this scenario occurring. All scenarios must sum to 100%."
                />

                <NumberInputField
                  form={form}
                  name={`scenarios.${index}.exitValue`}
                  label="Exit Value"
                  prefix="$"
                  min={0}
                  step={1000000}
                  placeholder="20000000"
                  formatDisplay={true}
                  tooltip="Expected company value at exit in this scenario."
                />

                <NumberInputField
                  form={form}
                  name={`scenarios.${index}.yearsToExit`}
                  label="Years to Exit"
                  min={1}
                  max={20}
                  step={1}
                  placeholder="5"
                  tooltip="Expected number of years until exit event."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Global Parameters */}
      <div className="grid grid-cols-2 gap-4">
        <NumberInputField
          form={form}
          name="discountRate"
          label="Discount Rate"
          description="Required rate of return"
          suffix="%"
          min={1}
          max={100}
          step={1}
          placeholder="25"
          tooltip="Rate used to discount future exit values to present value. Typically 20-40% for early-stage companies."
        />

        <NumberInputField
          form={form}
          name="currentInvestment"
          label="Current Investment (Optional)"
          description="Amount being invested now"
          prefix="$"
          min={0}
          step={100000}
          placeholder="1000000"
          formatDisplay={true}
          tooltip="Optional: Current round investment amount for ROI calculations."
        />
      </div>
    </div>
  );
}

export { DEFAULT_SCENARIOS };
