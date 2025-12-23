"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Users } from "lucide-react";
import { CapTableManager } from "@/components/cap-table";
import { StakeholderForm } from "@/components/cap-table/stakeholder-form";
import { TemplatePicker } from "@/components/templates/template-picker";
import { motion, AnimatedPercentage } from "@/lib/motion";
import { useAppStore } from "@/lib/store";
import { useCapTableHistory } from "@/lib/hooks/use-cap-table-history";
import { generateId } from "@/lib/utils";
import type { Stakeholder, StakeholderFormData } from "@/lib/schemas";

/**
 * FounderDashboard component for founder mode.
 *
 * Layout matches EmployeeDashboard with:
 * - Left sidebar (380px): Stakeholder form, Option Pool controls, allocation summary
 * - Right column: Cap table manager with tabs (Cap Table, Funding, Waterfall)
 *
 * HISTORY ARCHITECTURE:
 * This component uses useCapTableHistory to track sidebar mutations (adding stakeholders,
 * adjusting option pool) in the undo/redo history. CapTableManager receives raw store setters
 * but internally wraps them with its own useCapTableHistory hook. Both components share the
 * same global history store (useHistoryStore from Zustand), so undo/redo is unified:
 * - Sidebar actions push to history via historySetCapTable
 * - CapTableManager actions push to the same history via its internal wrapped setters
 * - Undo/Redo toolbar restores state from this shared history
 */
export function FounderDashboard() {
  // Get raw state and setters from the global store
  const {
    capTable,
    instruments,
    preferenceTiers,
    setCapTable: rawSetCapTable,
    setInstruments: rawSetInstruments,
    setPreferenceTiers: rawSetPreferenceTiers,
  } = useAppStore();

  // Wrap setters with history tracking for sidebar actions
  // This ensures undo/redo works for stakeholder additions and option pool changes
  const { setCapTable: historySetCapTable } = useCapTableHistory({
    capTable,
    instruments,
    preferenceTiers,
    onCapTableChange: rawSetCapTable,
    onInstrumentsChange: rawSetInstruments,
    onPreferenceTiersChange: rawSetPreferenceTiers,
  });

  // Handle adding a stakeholder from the sidebar form
  // Uses history-aware setter so undo/redo works from the Cap Table toolbar
  const handleAddStakeholder = React.useCallback(
    (formData: StakeholderFormData) => {
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

      historySetCapTable(
        {
          ...capTable,
          stakeholders: [...capTable.stakeholders, newStakeholder],
        },
        `Add stakeholder: ${newStakeholder.name}`
      );
    },
    [capTable, historySetCapTable]
  );

  // Handle option pool slider change
  // Uses history-aware setter so undo/redo works from the Cap Table toolbar
  const handleOptionPoolChange = React.useCallback(
    (value: number[]) => {
      historySetCapTable(
        {
          ...capTable,
          option_pool_pct: value[0],
        },
        `Set option pool to ${value[0]}%`
      );
    },
    [capTable, historySetCapTable]
  );

  const totalOwnership =
    capTable.stakeholders.reduce((sum, s) => sum + s.ownership_pct, 0) + capTable.option_pool_pct;

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* Left Column - Configuration Sidebar */}
      <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
        {/* Template Picker when empty */}
        {capTable.stakeholders.length === 0 && (
          <Card className="terminal-card animate-scale-in">
            <CardContent className="py-6">
              <TemplatePicker mode="founder" />
            </CardContent>
          </Card>
        )}

        {/* Add Stakeholder Form */}
        <Card className="terminal-card">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Add Stakeholder
            </CardTitle>
            <CardDescription className="text-sm">
              Add founders, employees, investors, or advisors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StakeholderForm onSubmit={handleAddStakeholder} />
          </CardContent>
        </Card>

        {/* Option Pool Controls */}
        <Card className="terminal-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Option Pool</CardTitle>
            <CardDescription className="text-sm">Reserve equity for future grants</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Reserved for Options</Label>
                <span className="text-sm font-medium tabular-nums">
                  {capTable.option_pool_pct}%
                </span>
              </div>
              <Slider
                value={[capTable.option_pool_pct]}
                onValueChange={handleOptionPoolChange}
                min={0}
                max={30}
                step={1}
              />
              <p className="text-muted-foreground text-xs">
                Typical range: 10-20% for early-stage startups
              </p>
            </div>

            {/* Allocation Summary */}
            <motion.div
              className="bg-muted/50 space-y-2 rounded-lg p-3"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between text-sm">
                <span>Stakeholders</span>
                <span className="tabular-nums">
                  <AnimatedPercentage
                    value={capTable.stakeholders.reduce((sum, s) => sum + s.ownership_pct, 0)}
                    decimals={1}
                  />
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Option Pool</span>
                <span className="tabular-nums">
                  <AnimatedPercentage value={capTable.option_pool_pct} decimals={0} />
                </span>
              </div>
              <div className="border-border flex justify-between border-t pt-2 text-sm font-medium">
                <span>Total Allocated</span>
                <span
                  className={`tabular-nums ${
                    totalOwnership > 100 ? "text-destructive" : "text-terminal"
                  }`}
                >
                  <AnimatedPercentage value={totalOwnership} decimals={1} />
                </span>
              </div>
              {totalOwnership > 100 && (
                <motion.p
                  className="text-destructive text-xs"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  Warning: Total exceeds 100%
                </motion.p>
              )}
            </motion.div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="terminal-card">
          <CardContent className="py-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-semibold tabular-nums">
                  {capTable.stakeholders.length}
                </p>
                <p className="text-muted-foreground text-xs">Stakeholders</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tabular-nums">{instruments.length}</p>
                <p className="text-muted-foreground text-xs">Instruments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Main Content */}
      <div className="space-y-6">
        <CapTableManager
          capTable={capTable}
          onCapTableChange={rawSetCapTable}
          instruments={instruments}
          onInstrumentsChange={rawSetInstruments}
          preferenceTiers={preferenceTiers}
          onPreferenceTiersChange={rawSetPreferenceTiers}
          hideSidebarContent
        />
      </div>
    </div>
  );
}
