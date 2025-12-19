"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { NumberInputField, SelectField } from "@/components/forms/form-fields";
import type { VCMethodFormData } from "@/lib/schemas";

interface VCMethodFormProps {
  form: UseFormReturn<VCMethodFormData>;
}

export function VCMethodForm({ form }: VCMethodFormProps) {
  const returnType = form.watch("returnType");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <NumberInputField
          form={form}
          name="projectedExitValue"
          label="Projected Exit Value"
          description="Expected acquisition/IPO value"
          prefix="$"
          min={1000000}
          step={1000000}
          placeholder="100000000"
          formatDisplay={true}
          tooltip="Expected company valuation at exit (acquisition or IPO)"
        />

        <NumberInputField
          form={form}
          name="exitYear"
          label="Exit Year"
          description="Years until exit (1-15)"
          suffix=" years"
          min={1}
          max={15}
          step={1}
          placeholder="5"
          tooltip="Expected number of years until exit event"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SelectField
          form={form}
          name="returnType"
          label="Return Target Type"
          description="How to specify target return"
          options={[
            { value: "multiple", label: "Target Multiple (e.g., 10x)" },
            { value: "irr", label: "Target IRR (e.g., 40%)" },
          ]}
          tooltip="Choose whether to specify target return as a multiple or IRR"
        />

        {returnType === "multiple" ? (
          <NumberInputField
            form={form}
            name="targetReturnMultiple"
            label="Target Return Multiple"
            description="VC target return"
            suffix="x"
            min={1.1}
            max={100}
            step={0.5}
            placeholder="10"
            tooltip="Minimum return multiple investors require (typically 10-30x for early stage)"
          />
        ) : (
          <NumberInputField
            form={form}
            name="targetIRR"
            label="Target IRR"
            description="Annual return rate"
            suffix="%"
            min={1}
            max={200}
            step={1}
            placeholder="40"
            tooltip="Target Internal Rate of Return (typically 30-60% for VCs)"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumberInputField
          form={form}
          name="expectedDilution"
          label="Expected Dilution"
          description="Dilution from future rounds"
          suffix="%"
          min={0}
          max={99}
          step={1}
          placeholder="30"
          tooltip="Expected ownership dilution from subsequent funding rounds"
        />

        <NumberInputField
          form={form}
          name="exitProbability"
          label="Exit Probability"
          description="Likelihood of achieving exit"
          suffix="%"
          min={1}
          max={100}
          step={5}
          placeholder="30"
          tooltip="Probability of achieving the projected exit (risk adjustment)"
        />
      </div>

      <NumberInputField
        form={form}
        name="investmentAmount"
        label="Investment Amount"
        description="Amount to be invested (optional)"
        prefix="$"
        min={0}
        step={100000}
        placeholder="5000000"
        formatDisplay={true}
        tooltip="Investment amount for calculating pre-money valuation"
      />
    </div>
  );
}
