"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CurrentJobFormSchema, type CurrentJobForm } from "@/lib/schemas";
import { Form } from "@/components/ui/form";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { InformationBox } from "@/components/ui/information-box";
import { SliderField, SelectField, CurrencySliderField } from "./form-fields";
import { useDeepCompareEffect } from "@/lib/use-deep-compare";
import { TOOLTIPS } from "@/lib/constants/tooltips";
import { FIELD_HINTS } from "@/lib/constants/examples";

interface CurrentJobFormProps {
  /** External value to sync with (e.g., from Zustand store) */
  value?: CurrentJobForm | null;
  /** @deprecated Use `value` prop instead for controlled form synchronization */
  defaultValues?: Partial<CurrentJobForm>;
  /** Callback fired when form values change (only fires when form is valid) */
  onChange?: (data: CurrentJobForm) => void;
  /** Enable collapsible card behavior @default true */
  collapsible?: boolean;
  /** Initial open state when collapsible @default true */
  defaultOpen?: boolean;
}

export function CurrentJobFormComponent({
  value,
  defaultValues,
  onChange,
  collapsible = true,
  defaultOpen = true,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Watch for changes and notify parent
  const watchedValues = form.watch();
  useDeepCompareEffect(() => {
    if (form.formState.isValid && onChange) {
      onChange(watchedValues as CurrentJobForm);
    }
  }, [watchedValues, form.formState.isValid, onChange]);

  const formContent = (
    <Form {...form}>
      <form className="space-y-6">
        <CurrencySliderField
          form={form}
          name="monthly_salary"
          label="Monthly Salary"
          tooltip={TOOLTIPS.currentMonthlySalary}
          min={0}
          max={30000}
          step={250}
          description={FIELD_HINTS.monthly_salary}
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

        <InformationBox
          title="Salary Surplus Investment"
          description="If your startup salary is lower, the difference will be invested"
          variant="gradient"
          accentColor="chart-3"
          className="space-y-4"
        >
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
        </InformationBox>
      </form>
    </Form>
  );

  return (
    <CollapsibleCard
      title="Current Job"
      description="Your current employment details"
      accentColor="chart-3"
      collapsible={collapsible}
      defaultOpen={defaultOpen}
      dataTour="current-job-card"
    >
      {formContent}
    </CollapsibleCard>
  );
}
