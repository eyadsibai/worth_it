"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { NumberInputField, SliderField } from "./form-fields";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { DilutionRoundFormComponent } from "./dilution-round-form";
import { CompletedRoundsSection } from "./completed-rounds-section";
import { CompanyStageSelector } from "./company-stage-selector";
import { DilutionSummaryCard } from "./dilution-summary-card";
import { RSUFormSchema } from "@/lib/schemas";
import type { RSUForm, DilutionRoundForm } from "@/lib/schemas";
import { useDeepCompareEffect } from "@/lib/use-deep-compare";
import { isValidRSUData } from "@/lib/validation";
import { DEFAULT_DILUTION_ROUNDS } from "@/lib/constants/funding-rounds";
import { TOOLTIPS } from "@/lib/constants/tooltips";
import { Plus, Rocket } from "lucide-react";

interface RSUFormProps {
  /** External value to sync with (e.g., from Zustand store) */
  value?: RSUForm | null;
  /** @deprecated Use `value` prop instead for controlled form synchronization */
  defaultValues?: Partial<RSUForm>;
  onChange?: (data: RSUForm) => void;
}

export function RSUFormComponent({ value, defaultValues, onChange }: RSUFormProps) {
  // Use value prop if available, otherwise fall back to defaultValues
  const initialValues = value ?? defaultValues;

  const form = useForm<RSUForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(RSUFormSchema) as any,
    defaultValues: {
      equity_type: "RSU" as const,
      monthly_salary: initialValues?.monthly_salary ?? 0,
      total_equity_grant_pct: initialValues?.total_equity_grant_pct ?? 0,
      vesting_period: initialValues?.vesting_period ?? 4,
      cliff_period: initialValues?.cliff_period ?? 1,
      exit_valuation: initialValues?.exit_valuation ?? 0,
      simulate_dilution: initialValues?.simulate_dilution ?? false,
      company_stage: initialValues?.company_stage,
      dilution_rounds: initialValues?.dilution_rounds ?? DEFAULT_DILUTION_ROUNDS,
    },
    mode: "onChange",
  });

  // Sync form with external value changes (e.g., when loading examples)
  React.useEffect(() => {
    if (value) {
      form.reset(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const watchedValues = form.watch();
  useDeepCompareEffect(() => {
    if (form.formState.isValid && onChange) {
      const fullData = watchedValues as RSUForm;
      // Only propagate data when it has meaningful values (not zeros)
      // This prevents 400 errors from the backend when the form first mounts
      if (isValidRSUData(fullData)) {
        onChange(fullData);
      }
    }
  }, [watchedValues, form.formState.isValid, onChange]);

  const simulateDilution = form.watch("simulate_dilution");
  const allRounds = (watchedValues.dilution_rounds as DilutionRoundForm[]) ?? [];

  // Split rounds into completed and upcoming
  const completedRounds = allRounds.filter((r) => r.status === "completed");
  const upcomingRounds = allRounds.filter((r) => r.status === "upcoming" || !r.status);

  // Get indices mapping for completed and upcoming rounds
  const completedRoundIndices = allRounds
    .map((r, i) => (r.status === "completed" ? i : -1))
    .filter((i) => i !== -1);
  const upcomingRoundIndices = allRounds
    .map((r, i) => (r.status === "upcoming" || !r.status ? i : -1))
    .filter((i) => i !== -1);

  // Handle removing an upcoming round
  const handleRemoveRound = (indexInUpcoming: number) => {
    const originalIndex = upcomingRoundIndices[indexInUpcoming];
    const currentRounds = form.getValues("dilution_rounds");
    const newRounds = currentRounds.filter((_, i) => i !== originalIndex);
    form.setValue("dilution_rounds", newRounds);
  };

  // Handle adding a new upcoming round
  const handleAddRound = () => {
    const currentRounds = form.getValues("dilution_rounds");

    // Find the next available round name
    const existingNames = new Set(currentRounds.map((r) => r.round_name));
    const roundOptions = ["Series A", "Series B", "Series C", "Series D", "Series E", "Series F"];
    let newRoundName = "Custom Round";
    for (const name of roundOptions) {
      if (!existingNames.has(name)) {
        newRoundName = name;
        break;
      }
    }

    // Find the max year among upcoming rounds
    const maxYear = Math.max(
      ...currentRounds
        .filter((r) => r.status === "upcoming" || !r.status)
        .map((r) => r.year),
      0
    );

    const newRound: DilutionRoundForm = {
      round_name: newRoundName,
      round_type: "PRICED_ROUND",
      year: maxYear + 1,
      dilution_pct: 15,
      pre_money_valuation: 50_000_000,
      amount_raised: 10_000_000,
      salary_change: 0,
      enabled: false,
      status: "upcoming",
    };

    form.setValue("dilution_rounds", [...currentRounds, newRound]);
  };

  return (
    <Form {...form}>
      <form className="space-y-6">
        <NumberInputField
          form={form}
          name="monthly_salary"
          label="Monthly Salary"
          tooltip={TOOLTIPS.startupMonthlySalary}
          min={0}
          step={100}
          prefix="$"
          placeholder="8000"
          formatDisplay={true}
        />

        <NumberInputField
          form={form}
          name="total_equity_grant_pct"
          label="Total Equity Grant"
          tooltip={TOOLTIPS.totalEquityGrantPct}
          min={0}
          max={100}
          step={0.01}
          suffix="%"
          placeholder="0.5"
        />

        <div className="grid grid-cols-2 gap-4">
          <SliderField
            form={form}
            name="vesting_period"
            label="Vesting Period"
            tooltip={TOOLTIPS.vestingPeriod}
            min={1}
            max={10}
            step={1}
            formatValue={(value) => `${value} years`}
          />

          <SliderField
            form={form}
            name="cliff_period"
            label="Cliff Period"
            tooltip={TOOLTIPS.cliffPeriod}
            min={0}
            max={5}
            step={1}
            formatValue={(value) => `${value} ${value === 1 ? "year" : "years"}`}
          />
        </div>

        <NumberInputField
          form={form}
          name="exit_valuation"
          label="Exit Valuation"
          tooltip={TOOLTIPS.exitValuation}
          min={0}
          step={1000000}
          prefix="$"
          placeholder="100000000"
          formatDisplay={true}
        />

        <FormField
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={form.control as any}
          name="simulate_dilution"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Simulate Fundraising & Dilution</FormLabel>
                <FormDescription>
                  Model how past and future funding rounds affect your equity
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {simulateDilution && (
          <div className="space-y-6">
            {/* Company Stage Selector */}
            <CompanyStageSelector form={form} />

            {/* Dilution Summary Card */}
            <DilutionSummaryCard
              completedRounds={completedRounds}
              upcomingRounds={upcomingRounds}
            />

            {/* Completed Rounds (Historical) */}
            <CompletedRoundsSection
              form={form}
              completedRounds={completedRounds}
              completedRoundIndices={completedRoundIndices}
            />

            {/* Upcoming Rounds (Future) */}
            <Accordion type="single" collapsible className="w-full" defaultValue="upcoming-rounds">
              <AccordionItem value="upcoming-rounds">
                <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Rocket className="h-4 w-4" />
                    <span>Future Funding Rounds</span>
                    {upcomingRounds.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({upcomingRounds.filter((r) => r.enabled).length} enabled)
                      </span>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-4 p-4">
                    <p className="text-sm text-muted-foreground">
                      Configure future funding rounds that will dilute your equity. Enable the rounds
                      you expect to happen and adjust their parameters.
                    </p>

                    {upcomingRounds.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No future rounds configured.</p>
                        <p className="text-sm">Add a round to model future dilution.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {upcomingRounds.map((round, idx) => {
                          const originalIndex = upcomingRoundIndices[idx];
                          return (
                            <DilutionRoundFormComponent
                              key={`${round.round_name}-${originalIndex}`}
                              form={form}
                              roundIndex={originalIndex}
                              roundName={round.round_name}
                              canRemove={true}
                              onRemove={() => handleRemoveRound(idx)}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Add Round Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddRound}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Funding Round
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )}
      </form>
    </Form>
  );
}
