"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { NumberInputField, TextInputField, CheckboxField } from "@/components/forms/form-fields";
import { SAFEFormSchema, type SAFEFormData } from "@/lib/schemas";
import { InformationBox } from "@/components/ui/information-box";
import { FileText } from "lucide-react";

interface SAFEFormProps {
  onSubmit: (data: SAFEFormData) => void;
  defaultValues?: Partial<SAFEFormData>;
  submitLabel?: string;
}

export function SAFEForm({
  onSubmit,
  defaultValues,
  submitLabel = "Add SAFE",
}: SAFEFormProps) {
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
          placeholder="e.g., Y Combinator"
        />

        <NumberInputField
          form={form}
          name="investment_amount"
          label="Investment Amount"
          description="Amount invested in this SAFE"
          min={0}
          step={1000}
          prefix="SAR"
          placeholder="500000"
          formatDisplay={true}
        />

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

        <InformationBox className="space-y-3">
          <CheckboxField
            form={form}
            name="pro_rata_rights"
            label="Pro-Rata Rights"
            description="Right to maintain ownership % in future rounds"
          />
          <CheckboxField
            form={form}
            name="mfn_clause"
            label="Most Favored Nation (MFN)"
            description="Gets the best terms of any future SAFE"
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
