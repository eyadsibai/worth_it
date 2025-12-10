"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Users, Landmark, PieChart } from "lucide-react";
import { StakeholderForm } from "./stakeholder-form";
import { OwnershipChart } from "./ownership-chart";
import { ExitCalculator } from "./exit-calculator";
import { FundingRoundsManager } from "./funding-rounds-manager";
import {
  motion,
  MotionFadeInUp,
  MotionList,
  MotionListItem,
  AnimatedPercentage,
} from "@/lib/motion";
import { generateId } from "@/lib/utils";
import { useConvertInstruments } from "@/lib/api-client";
import type {
  Stakeholder,
  StakeholderFormData,
  CapTable,
  FundingInstrument,
  PricedRound,
  SAFE,
  ConvertibleNote,
} from "@/lib/schemas";

interface CapTableManagerProps {
  capTable: CapTable;
  onCapTableChange: (capTable: CapTable) => void;
  instruments: FundingInstrument[];
  onInstrumentsChange: (instruments: FundingInstrument[]) => void;
}

export function CapTableManager({
  capTable,
  onCapTableChange,
  instruments,
  onInstrumentsChange,
}: CapTableManagerProps) {
  const [activeSection, setActiveSection] = React.useState<"cap-table" | "funding">("cap-table");
  const convertInstruments = useConvertInstruments();

  // Handle automatic conversion when a priced round is added
  const handlePricedRoundAdded = React.useCallback(
    (round: PricedRound) => {
      // Filter for outstanding SAFEs and Convertible Notes
      const outstandingSAFEs = instruments.filter(
        (i): i is SAFE => i.type === "SAFE" && i.status === "outstanding"
      );
      const outstandingNotes = instruments.filter(
        (i): i is ConvertibleNote =>
          i.type === "CONVERTIBLE_NOTE" && i.status === "outstanding"
      );

      const convertibleInstruments = [...outstandingSAFEs, ...outstandingNotes];

      // No instruments to convert
      if (convertibleInstruments.length === 0) {
        return;
      }

      // Call conversion API
      convertInstruments.mutate(
        {
          cap_table: capTable,
          instruments: convertibleInstruments,
          priced_round: round,
        },
        {
          onSuccess: (result) => {
            // Update cap table with new stakeholders from conversion
            onCapTableChange(result.updated_cap_table);

            // Mark converted instruments as "converted"
            const convertedIds = new Set(
              result.converted_instruments.map((ci) => ci.instrument_id)
            );
            const updatedInstruments = instruments.map((inst) => {
              if (convertedIds.has(inst.id)) {
                return { ...inst, status: "converted" as const };
              }
              return inst;
            });
            onInstrumentsChange(updatedInstruments);

            // Log success (toast can be added later)
            console.log(
              `Conversion complete: ${result.summary.instruments_converted} instrument(s) converted, ${result.summary.total_shares_issued.toLocaleString()} new shares issued.`
            );
          },
          onError: (error) => {
            console.error(
              "Conversion failed:",
              error instanceof Error ? error.message : "Unknown error"
            );
          },
        }
      );
    },
    [capTable, instruments, convertInstruments, onCapTableChange, onInstrumentsChange]
  );

  const handleAddStakeholder = (formData: StakeholderFormData) => {
    const newStakeholder: Stakeholder = {
      id: generateId(),
      name: formData.name,
      type: formData.type,
      shares: 0,
      ownership_pct: formData.ownership_pct,
      share_class: formData.share_class,
      vesting: formData.has_vesting
        ? {
            total_shares: 0,
            vesting_months: formData.vesting_months,
            cliff_months: formData.cliff_months,
            vested_shares: 0,
          }
        : undefined,
    };

    onCapTableChange({
      ...capTable,
      stakeholders: [...capTable.stakeholders, newStakeholder],
    });
  };

  const handleRemoveStakeholder = (id: string) => {
    onCapTableChange({
      ...capTable,
      stakeholders: capTable.stakeholders.filter((s) => s.id !== id),
    });
  };

  const handleOptionPoolChange = (value: number[]) => {
    onCapTableChange({
      ...capTable,
      option_pool_pct: value[0],
    });
  };

  const handleAddInstrument = (instrument: FundingInstrument) => {
    onInstrumentsChange([...instruments, instrument]);
  };

  const handleRemoveInstrument = (id: string) => {
    onInstrumentsChange(instruments.filter((i) => i.id !== id));
  };

  const totalOwnership =
    capTable.stakeholders.reduce((sum, s) => sum + s.ownership_pct, 0) +
    capTable.option_pool_pct;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "founder":
        return "bg-chart-1/20 text-chart-1 border-chart-1/30";
      case "employee":
        return "bg-chart-2/20 text-chart-2 border-chart-2/30";
      case "investor":
        return "bg-chart-3/20 text-chart-3 border-chart-3/30";
      case "advisor":
        return "bg-chart-4/20 text-chart-4 border-chart-4/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <Tabs value={activeSection} onValueChange={(v) => setActiveSection(v as typeof activeSection)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="cap-table" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Cap Table
          </TabsTrigger>
          <TabsTrigger value="funding" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Funding Rounds
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cap-table" className="space-y-6 mt-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Add Stakeholder Form */}
            <Card className="terminal-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Add Stakeholder
            </CardTitle>
            <CardDescription>
              Add founders, employees, investors, or advisors to your cap table
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StakeholderForm onSubmit={handleAddStakeholder} />
          </CardContent>
        </Card>

        {/* Option Pool */}
        <Card className="terminal-card">
          <CardHeader>
            <CardTitle>Option Pool</CardTitle>
            <CardDescription>
              Reserve equity for future employee grants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Reserved for Options</Label>
                <span className="text-sm font-mono">{capTable.option_pool_pct}%</span>
              </div>
              <Slider
                value={[capTable.option_pool_pct]}
                onValueChange={handleOptionPoolChange}
                min={0}
                max={30}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                Typical range: 10-20% for early-stage startups
              </p>
            </div>

            {/* Allocation Summary */}
            <motion.div
              className="p-4 rounded-lg bg-muted/50 space-y-2"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between text-sm">
                <span>Stakeholders</span>
                <span className="font-mono">
                  <AnimatedPercentage
                    value={capTable.stakeholders.reduce((sum, s) => sum + s.ownership_pct, 0)}
                    decimals={1}
                  />
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Option Pool</span>
                <span className="font-mono">
                  <AnimatedPercentage value={capTable.option_pool_pct} decimals={0} />
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>Total Allocated</span>
                <span
                  className={`font-mono ${
                    totalOwnership > 100 ? "text-destructive" : "text-terminal"
                  }`}
                >
                  <AnimatedPercentage value={totalOwnership} decimals={1} />
                </span>
              </div>
              {totalOwnership > 100 && (
                <motion.p
                  className="text-xs text-destructive"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Warning: Total exceeds 100%
                </motion.p>
              )}
            </motion.div>
          </CardContent>
            </Card>
          </div>

          {/* Stakeholders List */}
          {capTable.stakeholders.length > 0 && (
            <MotionFadeInUp>
              <Card className="terminal-card">
                <CardHeader>
                  <CardTitle>Stakeholders ({capTable.stakeholders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <MotionList className="space-y-2">
                    {capTable.stakeholders.map((stakeholder) => (
                      <MotionListItem key={stakeholder.id}>
                        <motion.div
                          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50"
                          whileHover={{ x: 4, borderColor: "hsl(var(--terminal) / 0.5)" }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium">{stakeholder.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={getTypeColor(stakeholder.type)}>
                                  {stakeholder.type}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {stakeholder.share_class}
                                </Badge>
                                {stakeholder.vesting && (
                                  <Badge variant="secondary" className="text-xs">
                                    {stakeholder.vesting.vesting_months / 12}yr vesting
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-mono font-semibold">
                              <AnimatedPercentage value={stakeholder.ownership_pct} />
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveStakeholder(stakeholder.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      </MotionListItem>
                    ))}
                  </MotionList>
                </CardContent>
              </Card>
            </MotionFadeInUp>
          )}

          {/* Visualizations */}
          <div className="grid lg:grid-cols-2 gap-6">
            <OwnershipChart
              stakeholders={capTable.stakeholders}
              optionPoolPct={capTable.option_pool_pct}
            />
            <ExitCalculator
              stakeholders={capTable.stakeholders}
              optionPoolPct={capTable.option_pool_pct}
            />
          </div>
        </TabsContent>

        <TabsContent value="funding" className="mt-6">
          <FundingRoundsManager
            instruments={instruments}
            onAddInstrument={handleAddInstrument}
            onRemoveInstrument={handleRemoveInstrument}
            totalShares={capTable.total_shares}
            onPricedRoundAdded={handlePricedRoundAdded}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
