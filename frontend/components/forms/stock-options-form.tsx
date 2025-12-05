"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { NumberInputField, SliderField, SelectField } from "./form-fields";
import { useDeepCompareEffect } from "@/lib/use-deep-compare";
import type { StockOptionsForm } from "@/lib/schemas";

// Simplified schema for the form
const StockOptionsFormSimplifiedSchema = z.object({
  monthly_salary: z.number().min(0),
  num_options: z.number().int().min(0),
  strike_price: z.number().min(0),
  vesting_period: z.number().int().min(1).max(10),
  cliff_period: z.number().int().min(0).max(5),
  exercise_strategy: z.enum(["AT_EXIT", "AFTER_VESTING"]),
  exercise_year: z.number().int().min(1).max(20).optional(),
  exit_price_per_share: z.number().min(0),
});

type StockOptionsFormSimplified = z.infer<typeof StockOptionsFormSimplifiedSchema>;

interface StockOptionsFormProps {
  defaultValues?: Partial<StockOptionsForm>;
  onChange?: (data: StockOptionsForm) => void;
}

export function StockOptionsFormComponent({
  defaultValues,
  onChange,
}: StockOptionsFormProps) {
  const form = useForm<StockOptionsFormSimplified>({
    resolver: zodResolver(StockOptionsFormSimplifiedSchema),
    defaultValues: {
      monthly_salary: defaultValues?.monthly_salary ?? 0,
      num_options: defaultValues?.num_options ?? 0,
      strike_price: defaultValues?.strike_price ?? 0,
      vesting_period: defaultValues?.vesting_period ?? 4,
      cliff_period: defaultValues?.cliff_period ?? 1,
      exercise_strategy: defaultValues?.exercise_strategy ?? "AT_EXIT",
      exercise_year: defaultValues?.exercise_year,
      exit_price_per_share: defaultValues?.exit_price_per_share ?? 0,
    },
    mode: "onChange",
  });

  const watchedValues = form.watch();
  useDeepCompareEffect(() => {
    if (form.formState.isValid && onChange) {
      const fullData: StockOptionsForm = {
        equity_type: "STOCK_OPTIONS",
        ...watchedValues,
      };
      onChange(fullData);
    }
  }, [watchedValues, form.formState.isValid, onChange]);

  const exerciseStrategy = form.watch("exercise_strategy");

  return (
    <Form {...form}>
      <form className="space-y-6">
        <NumberInputField
          form={form}
          name="monthly_salary"
          label="Monthly Salary"
          description="Your monthly salary at the startup"
          min={0}
          step={100}
          prefix="SAR"
          placeholder="8000"
        />

        <NumberInputField
          form={form}
          name="num_options"
          label="Number of Options"
          description="Total stock options granted to you"
          min={0}
          step={1000}
          placeholder="10000"
          formatDisplay={true}
        />

        <NumberInputField
          form={form}
          name="strike_price"
          label="Strike Price"
          description="Price to exercise each option"
          min={0}
          step={0.01}
          prefix="SAR"
          placeholder="1.00"
        />

        <div className="grid grid-cols-2 gap-4">
          <SliderField
            form={form}
            name="vesting_period"
            label="Vesting Period"
            description="Total years to vest"
            min={1}
            max={10}
            step={1}
            formatValue={(value) => `${value} years`}
          />

          <SliderField
            form={form}
            name="cliff_period"
            label="Cliff Period"
            description="Years before first vest"
            min={0}
            max={5}
            step={1}
            formatValue={(value) => `${value} ${value === 1 ? "year" : "years"}`}
          />
        </div>

        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium text-sm">Exercise Strategy</h4>

          <SelectField
            form={form}
            name="exercise_strategy"
            label="When to Exercise"
            description="Choose when you'll exercise your options"
            options={[
              { value: "AT_EXIT", label: "At Exit (IPO/Acquisition)" },
              { value: "AFTER_VESTING", label: "After Vesting" },
            ]}
          />

          {exerciseStrategy === "AFTER_VESTING" && (
            <SliderField
              form={form}
              name="exercise_year"
              label="Exercise Year"
              description="Year when you'll exercise options"
              min={1}
              max={20}
              step={1}
              formatValue={(value) => `Year ${value}`}
            />
          )}
        </div>

        <NumberInputField
          form={form}
          name="exit_price_per_share"
          label="Exit Price Per Share"
          description="Expected price per share at exit"
          min={0}
          step={1}
          prefix="SAR"
          placeholder="10.00"
        />
      </form>
    </Form>
  );
}
