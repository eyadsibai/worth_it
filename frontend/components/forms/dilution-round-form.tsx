"use client";

/** Tolerance for floating-point comparison to prevent infinite useEffect loops */
const DILUTION_TOLERANCE = 0.01;

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Trash2, Settings } from "lucide-react";
import { SliderField, CurrencySliderField, SelectField, RadioField } from "./form-fields";
import type { DilutionRoundForm } from "@/lib/schemas";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { calculateDilutionFromValuation } from "@/lib/dilution-utils";

interface DilutionRoundFormComponentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  roundIndex: number;
  roundName: string;
  onRemove?: () => void;
  canRemove?: boolean;
}

export function DilutionRoundFormComponent({
  form,
  roundIndex,
  roundName,
  onRemove,
  canRemove = true,
}: DilutionRoundFormComponentProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const watchedRound = form.watch(`dilution_rounds.${roundIndex}`) as DilutionRoundForm;
  const isEnabled = watchedRound?.enabled || false;
  const dilutionMethod = watchedRound?.dilution_method || "percentage";

  // Auto-compute dilution_pct when in valuation mode
  React.useEffect(() => {
    if (dilutionMethod !== "valuation") return;

    const preMoneyValuation = watchedRound?.pre_money_valuation ?? 0;
    const amountRaised = watchedRound?.amount_raised ?? 0;
    const computed = calculateDilutionFromValuation(preMoneyValuation, amountRaised);
    const currentPct = watchedRound?.dilution_pct ?? 0;

    if (Math.abs(computed - currentPct) > DILUTION_TOLERANCE) {
      form.setValue(`dilution_rounds.${roundIndex}.dilution_pct`, computed);
    }
  }, [
    dilutionMethod,
    watchedRound?.pre_money_valuation,
    watchedRound?.amount_raised,
    watchedRound?.dilution_pct,
    form,
    roundIndex,
  ]);

  const handleEnabledChange = (checked: boolean) => {
    form.setValue(`dilution_rounds.${roundIndex}.enabled`, checked);
    if (checked && !isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div
      className={`border-input rounded-md border p-4 transition-colors ${
        isEnabled ? "bg-muted/30" : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Switch
            id={`round-${roundIndex}-enabled`}
            checked={isEnabled}
            onCheckedChange={handleEnabledChange}
          />
          <Label htmlFor={`round-${roundIndex}-enabled`} className="text-sm font-medium">
            {roundName}
          </Label>
        </div>

        <div className="flex items-center gap-2">
          {isEnabled && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Configure round</span>
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}

          {canRemove && onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive h-8 w-8 p-0"
              onClick={onRemove}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Remove round</span>
            </Button>
          )}
        </div>
      </div>

      {isEnabled && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  form={form}
                  name={`dilution_rounds.${roundIndex}.round_type`}
                  label="Round Type"
                  description="Type of funding round"
                  options={[
                    { value: "SAFE_NOTE", label: "SAFE Note" },
                    { value: "PRICED_ROUND", label: "Priced Round" },
                  ]}
                />

                <SliderField
                  form={form}
                  name={`dilution_rounds.${roundIndex}.year`}
                  label="Year"
                  description="Year when round occurs"
                  min={0}
                  max={20}
                  step={1}
                  formatValue={(v) => `Year ${v}`}
                />
              </div>

              <RadioField
                form={form}
                name={`dilution_rounds.${roundIndex}.dilution_method`}
                label="Dilution Input Method"
                tooltip="Choose how to specify dilution: directly as a percentage, or by entering valuation details"
                options={[
                  { value: "percentage", label: "By Percentage" },
                  { value: "valuation", label: "By Valuation" },
                ]}
              />

              {dilutionMethod === "percentage" ? (
                <SliderField
                  form={form}
                  name={`dilution_rounds.${roundIndex}.dilution_pct`}
                  label="Dilution %"
                  description="Expected dilution"
                  min={0}
                  max={50}
                  step={0.5}
                  formatValue={(v) => `${v.toFixed(1)}%`}
                />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <CurrencySliderField
                      form={form}
                      name={`dilution_rounds.${roundIndex}.pre_money_valuation`}
                      label="Pre-Money Valuation"
                      description="Pre-round valuation"
                      min={0}
                      max={1000000000}
                      step={1000000}
                    />

                    <CurrencySliderField
                      form={form}
                      name={`dilution_rounds.${roundIndex}.amount_raised`}
                      label="Amount Raised"
                      description="Capital raised in this round"
                      min={0}
                      max={500000000}
                      step={500000}
                    />
                  </div>

                  <div
                    className="bg-muted/50 rounded-md px-3 py-2 text-sm"
                    data-testid={`round-${roundIndex}-computed-dilution`}
                  >
                    <span className="text-muted-foreground">Computed dilution: </span>
                    <span className="font-medium">
                      {(watchedRound?.dilution_pct ?? 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              <CurrencySliderField
                form={form}
                name={`dilution_rounds.${roundIndex}.salary_change`}
                label="New Salary"
                description="New monthly salary after this round"
                min={0}
                max={50000}
                step={500}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
