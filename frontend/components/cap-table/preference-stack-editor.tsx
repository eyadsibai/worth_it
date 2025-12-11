"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Trash2, Plus, GripVertical, Layers } from "lucide-react";
import { generateId } from "@/lib/utils";
import { motion, MotionList, MotionListItem } from "@/lib/motion";
import {
  PreferenceTierFormSchema,
  type PreferenceTier,
  type PreferenceTierFormData,
  type Stakeholder,
} from "@/lib/schemas";

interface PreferenceStackEditorProps {
  tiers: PreferenceTier[];
  onTiersChange: (tiers: PreferenceTier[]) => void;
  stakeholders: Stakeholder[];
}

// Format currency for display
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function PreferenceStackEditor({
  tiers,
  onTiersChange,
  stakeholders: _stakeholders,
}: PreferenceStackEditorProps) {
  const form = useForm<PreferenceTierFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(PreferenceTierFormSchema) as any,
    defaultValues: {
      name: "",
      seniority: tiers.length + 1,
      investment_amount: 0,
      liquidation_multiplier: 1,
      participating: false,
      participation_cap: undefined,
    },
  });

  const onSubmit = (data: PreferenceTierFormData) => {
    const newTier: PreferenceTier = {
      id: generateId(),
      name: data.name,
      seniority: data.seniority,
      investment_amount: data.investment_amount,
      liquidation_multiplier: data.liquidation_multiplier,
      participating: data.participating,
      participation_cap: data.participation_cap,
      stakeholder_ids: [],
    };

    // Insert in correct seniority order
    const updatedTiers = [...tiers, newTier].sort(
      (a, b) => a.seniority - b.seniority
    );
    onTiersChange(updatedTiers);

    // Reset form
    form.reset({
      name: "",
      seniority: updatedTiers.length + 1,
      investment_amount: 0,
      liquidation_multiplier: 1,
      participating: false,
      participation_cap: undefined,
    });
  };

  const handleRemoveTier = (id: string) => {
    onTiersChange(tiers.filter((t) => t.id !== id));
  };

  const handleToggleParticipating = (id: string, participating: boolean) => {
    onTiersChange(
      tiers.map((t) =>
        t.id === id ? { ...t, participating } : t
      )
    );
  };

  const totalInvested = tiers.reduce((sum, t) => sum + t.investment_amount, 0);

  return (
    <div className="space-y-6">
      {/* Add Tier Form */}
      <Card className="terminal-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Add Preference Tier
          </CardTitle>
          <CardDescription>
            Define liquidation preference for each funding round
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Round Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Series A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="seniority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seniority</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(parseInt(v))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select seniority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: tiers.length + 1 }, (_, i) => i + 1).map((n) => (
                            <SelectItem key={n} value={n.toString()}>
                              {n === 1 ? "1 (Most Senior)" : n.toString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>1 = paid first</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="investment_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Investment Amount ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={100000}
                          placeholder="5000000"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="liquidation_multiplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Liquidation Multiple</FormLabel>
                      <Select
                        onValueChange={(v) => field.onChange(parseFloat(v))}
                        value={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select multiple" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1x (Standard)</SelectItem>
                          <SelectItem value="1.5">1.5x</SelectItem>
                          <SelectItem value="2">2x</SelectItem>
                          <SelectItem value="3">3x</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Multiple of investment returned first</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                <div className="space-y-0.5">
                  <Label>Participating Preferred</Label>
                  <p className="text-sm text-muted-foreground">
                    Gets preference + pro-rata share of remaining proceeds
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="participating"
                  render={({ field }) => (
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  )}
                />
              </div>

              {form.watch("participating") && (
                <FormField
                  control={form.control}
                  name="participation_cap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Participation Cap (optional)</FormLabel>
                      <Select
                        onValueChange={(v) =>
                          field.onChange(v === "none" ? undefined : parseFloat(v))
                        }
                        value={field.value?.toString() ?? "none"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select cap" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Cap</SelectItem>
                          <SelectItem value="2">2x (Total return capped at 2x)</SelectItem>
                          <SelectItem value="3">3x (Total return capped at 3x)</SelectItem>
                          <SelectItem value="4">4x (Total return capped at 4x)</SelectItem>
                          <SelectItem value="5">5x (Total return capped at 5x)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Maximum total return before converting to common
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Preference Tier
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Preference Stack List */}
      {tiers.length > 0 && (
        <Card className="terminal-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Preference Stack ({tiers.length} tiers)</span>
              <Badge variant="outline" className="font-mono">
                Total: {formatCurrency(totalInvested)}
              </Badge>
            </CardTitle>
            <CardDescription>
              Higher seniority (lower number) gets paid first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MotionList className="space-y-3">
              {tiers.map((tier) => (
                <MotionListItem key={tier.id}>
                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <GripVertical className="h-4 w-4" />
                      <span className="font-mono text-sm w-6">{tier.seniority}</span>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{tier.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {tier.liquidation_multiplier}x
                        </Badge>
                        {tier.participating && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-chart-3/20 text-chart-3"
                          >
                            Participating
                            {tier.participation_cap && ` (${tier.participation_cap}x cap)`}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(tier.investment_amount)} invested
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Label className="text-xs text-muted-foreground">Part.</Label>
                        <Switch
                          checked={tier.participating}
                          onCheckedChange={(checked) =>
                            handleToggleParticipating(tier.id, checked)
                          }
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTier(tier.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                </MotionListItem>
              ))}
            </MotionList>

            {/* Summary */}
            <div className="mt-4 p-4 rounded-lg bg-muted/50 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total Preference Amount</span>
                <span className="font-mono">
                  {formatCurrency(
                    tiers.reduce(
                      (sum, t) => sum + t.investment_amount * t.liquidation_multiplier,
                      0
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Participating Tiers</span>
                <span className="font-mono">
                  {tiers.filter((t) => t.participating).length} of {tiers.length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {tiers.length === 0 && (
        <Card className="terminal-card">
          <CardContent className="py-8 text-center">
            <Layers className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              No preference tiers defined. Add your first funding round above.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
