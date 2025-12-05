"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, DollarSign, Activity, Play } from "lucide-react";

const growthSchema = z.object({
  starting_arr: z.number().min(0, "ARR must be positive"),
  starting_cash: z.number().min(0, "Cash must be positive"),
  monthly_burn_rate: z.number().min(0, "Burn rate must be positive"),
  mom_growth_rate: z.number().min(0).max(100, "Growth rate must be between 0 and 100"),
  churn_rate: z.number().min(0).max(100, "Churn rate must be between 0 and 100"),
  market_sentiment: z.enum(["BULL", "NORMAL", "BEAR"]),
});

export type GrowthFormValues = z.infer<typeof growthSchema>;

interface GrowthParametersProps {
  onChange: (values: GrowthFormValues) => void;
}

export function GrowthParameters({ onChange }: GrowthParametersProps) {
  const form = useForm<GrowthFormValues>({
    resolver: zodResolver(growthSchema),
    defaultValues: {
      starting_arr: 1000000,
      starting_cash: 2000000,
      monthly_burn_rate: 150000,
      mom_growth_rate: 5,
      churn_rate: 1,
      market_sentiment: "NORMAL",
    },
  });

  // Use a ref to store the onChange callback to avoid re-render loops
  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Trigger simulation on form submission instead of every change
  const handleSimulate = () => {
    const values = form.getValues();
    onChangeRef.current(values);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5 text-accent" />
          Growth Engine
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="starting_arr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting ARR ($)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          className="pl-9"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="starting_cash"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting Cash ($)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          className="pl-9"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="monthly_burn_rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Burn Rate ($)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Activity className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        className="pl-9"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="mom_growth_rate"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-2">
                      <FormLabel>MoM Growth Rate (%)</FormLabel>
                      <span className="text-sm font-mono text-accent">{field.value}%</span>
                    </div>
                    <FormControl>
                      <Slider
                        min={0}
                        max={20}
                        step={0.5}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormDescription>Monthly revenue growth target</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="churn_rate"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center mb-2">
                      <FormLabel>Monthly Churn Rate (%)</FormLabel>
                      <span className="text-sm font-mono text-destructive">{field.value}%</span>
                    </div>
                    <FormControl>
                      <Slider
                        min={0}
                        max={10}
                        step={0.1}
                        value={[field.value]}
                        onValueChange={(vals) => field.onChange(vals[0])}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="button"
              onClick={handleSimulate}
              className="w-full mt-4"
              variant="secondary"
            >
              <Play className="h-4 w-4 mr-2" />
              Run Simulation
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
