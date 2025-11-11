"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { NumberInputField, SliderField } from "./form-fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { RSUForm } from "@/lib/schemas";

// Simplified schema for the form (without the full dilution rounds complexity)
const RSUFormSimplifiedSchema = z.object({
  monthly_salary: z.number().min(0),
  total_equity_grant_pct: z.number().min(0).max(100),
  vesting_period: z.number().int().min(1).max(10),
  cliff_period: z.number().int().min(0).max(5),
  exit_valuation: z.number().min(0),
  simulate_dilution: z.boolean(),
});

type RSUFormSimplified = z.infer<typeof RSUFormSimplifiedSchema>;

interface RSUFormProps {
  defaultValues?: Partial<RSUForm>;
  onChange?: (data: RSUForm) => void;
}

export function RSUFormComponent({ defaultValues, onChange }: RSUFormProps) {
  const form = useForm<RSUFormSimplified>({
    resolver: zodResolver(RSUFormSimplifiedSchema),
    defaultValues: {
      monthly_salary: defaultValues?.monthly_salary ?? 0,
      total_equity_grant_pct: defaultValues?.total_equity_grant_pct ?? 0,
      vesting_period: defaultValues?.vesting_period ?? 4,
      cliff_period: defaultValues?.cliff_period ?? 1,
      exit_valuation: defaultValues?.exit_valuation ?? 0,
      simulate_dilution: defaultValues?.simulate_dilution ?? false,
    },
    mode: "onChange",
  });

  const watchedValues = form.watch();
  React.useEffect(() => {
    if (form.formState.isValid && onChange) {
      // Convert to full RSUForm type
      const fullData: RSUForm = {
        equity_type: "RSU",
        monthly_salary: watchedValues.monthly_salary,
        total_equity_grant_pct: watchedValues.total_equity_grant_pct,
        vesting_period: watchedValues.vesting_period,
        cliff_period: watchedValues.cliff_period,
        exit_valuation: watchedValues.exit_valuation,
        simulate_dilution: watchedValues.simulate_dilution,
        dilution_rounds: [], // TODO: Add dilution rounds
      };
      onChange(fullData);
    }
  }, [watchedValues, form.formState.isValid, onChange]);

  const simulateDilution = form.watch("simulate_dilution");

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
          name="total_equity_grant_pct"
          label="Total Equity Grant"
          description="Percentage of company equity granted to you"
          min={0}
          max={100}
          step={0.01}
          suffix="%"
          placeholder="0.5"
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

        <NumberInputField
          form={form}
          name="exit_valuation"
          label="Exit Valuation (for RSUs)"
          description="Expected company valuation at exit"
          min={0}
          step={1000000}
          prefix="SAR"
          placeholder="100000000"
        />

        <FormField
          control={form.control}
          name="simulate_dilution"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Simulate Future Fundraising & Dilution</FormLabel>
                <FormDescription>
                  Model how future funding rounds will dilute your equity
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {simulateDilution && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="dilution-rounds">
              <AccordionTrigger>Funding Rounds Configuration</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-4">
                  <p className="text-sm text-muted-foreground">
                    Configure up to 6 funding rounds (Pre-Seed through Series D).
                    Detailed round configuration coming soon.
                  </p>
                  {/* TODO: Add detailed funding round forms */}
                  <div className="space-y-2">
                    {["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D"].map(
                      (round) => (
                        <div
                          key={round}
                          className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                        >
                          <span className="text-sm font-medium">{round}</span>
                          <span className="text-xs text-muted-foreground">Not configured</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </form>
    </Form>
  );
}
