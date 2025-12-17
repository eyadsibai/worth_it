"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { NumberInputField, SliderField, SelectField } from "./form-fields";
import { useDeepCompareEffect } from "@/lib/use-deep-compare";
import { isValidStockOptionsData } from "@/lib/validation";
import type { StockOptionsForm } from "@/lib/schemas";
import { TOOLTIPS } from "@/lib/constants/tooltips";
import { FIELD_HINTS, FIELD_EXAMPLES } from "@/lib/constants/examples";

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
  /** External value to sync with (e.g., from Zustand store) */
  value?: StockOptionsForm | null;
  /** @deprecated Use `value` prop instead for controlled form synchronization */
  defaultValues?: Partial<StockOptionsForm>;
  onChange?: (data: StockOptionsForm) => void;
}

export function StockOptionsFormComponent({
  value,
  defaultValues,
  onChange,
}: StockOptionsFormProps) {
  // Use value prop if available, otherwise fall back to defaultValues
  const initialValues = value ?? defaultValues;

  const form = useForm<StockOptionsFormSimplified>({
    resolver: zodResolver(StockOptionsFormSimplifiedSchema),
    defaultValues: {
      monthly_salary: initialValues?.monthly_salary ?? 0,
      num_options: initialValues?.num_options ?? 0,
      strike_price: initialValues?.strike_price ?? 0,
      vesting_period: initialValues?.vesting_period ?? 4,
      cliff_period: initialValues?.cliff_period ?? 1,
      exercise_strategy: initialValues?.exercise_strategy ?? "AT_EXIT",
      exercise_year: initialValues?.exercise_year,
      exit_price_per_share: initialValues?.exit_price_per_share ?? 0,
    },
    mode: "onChange",
  });

  // Sync form with external value changes (e.g., when loading examples)
  React.useEffect(() => {
    if (value) {
      // Strip equity_type since form uses simplified schema without it
      const { equity_type: _, ...formValues } = value;
      form.reset(formValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const watchedValues = form.watch();
  useDeepCompareEffect(() => {
    if (form.formState.isValid && onChange) {
      const fullData: StockOptionsForm = {
        equity_type: "STOCK_OPTIONS",
        ...watchedValues,
      };
      // Only propagate data when it has meaningful values (not zeros)
      // This prevents 400 errors from the backend when the form first mounts
      if (isValidStockOptionsData(fullData)) {
        onChange(fullData);
      }
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
          tooltip={TOOLTIPS.startupMonthlySalary}
          min={0}
          step={100}
          prefix="$"
          formatDisplay={true}
          exampleValue={FIELD_EXAMPLES.startup_monthly_salary}
          hint={FIELD_HINTS.startup_monthly_salary}
        />

        <NumberInputField
          form={form}
          name="num_options"
          label="Number of Options"
          tooltip={TOOLTIPS.numOptions}
          min={0}
          step={1000}
          formatDisplay={true}
          exampleValue={FIELD_EXAMPLES.number_of_options}
          hint={FIELD_HINTS.number_of_options}
        />

        <NumberInputField
          form={form}
          name="strike_price"
          label="Strike Price"
          tooltip={TOOLTIPS.strikePrice}
          min={0}
          step={0.01}
          prefix="$"
          exampleValue={FIELD_EXAMPLES.strike_price}
          hint={FIELD_HINTS.strike_price}
        />

        <div className="grid grid-cols-2 gap-4">
          <SliderField
            form={form}
            name="vesting_period"
            label="Vesting Period"
            tooltip={TOOLTIPS.vestingPeriod}
            min={1}
            max={10}
            step={1}
            formatValue={(value) => `${value} years`}
          />

          <SliderField
            form={form}
            name="cliff_period"
            label="Cliff Period"
            tooltip={TOOLTIPS.cliffPeriod}
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
          tooltip={TOOLTIPS.exitPricePerShare}
          min={0}
          step={1}
          prefix="$"
          exampleValue={FIELD_EXAMPLES.current_share_price}
          hint={FIELD_HINTS.current_share_price}
        />
      </form>
    </Form>
  );
}
