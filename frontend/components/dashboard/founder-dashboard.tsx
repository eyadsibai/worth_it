"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CapTableManager } from "@/components/cap-table";
import { TemplatePicker } from "@/components/templates/template-picker";
import { useAppStore } from "@/lib/store";

/**
 * FounderDashboard component for founder mode.
 *
 * Displays the cap table management interface with:
 * - Template picker when cap table is empty
 * - Full cap table manager with stakeholders, instruments, and waterfall analysis
 */
export function FounderDashboard() {
  const {
    capTable,
    instruments,
    preferenceTiers,
    setCapTable,
    setInstruments,
    setPreferenceTiers,
  } = useAppStore();

  return (
    <>
      {/* Show template picker when cap table is empty */}
      {capTable.stakeholders.length === 0 && (
        <Card className="terminal-card animate-scale-in">
          <CardContent className="py-8">
            <TemplatePicker mode="founder" />
          </CardContent>
        </Card>
      )}
      <CapTableManager
        capTable={capTable}
        onCapTableChange={setCapTable}
        instruments={instruments}
        onInstrumentsChange={setInstruments}
        preferenceTiers={preferenceTiers}
        onPreferenceTiersChange={setPreferenceTiers}
      />
    </>
  );
}
