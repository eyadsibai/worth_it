"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GlobalSettingsFormSchema, type GlobalSettingsForm } from "@/lib/schemas";
import { Form } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SliderField } from "./form-fields";

interface GlobalSettingsFormProps {
  defaultValues?: Partial<GlobalSettingsForm>;
  onChange?: (data: GlobalSettingsForm) => void;
}

export function GlobalSettingsFormComponent({
  defaultValues,
  onChange,
}: GlobalSettingsFormProps) {
  const form = useForm<GlobalSettingsForm>({
    resolver: zodResolver(GlobalSettingsFormSchema),
    defaultValues: {
      exit_year: defaultValues?.exit_year ?? 5,
    },
    mode: "onChange",
  });

  // Watch for changes and notify parent
  const watchedValues = form.watch();
  React.useEffect(() => {
    if (form.formState.isValid && onChange) {
      onChange(watchedValues as GlobalSettingsForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedValues), form.formState.isValid]);

  return (
    <Card className="glass-card animate-slide-up border-l-4 border-l-primary/30">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary"></div>
          Global Settings
        </CardTitle>
        <CardDescription>Configure the analysis timeframe</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            <SliderField
              form={form}
              name="exit_year"
              label="Exit Year"
              description="Number of years until liquidity event (IPO/acquisition)"
              min={1}
              max={20}
              step={1}
              formatValue={(value) => `${value} years`}
            />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
