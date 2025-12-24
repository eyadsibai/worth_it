"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  NumberInputField,
  SliderField,
  TextInputField,
  CheckboxField,
} from "@/components/forms/form-fields";
import { PricedRoundFormSchema, type PricedRoundFormData } from "@/lib/schemas";
import { InformationBox } from "@/components/ui/information-box";
import { TOOLTIPS } from "@/lib/constants/tooltips";
import { TrendingUp } from "lucide-react";
import { DilutionPreview } from "./dilution-preview";
import type { Stakeholder } from "@/lib/schemas";

interface PricedRoundFormProps {
  onSubmit: (data: PricedRoundFormData) => void;
  defaultValues?: Partial<PricedRoundFormData>;
  submitLabel?: string;
  totalShares?: number; // Current total shares for calculations
  stakeholders?: Stakeholder[]; // For dilution preview
  optionPoolPct?: number; // For dilution preview
}

export function PricedRoundForm({
  onSubmit,
  defaultValues,
  submitLabel = "Add Priced Round",
  totalShares = 10000000,
  stakeholders = [],
  optionPoolPct = 0,
}: PricedRoundFormProps) {
  const form = useForm<PricedRoundFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(PricedRoundFormSchema) as any,
    defaultValues: {
      round_name: defaultValues?.round_name ?? "",
      lead_investor: defaultValues?.lead_investor ?? "",
      pre_money_valuation: defaultValues?.pre_money_valuation ?? 0,
      amount_raised: defaultValues?.amount_raised ?? 0,
      liquidation_multiplier: defaultValues?.liquidation_multiplier ?? 1,
      participating: defaultValues?.participating ?? false,
    },
  });

  const handleSubmit = (data: PricedRoundFormData) => {
    onSubmit(data);
    form.reset();
  };

  // Calculate round metrics in real-time
  const preMoney = form.watch("pre_money_valuation") || 0;
  const amountRaised = form.watch("amount_raised") || 0;
  const participating = form.watch("participating");
  const liquidationMult = form.watch("liquidation_multiplier") || 1;
  const leadInvestor = form.watch("lead_investor") || "";

  const postMoney = preMoney + amountRaised;
  const dilutionPct = postMoney > 0 ? (amountRaised / postMoney) * 100 : 0;
  const pricePerShare = totalShares > 0 ? preMoney / totalShares : 0;
  const newShares = pricePerShare > 0 ? amountRaised / pricePerShare : 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <TextInputField
            form={form}
            name="round_name"
            label="Round Name"
            placeholder="e.g., Seed, Series A"
          />
          <TextInputField
            form={form}
            name="lead_investor"
            label="Lead Investor (Optional)"
            placeholder="e.g., Sequoia Capital"
          />
        </div>

        <NumberInputField
          form={form}
          name="pre_money_valuation"
          label="Pre-Money Valuation"
          description="Company valuation before this round"
          tooltip={TOOLTIPS.preMoneyValuation}
          min={0}
          step={100000}
          prefix="$"
          placeholder="10000000"
          formatDisplay={true}
        />

        <NumberInputField
          form={form}
          name="amount_raised"
          label="Amount Raised"
          description="Total capital raised in this round"
          tooltip={TOOLTIPS.amountRaised}
          min={0}
          step={100000}
          prefix="$"
          placeholder="2000000"
          formatDisplay={true}
        />

        {preMoney > 0 && amountRaised > 0 && (
          <InformationBox className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Post-Money Valuation:</span>
              <span className="font-medium tabular-nums">${postMoney.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dilution:</span>
              <span className="text-amber-500 tabular-nums">
                {dilutionPct.toFixed(2).replace(/\.?0+$/, "")}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price Per Share:</span>
              <span className="tabular-nums">
                ${pricePerShare.toFixed(4).replace(/\.?0+$/, "")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New Shares Issued:</span>
              <span className="tabular-nums">
                {newShares.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </InformationBox>
        )}

        {/* Dilution Preview - shows detailed before/after ownership */}
        {stakeholders.length > 0 && (
          <DilutionPreview
            stakeholders={stakeholders}
            optionPoolPct={optionPoolPct}
            preMoneyValuation={preMoney}
            amountRaised={amountRaised}
            investorName={leadInvestor || "New Investor"}
          />
        )}

        <InformationBox variant="default" title="Liquidation Preference" className="space-y-4">
          <SliderField
            form={form}
            name="liquidation_multiplier"
            label="Multiplier"
            description="Multiplier on invested amount before common"
            tooltip={TOOLTIPS.liquidationMultiplier}
            min={1}
            max={3}
            step={0.5}
            formatValue={(v) => `${v}x`}
          />

          <CheckboxField
            form={form}
            name="participating"
            label="Participating Preferred"
            description="Investor gets preference + pro-rata share of remaining proceeds"
            tooltip={TOOLTIPS.participatingPreferred}
          />

          {amountRaised > 0 && (
            <div className="text-muted-foreground bg-muted rounded p-2 text-xs">
              At exit, investor gets {liquidationMult}x (${" "}
              {(amountRaised * liquidationMult).toLocaleString()})
              {participating
                ? " + their pro-rata share of remaining proceeds"
                : " OR their pro-rata share (whichever is higher)"}
            </div>
          )}
        </InformationBox>

        <Button type="submit" className="w-full">
          <TrendingUp className="mr-2 h-4 w-4" />
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
