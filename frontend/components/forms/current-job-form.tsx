"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CurrentJobFormSchema, type CurrentJobForm } from "@/lib/schemas";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NumberInputField, SliderField, SelectField } from "./form-fields";
import { useDeepCompareEffect } from "@/lib/use-deep-compare";
import { TOOLTIPS } from "@/lib/constants/tooltips";

interface CurrentJobFormProps {
  /** External value to sync with (e.g., from Zustand store) */
  value?: CurrentJobForm | null;
  /** @deprecated Use `value` instead */
  defaultValues?: Partial<CurrentJobForm>;
  onChange?: (data: CurrentJobForm) => void;
}

export function CurrentJobFormComponent({
  value,
  defaultValues,
  onChange,
}: CurrentJobFormProps) {
  // Use value prop if available, otherwise fall back to defaultValues
  const initialValues = value ?? defaultValues;

  const form = useForm<CurrentJobForm>({
    resolver: zodResolver(CurrentJobFormSchema),
    defaultValues: {
      monthly_salary: initialValues?.monthly_salary ?? 0,
      annual_salary_growth_rate: initialValues?.annual_salary_growth_rate ?? 3,
      assumed_annual_roi: initialValues?.assumed_annual_roi ?? 5.4,
      investment_frequency: initialValues?.investment_frequency ?? "Monthly",
    },
    mode: "onChange",
  });

  // Sync form with external value changes (e.g., when loading examples)
  React.useEffect(() => {
    if (value) {
      form.reset(value);
    }
  }, [value, form]);

  // Watch for changes and notify parent
  const watchedValues = form.watch();
  useDeepCompareEffect(() => {
    if (form.formState.isValid && onChange) {
      onChange(watchedValues as CurrentJobForm);
    }
  }, [watchedValues, form.formState.isValid, onChange]);

  return (
    <Card className="glass-card animate-slide-up border-l-4 border-l-chart-3/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-chart-3"></div>
          Current Job
        </CardTitle>
        <CardDescription>Your current employment details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            <NumberInputField
              form={form}
              name="monthly_salary"
              label="Monthly Salary"
              tooltip={TOOLTIPS.currentMonthlySalary}
              min={0}
              step={100}
              prefix="$"
              placeholder="10000"
              formatDisplay={true}
            />

            <SliderField
              form={form}
              name="annual_salary_growth_rate"
              label="Annual Salary Growth Rate"
              tooltip={TOOLTIPS.annualSalaryGrowthRate}
              min={0}
              max={10}
              step={0.1}
              formatValue={(value) => `${value.toFixed(1)}%`}
            />

            <div className="space-y-4 p-4 border rounded-lg bg-gradient-to-br from-muted/30 to-muted/50">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-chart-3"></div>
                Salary Surplus Investment
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If your startup salary is lower, the difference will be invested
              </p>

              <SliderField
                form={form}
                name="assumed_annual_roi"
                label="Assumed Annual ROI"
                tooltip={TOOLTIPS.assumedAnnualROI}
                min={0}
                max={20}
                step={0.1}
                formatValue={(value) => `${value.toFixed(1)}%`}
              />

              <SelectField
                form={form}
                name="investment_frequency"
                label="Investment Frequency"
                tooltip={TOOLTIPS.investmentFrequency}
                options={[
                  { value: "Monthly", label: "Monthly" },
                  { value: "Annually", label: "Annually" },
                ]}
              />
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
