"use client";

/** Default exit year for global settings */
const DEFAULT_EXIT_YEAR = 5;

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";
import { GlobalSettingsFormSchema, type GlobalSettingsForm } from "@/lib/schemas";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SliderField } from "./form-fields";
import { useDeepCompareEffect } from "@/lib/use-deep-compare";
import { TOOLTIPS } from "@/lib/constants/tooltips";

interface GlobalSettingsFormProps {
  /** External value to sync with (e.g., from Zustand store) */
  value?: GlobalSettingsForm | null;
  /** @deprecated Use `value` prop instead for controlled form synchronization */
  defaultValues?: Partial<GlobalSettingsForm>;
  onChange?: (data: GlobalSettingsForm) => void;
  /** Enable collapsible card behavior (default: true) */
  collapsible?: boolean;
  /** Initial open state when collapsible (default: true) */
  defaultOpen?: boolean;
}

export function GlobalSettingsFormComponent({
  value,
  defaultValues,
  onChange,
  collapsible = true,
  defaultOpen = true,
}: GlobalSettingsFormProps) {
  // Use value prop if available, otherwise fall back to defaultValues
  const initialValues = value ?? defaultValues;

  const form = useForm<GlobalSettingsForm>({
    resolver: zodResolver(GlobalSettingsFormSchema),
    defaultValues: {
      exit_year: initialValues?.exit_year ?? DEFAULT_EXIT_YEAR,
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

  // Watch for changes and notify parent
  const watchedValues = form.watch();
  useDeepCompareEffect(() => {
    if (form.formState.isValid && onChange) {
      onChange(watchedValues as GlobalSettingsForm);
    }
  }, [watchedValues, form.formState.isValid, onChange]);

  const formContent = (
    <Form {...form}>
      <form className="space-y-6">
        <SliderField
          form={form}
          name="exit_year"
          label="Exit Year"
          description="Number of years until liquidity event (IPO/acquisition)"
          tooltip={TOOLTIPS.exitYear}
          min={1}
          max={20}
          step={1}
          formatValue={(value) => `${value} years`}
        />
      </form>
    </Form>
  );

  if (collapsible) {
    return (
      <Collapsible defaultOpen={defaultOpen}>
        <Card className="terminal-card animate-slide-up border-l-primary/30 border-l-4">
          {/*
            A real <button>, not a CardHeader div: Radix hands the trigger
            aria-expanded/aria-controls, which are invalid on a role-less div
            (axe: aria-allowed-attr, critical) and leave the header unreachable
            by keyboard. Same markup as CollapsibleCard; px-6/pb-4 replace the
            padding CardHeader used to supply.
          */}
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="hover:bg-muted/30 flex w-full items-center justify-between gap-2 rounded-t-2xl px-6 pb-4 text-left transition-colors"
            >
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <div className="bg-primary h-2 w-2 rounded-full"></div>
                  Global Settings
                </CardTitle>
                <CardDescription>Configure the analysis timeframe</CardDescription>
              </div>
              <ChevronDown
                className="text-muted-foreground h-5 w-5 shrink-0 transition-transform duration-200 [[data-state=closed]_&]:-rotate-90"
                aria-hidden="true"
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
            <CardContent>{formContent}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  }

  return (
    <Card className="terminal-card animate-slide-up border-l-primary/30 border-l-4">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="bg-primary h-2 w-2 rounded-full"></div>
          Global Settings
        </CardTitle>
        <CardDescription>Configure the analysis timeframe</CardDescription>
      </CardHeader>
      <CardContent>{formContent}</CardContent>
    </Card>
  );
}
