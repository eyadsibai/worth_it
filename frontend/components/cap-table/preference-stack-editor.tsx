"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Trash2, Plus, GripVertical, Layers, Users } from "lucide-react";
import { FORMATTING } from "@/lib/constants";
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
  if (value >= FORMATTING.BILLION) {
    return `$${(value / FORMATTING.BILLION).toFixed(1)}B`;
  }
  if (value >= FORMATTING.MILLION) {
    return `$${(value / FORMATTING.MILLION).toFixed(1)}M`;
  }
  if (value >= FORMATTING.THOUSAND) {
    return `$${(value / FORMATTING.THOUSAND).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

interface StakeholderAssignmentProps {
  legend: string;
  description?: string;
  hideLegend?: boolean;
  stakeholders: Stakeholder[];
  selectedIds: string[];
  onToggle: (stakeholderId: string, assigned: boolean) => void;
  idPrefix: string;
}

function StakeholderAssignment({
  legend,
  description,
  hideLegend = false,
  stakeholders,
  selectedIds,
  onToggle,
  idPrefix,
}: StakeholderAssignmentProps) {
  return (
    <fieldset className="space-y-2">
      <legend className={hideLegend ? "sr-only" : "text-sm font-medium"}>{legend}</legend>
      {description && !hideLegend && <p className="text-muted-foreground text-sm">{description}</p>}
      {stakeholders.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Add stakeholders to your cap table to assign holders to this tier.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {stakeholders.map((stakeholder) => {
            const checkboxId = `${idPrefix}-${stakeholder.id}`;
            return (
              <div key={stakeholder.id} className="flex items-center gap-2">
                <Checkbox
                  id={checkboxId}
                  checked={selectedIds.includes(stakeholder.id)}
                  onCheckedChange={(checked) => onToggle(stakeholder.id, checked === true)}
                />
                <Label htmlFor={checkboxId} className="text-sm font-normal">
                  {stakeholder.name}
                </Label>
              </div>
            );
          })}
        </div>
      )}
    </fieldset>
  );
}

export function PreferenceStackEditor({
  tiers,
  onTiersChange,
  stakeholders,
}: PreferenceStackEditorProps) {
  const [newTierStakeholderIds, setNewTierStakeholderIds] = React.useState<string[]>([]);
  const [expandedTierId, setExpandedTierId] = React.useState<string | null>(null);

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

  // useWatch is the hook-based API for subscribing to form values
  const isParticipating = useWatch({
    control: form.control,
    name: "participating",
    defaultValue: false,
  });

  // Assignments are stored in cap table order so tier payloads stay stable across edits
  const applyAssignment = React.useCallback(
    (assignedIds: string[], stakeholderId: string, assigned: boolean): string[] => {
      const next = new Set(assignedIds);
      if (assigned) {
        next.add(stakeholderId);
      } else {
        next.delete(stakeholderId);
      }
      return stakeholders.filter((s) => next.has(s.id)).map((s) => s.id);
    },
    [stakeholders]
  );

  const handleToggleNewTierStakeholder = (stakeholderId: string, assigned: boolean) => {
    setNewTierStakeholderIds((current) => applyAssignment(current, stakeholderId, assigned));
  };

  const handleToggleTierStakeholder = (
    tierId: string,
    stakeholderId: string,
    assigned: boolean
  ) => {
    onTiersChange(
      tiers.map((t) =>
        t.id === tierId
          ? { ...t, stakeholder_ids: applyAssignment(t.stakeholder_ids, stakeholderId, assigned) }
          : t
      )
    );
  };

  const onSubmit = (data: PreferenceTierFormData) => {
    const newTier: PreferenceTier = {
      id: generateId(),
      name: data.name,
      seniority: data.seniority,
      investment_amount: data.investment_amount,
      liquidation_multiplier: data.liquidation_multiplier,
      participating: data.participating,
      participation_cap: data.participation_cap,
      stakeholder_ids: newTierStakeholderIds,
    };

    // Insert in correct seniority order
    const updatedTiers = [...tiers, newTier].sort((a, b) => a.seniority - b.seniority);
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
    setNewTierStakeholderIds([]);
  };

  const handleRemoveTier = (id: string) => {
    onTiersChange(tiers.filter((t) => t.id !== id));
  };

  const handleToggleParticipating = (id: string, participating: boolean) => {
    onTiersChange(tiers.map((t) => (t.id === id ? { ...t, participating } : t)));
  };

  const totalInvested = tiers.reduce((sum, t) => sum + t.investment_amount, 0);

  const stakeholderNameById = React.useMemo(
    () => new Map(stakeholders.map((s) => [s.id, s.name])),
    [stakeholders]
  );

  return (
    <div className="space-y-6">
      {/* Add Tier Form */}
      <Card className="terminal-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Add Preference Tier
          </CardTitle>
          <CardDescription>Define liquidation preference for each funding round</CardDescription>
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

              <div className="bg-muted/50 flex items-center justify-between rounded-lg p-4">
                <div className="space-y-0.5">
                  <Label>Participating Preferred</Label>
                  <p className="text-muted-foreground text-sm">
                    Gets preference + pro-rata share of remaining proceeds
                  </p>
                </div>
                <FormField
                  control={form.control}
                  name="participating"
                  render={({ field }) => (
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  )}
                />
              </div>

              {isParticipating && (
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

              <StakeholderAssignment
                legend="Assigned Stakeholders"
                description="Holders that share this tier's liquidation preference"
                stakeholders={stakeholders}
                selectedIds={newTierStakeholderIds}
                onToggle={handleToggleNewTierStakeholder}
                idPrefix="new-tier-stakeholder"
              />

              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
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
              <Badge variant="outline" className="tabular-nums">
                Total: {formatCurrency(totalInvested)}
              </Badge>
            </CardTitle>
            <CardDescription>Higher seniority (lower number) gets paid first</CardDescription>
          </CardHeader>
          <CardContent>
            <MotionList className="space-y-3">
              {tiers.map((tier) => (
                <MotionListItem key={tier.id}>
                  <motion.div
                    className="bg-card hover:bg-accent/50 space-y-3 rounded-lg border p-3"
                    whileHover={{ x: 4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-muted-foreground flex items-center gap-2">
                        <GripVertical className="h-4 w-4" />
                        <span className="w-6 text-sm tabular-nums">{tier.seniority}</span>
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
                              className="bg-chart-3/20 text-chart-3 text-xs"
                            >
                              Participating
                              {tier.participation_cap && ` (${tier.participation_cap}x cap)`}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">
                          {formatCurrency(tier.investment_amount)} invested
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-expanded={expandedTierId === tier.id}
                          onClick={() =>
                            setExpandedTierId(expandedTierId === tier.id ? null : tier.id)
                          }
                        >
                          <Users className="mr-1 h-4 w-4" />
                          Holders ({tier.stakeholder_ids.length})
                          <span className="sr-only"> for {tier.name}</span>
                        </Button>
                        <div className="flex items-center gap-1">
                          <Label className="text-muted-foreground text-xs">Part.</Label>
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
                    </div>

                    {tier.stakeholder_ids.length > 0 && (
                      <div className="flex flex-wrap gap-1 pl-9">
                        {tier.stakeholder_ids.map((id) => (
                          <Badge key={id} variant="secondary" className="text-xs">
                            {stakeholderNameById.get(id) ?? "Unknown stakeholder"}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {expandedTierId === tier.id && (
                      <div className="border-border border-t pt-3 pl-9">
                        <StakeholderAssignment
                          legend={`Stakeholders assigned to ${tier.name}`}
                          hideLegend
                          stakeholders={stakeholders}
                          selectedIds={tier.stakeholder_ids}
                          onToggle={(stakeholderId, assigned) =>
                            handleToggleTierStakeholder(tier.id, stakeholderId, assigned)
                          }
                          idPrefix={`tier-${tier.id}-stakeholder`}
                        />
                      </div>
                    )}
                  </motion.div>
                </MotionListItem>
              ))}
            </MotionList>

            {/* Summary */}
            <div className="bg-muted/50 mt-4 space-y-2 rounded-lg p-4">
              <div className="flex justify-between text-sm">
                <span>Total Preference Amount</span>
                <span className="tabular-nums">
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
                <span className="tabular-nums">
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
            <Layers className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground">
              No preference tiers defined. Add your first funding round above.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
