"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, History, Edit2 } from "lucide-react";
import { NumberInputField, SelectField } from "./form-fields";
import type { DilutionRoundForm } from "@/lib/schemas";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatCurrency } from "@/lib/format-utils";

interface CompletedRoundsSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  completedRounds: DilutionRoundForm[];
  completedRoundIndices: number[];
}

/**
 * Displays completed (historical) funding rounds in a collapsed summary view.
 * These represent rounds that already happened before the user joined.
 */
export function CompletedRoundsSection({
  form,
  completedRounds,
  completedRoundIndices,
}: CompletedRoundsSectionProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);

  if (completedRounds.length === 0) {
    return null;
  }

  // Calculate total historical dilution
  const totalHistoricalDilution = completedRounds.reduce((acc, round) => {
    if (round.enabled) {
      // Cumulative dilution: (1 - d1) * (1 - d2) * ...
      return acc * (1 - round.dilution_pct / 100);
    }
    return acc;
  }, 1);

  const totalDilutionPct = ((1 - totalHistoricalDilution) * 100).toFixed(1);

  // Calculate total raised
  const totalRaised = completedRounds.reduce((acc, round) => {
    if (round.enabled) {
      return acc + round.amount_raised;
    }
    return acc;
  }, 0);

  return (
    <Card className="border-border bg-muted/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="text-muted-foreground h-4 w-4" />
              <CardTitle className="text-sm font-medium">Funding History</CardTitle>
              <Badge variant="secondary" className="text-xs">
                {completedRounds.length} round{completedRounds.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">Toggle history</span>
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {/* Summary line always visible */}
          <div className="text-muted-foreground mt-2 flex flex-wrap gap-4 text-sm">
            <span>
              Total dilution:{" "}
              <span className="text-foreground font-medium">{totalDilutionPct}%</span>
            </span>
            <span>
              Total raised:{" "}
              <span className="text-foreground font-medium">{formatCurrency(totalRaised)}</span>
            </span>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Edit toggle */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs"
              >
                <Edit2 className="mr-1 h-3 w-3" />
                {isEditing ? "Done Editing" : "Edit History"}
              </Button>
            </div>

            {/* List of completed rounds */}
            <div className="space-y-3">
              {completedRounds.map((round, idx) => {
                const originalIndex = completedRoundIndices[idx];
                return (
                  <CompletedRoundItem
                    key={`${round.round_name}-${originalIndex}`}
                    form={form}
                    round={round}
                    roundIndex={originalIndex}
                    isEditing={isEditing}
                  />
                );
              })}
            </div>

            {/* Explanation text */}
            <p className="text-muted-foreground text-xs">
              These rounds occurred before you joined. Your equity grant (
              {form.watch("total_equity_grant_pct")}%) is already post-dilution from these rounds.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface CompletedRoundItemProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  round: DilutionRoundForm;
  roundIndex: number;
  isEditing: boolean;
}

function CompletedRoundItem({ form, round, roundIndex, isEditing }: CompletedRoundItemProps) {
  const yearsAgo = Math.abs(round.year);

  if (!isEditing) {
    // Read-only summary view
    return (
      <div className="bg-background/50 flex items-center justify-between rounded-md px-3 py-2">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {round.round_name}
          </Badge>
          <span className="text-muted-foreground text-sm">
            {yearsAgo} year{yearsAgo !== 1 ? "s" : ""} ago
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span>
            <span className="text-muted-foreground">Dilution:</span>{" "}
            <span className="font-medium">{round.dilution_pct}%</span>
          </span>
          <span>
            <span className="text-muted-foreground">Raised:</span>{" "}
            <span className="font-medium">{formatCurrency(round.amount_raised)}</span>
          </span>
        </div>
      </div>
    );
  }

  // Editable view
  return (
    <Card className="border-border border-dashed">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {round.round_name}
          </Badge>
          <span className="text-muted-foreground text-xs">
            (Completed {yearsAgo} year{yearsAgo !== 1 ? "s" : ""} ago)
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            form={form}
            name={`dilution_rounds.${roundIndex}.round_type`}
            label="Round Type"
            options={[
              { value: "SAFE_NOTE", label: "SAFE Note" },
              { value: "PRICED_ROUND", label: "Priced Round" },
            ]}
          />

          <NumberInputField
            form={form}
            name={`dilution_rounds.${roundIndex}.dilution_pct`}
            label="Dilution %"
            min={0}
            max={100}
            step={0.1}
            suffix="%"
          />
        </div>

        {/* Responsive grid for currency fields with large values */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <NumberInputField
            form={form}
            name={`dilution_rounds.${roundIndex}.pre_money_valuation`}
            label="Pre-Money Valuation"
            min={0}
            step={1000000}
            prefix="$"
            formatDisplay={true}
          />

          <NumberInputField
            form={form}
            name={`dilution_rounds.${roundIndex}.amount_raised`}
            label="Amount Raised"
            min={0}
            step={1000000}
            prefix="$"
            formatDisplay={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}
