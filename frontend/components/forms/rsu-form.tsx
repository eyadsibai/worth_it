"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { NumberInputField, SliderField } from "./form-fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DilutionRoundFormComponent } from "./dilution-round-form";
import { RSUFormSchema } from "@/lib/schemas";
import type { RSUForm, DilutionRoundForm } from "@/lib/schemas";
import { useDeepCompareEffect } from "@/lib/use-deep-compare";

interface RSUFormProps {
  defaultValues?: Partial<RSUForm>;
  onChange?: (data: RSUForm) => void;
}

export function RSUFormComponent({ defaultValues, onChange }: RSUFormProps) {
  const form = useForm<RSUForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(RSUFormSchema) as any,
    defaultValues: {
      equity_type: "RSU" as const,
      monthly_salary: defaultValues?.monthly_salary ?? 0,
      total_equity_grant_pct: defaultValues?.total_equity_grant_pct ?? 0,
      vesting_period: defaultValues?.vesting_period ?? 4,
      cliff_period: defaultValues?.cliff_period ?? 1,
      exit_valuation: defaultValues?.exit_valuation ?? 0,
      simulate_dilution: defaultValues?.simulate_dilution ?? false,
      dilution_rounds: defaultValues?.dilution_rounds ?? [
        { round_name: "Pre-Seed", round_type: "SAFE_NOTE" as const, year: 0, enabled: false, dilution_pct: 10, pre_money_valuation: 5000000, amount_raised: 500000, salary_change: 0 },
        { round_name: "Seed", round_type: "SAFE_NOTE" as const, year: 1, enabled: false, dilution_pct: 15, pre_money_valuation: 8000000, amount_raised: 1500000, salary_change: 0 },
        { round_name: "Series A", round_type: "PRICED_ROUND" as const, year: 2, enabled: false, dilution_pct: 20, pre_money_valuation: 15000000, amount_raised: 5000000, salary_change: 0 },
        { round_name: "Series B", round_type: "PRICED_ROUND" as const, year: 3, enabled: false, dilution_pct: 18, pre_money_valuation: 40000000, amount_raised: 10000000, salary_change: 0 },
        { round_name: "Series C", round_type: "PRICED_ROUND" as const, year: 4, enabled: false, dilution_pct: 15, pre_money_valuation: 80000000, amount_raised: 15000000, salary_change: 0 },
        { round_name: "Series D", round_type: "PRICED_ROUND" as const, year: 5, enabled: false, dilution_pct: 12, pre_money_valuation: 150000000, amount_raised: 20000000, salary_change: 0 },
      ],
    },
    mode: "onChange",
  });

  const watchedValues = form.watch();
  useDeepCompareEffect(() => {
    if (form.formState.isValid && onChange) {
      onChange(watchedValues as RSUForm);
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={form.control as any}
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
          <Accordion type="single" collapsible className="w-full" defaultValue="dilution-rounds">
            <AccordionItem value="dilution-rounds">
              <AccordionTrigger>Funding Rounds Configuration</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-4">
                  <p className="text-sm text-muted-foreground">
                    Configure funding rounds that will dilute your equity. Each round can include dilution percentage, valuation, amount raised, and salary changes.
                  </p>

                  <div className="space-y-3">
                    {(watchedValues.dilution_rounds as DilutionRoundForm[])?.map((round, index) => (
                      <DilutionRoundFormComponent
                        key={`${round.round_name}-${index}`}
                        form={form}
                        roundIndex={index}
                        roundName={round.round_name}
                        canRemove={false}
                      />
                    ))}
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
