"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2, Settings } from "lucide-react";
import { NumberInputField, SelectField } from "./form-fields";
import type { DilutionRoundForm } from "@/lib/schemas";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

  const handleEnabledChange = (checked: boolean) => {
    form.setValue(`dilution_rounds.${roundIndex}.enabled`, checked);
    if (checked && !isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <Card className={`transition-all ${isEnabled ? 'border-primary/20 bg-primary/5' : 'border-muted'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <Switch
                id={`round-${roundIndex}-enabled`}
                checked={isEnabled}
                onCheckedChange={handleEnabledChange}
              />
              <Label htmlFor={`round-${roundIndex}-enabled`}>
                <CardTitle className="text-sm font-medium">{roundName}</CardTitle>
              </Label>
            </div>
            {isEnabled && <Badge variant="secondary" className="text-xs">Enabled</Badge>}
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
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                onClick={onRemove}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Remove round</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {isEnabled && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent>
            <CardContent className="space-y-4">
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

                <NumberInputField
                  form={form}
                  name={`dilution_rounds.${roundIndex}.year`}
                  label="Year"
                  description="Year when round occurs"
                  min={0}
                  max={20}
                  step={1}
                  placeholder="2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <NumberInputField
                  form={form}
                  name={`dilution_rounds.${roundIndex}.dilution_pct`}
                  label="Dilution %"
                  description="Percentage dilution (optional)"
                  min={0}
                  max={100}
                  step={0.1}
                  suffix="%"
                  placeholder="15"
                />

                <NumberInputField
                  form={form}
                  name={`dilution_rounds.${roundIndex}.pre_money_valuation`}
                  label="Pre-Money Valuation"
                  description="Valuation before round (optional)"
                  min={0}
                  step={1000000}
                  prefix="SAR"
                  placeholder="50000000"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <NumberInputField
                  form={form}
                  name={`dilution_rounds.${roundIndex}.amount_raised`}
                  label="Amount Raised"
                  description="Capital raised (optional)"
                  min={0}
                  step={1000000}
                  prefix="SAR"
                  placeholder="10000000"
                />

                <NumberInputField
                  form={form}
                  name={`dilution_rounds.${roundIndex}.salary_change`}
                  label="New Salary"
                  description="Updated monthly salary (optional)"
                  min={0}
                  step={1000}
                  prefix="SAR"
                  placeholder="12000"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      )}
    </Card>
  );
}
