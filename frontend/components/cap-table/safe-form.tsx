"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  SliderField,
  CurrencySliderField,
  TextInputField,
  CheckboxField,
} from "@/components/forms/form-fields";
import { SAFEFormSchema, type SAFEFormData } from "@/lib/schemas";
import { InformationBox } from "@/components/ui/information-box";
import { FileText } from "lucide-react";
import { TOOLTIPS } from "@/lib/constants/tooltips";

interface SAFEFormProps {
  onSubmit: (data: SAFEFormData) => void;
  defaultValues?: Partial<SAFEFormData>;
  submitLabel?: string;
}

export function SAFEForm({ onSubmit, defaultValues, submitLabel = "Add SAFE" }: SAFEFormProps) {
  const form = useForm<SAFEFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(SAFEFormSchema) as any,
    defaultValues: {
      investor_name: defaultValues?.investor_name ?? "",
      investment_amount: defaultValues?.investment_amount ?? 0,
      valuation_cap: defaultValues?.valuation_cap ?? undefined,
      discount_pct: defaultValues?.discount_pct ?? undefined,
      pro_rata_rights: defaultValues?.pro_rata_rights ?? false,
      mfn_clause: defaultValues?.mfn_clause ?? false,
    },
  });

  const handleSubmit = (data: SAFEFormData) => {
    onSubmit(data);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <TextInputField
          form={form}
          name="investor_name"
          label="Investor Name"
          tooltip={TOOLTIPS.shareholderName}
          placeholder="e.g., Y Combinator"
        />

        <CurrencySliderField
          form={form}
          name="investment_amount"
          label="Investment Amount"
          tooltip={TOOLTIPS.investmentAmount}
          min={0}
          max={10000000}
          step={50000}
        />

        <CurrencySliderField
          form={form}
          name="valuation_cap"
          label="Valuation Cap (Optional)"
          tooltip={TOOLTIPS.valuationCap}
          min={0}
          max={100000000}
          step={500000}
        />

        <SliderField
          form={form}
          name="discount_pct"
          label="Discount % (Optional)"
          tooltip={TOOLTIPS.discountRate}
          min={0}
          max={50}
          step={1}
          formatValue={(v) => `${v}%`}
        />

        <InformationBox className="space-y-3">
          <CheckboxField
            form={form}
            name="pro_rata_rights"
            label="Pro-Rata Rights"
            tooltip={TOOLTIPS.proRataRights}
          />
          <CheckboxField
            form={form}
            name="mfn_clause"
            label="Most Favored Nation (MFN)"
            tooltip={TOOLTIPS.mfnClause}
          />
        </InformationBox>

        <Button type="submit" className="w-full">
          <FileText className="mr-2 h-4 w-4" />
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
