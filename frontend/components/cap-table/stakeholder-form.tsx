"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { NumberInputField, SelectField } from "@/components/forms/form-fields";
import { StakeholderFormSchema, type StakeholderFormData } from "@/lib/schemas";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { SliderField } from "@/components/forms/form-fields";
import { UserPlus } from "lucide-react";

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

  const hasVesting = form.watch("has_vesting");

  const handleSubmit = (data: StakeholderFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={form.control as any}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., John Smith" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <SelectField
            form={form}
            name="type"
            label="Type"
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
            options={[
              { value: "common", label: "Common" },
              { value: "preferred", label: "Preferred" },
            ]}
          />
        </div>

        <NumberInputField
          form={form}
          name="ownership_pct"
          label="Ownership %"
          description="Percentage of company owned"
          min={0}
          max={100}
          step={0.1}
          suffix="%"
          placeholder="25"
        />

        <FormField
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={form.control as any}
          name="has_vesting"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Has Vesting Schedule</FormLabel>
                <FormDescription>
                  Enable if shares vest over time
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {hasVesting && (
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
            <SliderField
              form={form}
              name="vesting_months"
              label="Vesting Period"
              description="Total months to vest"
              min={12}
              max={60}
              step={12}
              formatValue={(v) => `${v / 12} years`}
            />

            <SliderField
              form={form}
              name="cliff_months"
              label="Cliff Period"
              description="Months before first vest"
              min={0}
              max={24}
              step={6}
              formatValue={(v) => `${v} months`}
            />
          </div>
        )}

        <Button type="submit" className="w-full">
          <UserPlus className="mr-2 h-4 w-4" />
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
