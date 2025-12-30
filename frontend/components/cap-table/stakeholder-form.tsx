"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  SelectField,
  TextInputField,
  CheckboxField,
  SliderField,
} from "@/components/forms/form-fields";
import { StakeholderFormSchema, type StakeholderFormData } from "@/lib/schemas";
import { InformationBox } from "@/components/ui/information-box";
import { UserPlus } from "lucide-react";
import { TOOLTIPS } from "@/lib/constants/tooltips";

interface StakeholderFormProps {
  onSubmit: (data: StakeholderFormData) => void;
  defaultValues?: Partial<StakeholderFormData>;
  submitLabel?: string;
}

export function StakeholderForm({
  onSubmit,
  defaultValues,
  submitLabel = "Add Stakeholder",
}: StakeholderFormProps) {
  const form = useForm<StakeholderFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(StakeholderFormSchema) as any,
    defaultValues: {
      name: defaultValues?.name ?? "",
      type: defaultValues?.type ?? "founder",
      ownership_pct: defaultValues?.ownership_pct ?? 0,
      share_class: defaultValues?.share_class ?? "common",
      has_vesting: defaultValues?.has_vesting ?? false,
      vesting_months: defaultValues?.vesting_months ?? 48,
      cliff_months: defaultValues?.cliff_months ?? 12,
    },
  });

  // useWatch is the hook-based API for subscribing to form values
  const hasVesting = useWatch({
    control: form.control,
    name: "has_vesting",
    defaultValue: false,
  });

  const handleSubmit = (data: StakeholderFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <TextInputField
          form={form}
          name="name"
          label="Name"
          tooltip={TOOLTIPS.shareholderName}
          placeholder="e.g., John Smith"
        />

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            form={form}
            name="type"
            label="Type"
            tooltip={TOOLTIPS.isFounder}
            options={[
              { value: "founder", label: "Founder" },
              { value: "employee", label: "Employee" },
              { value: "investor", label: "Investor" },
              { value: "advisor", label: "Advisor" },
            ]}
          />

          <SelectField
            form={form}
            name="share_class"
            label="Share Class"
            tooltip={TOOLTIPS.shareClass}
            options={[
              { value: "common", label: "Common" },
              { value: "preferred", label: "Preferred" },
            ]}
          />
        </div>

        <SliderField
          form={form}
          name="ownership_pct"
          label="Ownership %"
          tooltip={TOOLTIPS.sharesOwned}
          min={0}
          max={100}
          step={0.1}
          formatValue={(v) => `${v.toFixed(1)}%`}
        />

        <InformationBox variant="default" className="rounded-md">
          <CheckboxField
            form={form}
            name="has_vesting"
            label="Has Vesting Schedule"
            description="Enable if shares vest over time"
          />
        </InformationBox>

        {hasVesting && (
          <InformationBox className="grid grid-cols-2 gap-4">
            <SliderField
              form={form}
              name="vesting_months"
              label="Vesting Period"
              tooltip={TOOLTIPS.vestingPeriod}
              min={12}
              max={60}
              step={12}
              formatValue={(v) => `${v / 12} years`}
            />

            <SliderField
              form={form}
              name="cliff_months"
              label="Cliff Period"
              tooltip={TOOLTIPS.cliffPeriod}
              min={0}
              max={24}
              step={6}
              formatValue={(v) => `${v} months`}
            />
          </InformationBox>
        )}

        <Button type="submit" className="w-full">
          <UserPlus className="mr-2 h-4 w-4" />
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
