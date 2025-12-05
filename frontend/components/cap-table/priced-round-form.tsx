"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { NumberInputField, SliderField } from "@/components/forms/form-fields";
import { PricedRoundFormSchema, type PricedRoundFormData } from "@/lib/schemas";
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp } from "lucide-react";

interface PricedRoundFormProps {
  onSubmit: (data: PricedRoundFormData) => void;
  defaultValues?: Partial<PricedRoundFormData>;
  submitLabel?: string;
  totalShares?: number; // Current total shares for calculations
}

export function PricedRoundForm({
  onSubmit,
  defaultValues,
  submitLabel = "Add Priced Round",
  totalShares = 10000000,
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

  const postMoney = preMoney + amountRaised;
  const dilutionPct = postMoney > 0 ? (amountRaised / postMoney) * 100 : 0;
  const pricePerShare = totalShares > 0 ? preMoney / totalShares : 0;
  const newShares = pricePerShare > 0 ? amountRaised / pricePerShare : 0;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            control={form.control as any}
            name="round_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Round Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Seed, Series A" {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            control={form.control as any}
            name="lead_investor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lead Investor (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Sequoia Capital" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <NumberInputField
          form={form}
          name="pre_money_valuation"
          label="Pre-Money Valuation"
          description="Company valuation before this round"
          min={0}
          step={100000}
          prefix="SAR"
          placeholder="10000000"
          formatDisplay={true}
        />

        <NumberInputField
          form={form}
          name="amount_raised"
          label="Amount Raised"
          description="Total capital raised in this round"
          min={0}
          step={100000}
          prefix="SAR"
          placeholder="2000000"
          formatDisplay={true}
        />

        {preMoney > 0 && amountRaised > 0 && (
          <div className="p-4 border rounded-lg bg-muted/50 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Post-Money Valuation:</span>
              <span className="font-mono font-medium">SAR {postMoney.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dilution:</span>
              <span className="font-mono text-amber-500">{dilutionPct.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price Per Share:</span>
              <span className="font-mono">SAR {pricePerShare.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">New Shares Issued:</span>
              <span className="font-mono">{newShares.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        )}

        <div className="space-y-4 p-4 border rounded-lg">
          <h4 className="font-medium text-sm">Liquidation Preference</h4>

          <SliderField
            form={form}
            name="liquidation_multiplier"
            label="Multiplier"
            description="Multiplier on invested amount before common"
            min={1}
            max={3}
            step={0.5}
            formatValue={(v) => `${v}x`}
          />

          <FormField
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            control={form.control as any}
            name="participating"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Participating Preferred</FormLabel>
                  <FormDescription>
                    Investor gets preference + pro-rata share of remaining proceeds
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {amountRaised > 0 && (
            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              At exit, investor gets {liquidationMult}x (SAR {(amountRaised * liquidationMult).toLocaleString()})
              {participating ? " + their pro-rata share of remaining proceeds" : " OR their pro-rata share (whichever is higher)"}
            </div>
          )}
        </div>

        <Button type="submit" className="w-full">
          <TrendingUp className="mr-2 h-4 w-4" />
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
}
