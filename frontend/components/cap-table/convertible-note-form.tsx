"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { NumberInputField, SliderField, TextInputField } from "@/components/forms/form-fields";
import { ConvertibleNoteFormSchema, type ConvertibleNoteFormData } from "@/lib/schemas";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import { InformationBox } from "@/components/ui/information-box";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Banknote } from "lucide-react";

interface ConvertibleNoteFormProps {
  onSubmit: (data: ConvertibleNoteFormData) => void;
  defaultValues?: Partial<ConvertibleNoteFormData>;
  submitLabel?: string;
}

export function ConvertibleNoteForm({
  onSubmit,
  defaultValues,
  submitLabel = "Add Convertible Note",
}: ConvertibleNoteFormProps) {
  const form = useForm<ConvertibleNoteFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(ConvertibleNoteFormSchema) as any,
    defaultValues: {
      investor_name: defaultValues?.investor_name ?? "",
      principal_amount: defaultValues?.principal_amount ?? 0,
      interest_rate: defaultValues?.interest_rate ?? 5,
      interest_type: defaultValues?.interest_type ?? "simple",
      valuation_cap: defaultValues?.valuation_cap ?? undefined,
      discount_pct: defaultValues?.discount_pct ?? undefined,
      maturity_months: defaultValues?.maturity_months ?? 24,
    },
  });

  const handleSubmit = (data: ConvertibleNoteFormData) => {
    onSubmit(data);
    form.reset();
  };

  // Calculate accrued interest preview (simple or compound)
  const principal = form.watch("principal_amount") || 0;
  const rate = form.watch("interest_rate") || 0;
  const months = form.watch("maturity_months") || 24;
  const interestType = form.watch("interest_type") || "simple";

  const years = months / 12;
  const annualRate = rate / 100;
  const accruedInterest = interestType === "compound"
    ? principal * (Math.pow(1 + annualRate, years) - 1)
    : principal * annualRate * years;
  const totalAtMaturity = principal + accruedInterest;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <TextInputField
          form={form}
          name="investor_name"
          label="Investor Name"
          placeholder="e.g., Angel Investor"
        />

        <NumberInputField
          form={form}
          name="principal_amount"
          label="Principal Amount"
          description="Amount loaned in this note"
          min={0}
          step={1000}
          prefix="SAR"
          placeholder="250000"
          formatDisplay={true}
        />

        <div className="grid grid-cols-2 gap-4">
          <SliderField
            form={form}
            name="interest_rate"
            label="Interest Rate"
            description="Annual interest rate"
            min={0}
            max={15}
            step={0.5}
            formatValue={(v) => `${v}%`}
          />

          <SliderField
            form={form}
            name="maturity_months"
            label="Maturity"
            description="Months until maturity"
            min={6}
            max={60}
            step={6}
            formatValue={(v) => `${v} months`}
          />
        </div>

        <FormField
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={form.control as any}
          name="interest_type"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Interest Type</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="simple" id="simple" />
                    <Label htmlFor="simple" className="cursor-pointer">Simple</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="compound" id="compound" />
                    <Label htmlFor="compound" className="cursor-pointer">Compound</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormDescription>
                {interestType === "simple"
                  ? "Interest calculated on principal only (P × r × t)"
                  : "Interest compounded annually (P × (1 + r)^t - P)"}
              </FormDescription>
            </FormItem>
          )}
        />

        {principal > 0 && (
          <InformationBox className="p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Accrued Interest at Maturity:</span>
              <span className="font-mono">SAR {accruedInterest.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Total at Maturity:</span>
              <span className="font-mono font-medium">SAR {totalAtMaturity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </InformationBox>
        )}

        <NumberInputField
          form={form}
          name="valuation_cap"
          label="Valuation Cap (Optional)"
          description="Maximum valuation for conversion"
          min={0}
          step={100000}
          prefix="SAR"
          placeholder="10000000"
          formatDisplay={true}
        />

        <NumberInputField
          form={form}
          name="discount_pct"
          label="Discount % (Optional)"
          description="Discount on next round price"
          min={0}
          max={100}
          step={1}
          suffix="%"
          placeholder="20"
        />

        <Button type="submit" className="w-full">
          <Banknote className="mr-2 h-4 w-4" />
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
