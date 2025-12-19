"use client";

import * as React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { NumberInputField } from "@/components/forms/form-fields";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import type { DCFFormData } from "@/lib/schemas";

interface DCFFormProps {
  form: UseFormReturn<DCFFormData>;
}

export function DCFForm({ form }: DCFFormProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "projectedCashFlows",
  });

  const addYear = () => {
    append({ value: 0 });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Projected Free Cash Flows
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addYear}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Year
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-16">
                Year {index + 1}
              </span>
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
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumberInputField
          form={form}
          name="discountRate"
          label="Discount Rate (WACC)"
          description="Required rate of return"
          suffix="%"
          min={1}
          max={100}
          step={0.5}
          placeholder="12"
          tooltip="Weighted Average Cost of Capital or required rate of return. Typically 10-20% for startups."
        />

        <NumberInputField
          form={form}
          name="terminalGrowthRate"
          label="Terminal Growth Rate"
          description="Perpetual growth (optional)"
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
