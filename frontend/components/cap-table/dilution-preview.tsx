"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";
import { DilutionTable } from "./dilution-table";
import { DilutionComparisonCharts } from "./dilution-comparison-charts";
import { calculateDilution, type DilutionData } from "@/lib/dilution-utils";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { Stakeholder } from "@/lib/schemas";

interface DilutionPreviewProps {
  stakeholders: Stakeholder[];
  optionPoolPct: number;
  preMoneyValuation: number;
  amountRaised: number;
  investorName?: string;
}

export function DilutionPreview({
  stakeholders,
  optionPoolPct,
  preMoneyValuation,
  amountRaised,
  investorName = "New Investor",
}: DilutionPreviewProps) {
  // Debounce the input values to avoid jittery updates while typing
  const debouncedPreMoney = useDebounce(preMoneyValuation, 300);
  const debouncedAmount = useDebounce(amountRaised, 300);
  const debouncedInvestorName = useDebounce(investorName, 300);

  // Calculate dilution data
  const dilutionData: DilutionData[] = React.useMemo(() => {
    // Only calculate if we have valid inputs
    if (debouncedPreMoney <= 0 || debouncedAmount <= 0) {
      return [];
    }

    return calculateDilution(
      stakeholders,
      optionPoolPct,
      debouncedPreMoney,
      debouncedAmount,
      debouncedInvestorName || "New Investor"
    );
  }, [
    stakeholders,
    optionPoolPct,
    debouncedPreMoney,
    debouncedAmount,
    debouncedInvestorName,
  ]);

  // Calculate summary stats
  const summaryStats = React.useMemo(() => {
    if (dilutionData.length === 0) return null;

    const newInvestor = dilutionData.find((d) => d.isNew);
    const existingHolders = dilutionData.filter((d) => !d.isNew);
    const avgDilution =
      existingHolders.length > 0
        ? existingHolders.reduce((sum, d) => sum + d.dilutionPct, 0) /
          existingHolders.length
        : 0;

    return {
      newInvestorPct: newInvestor?.afterPct ?? 0,
      avgDilutionPct: avgDilution,
      postMoneyValuation: debouncedPreMoney + debouncedAmount,
    };
  }, [dilutionData, debouncedPreMoney, debouncedAmount]);

  // Don't render if no valid data
  if (dilutionData.length === 0) {
    return null;
  }

  return (
    <Card className="terminal-card border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4 text-terminal" />
          Dilution Preview
        </CardTitle>
        {summaryStats && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>
              Post-money:{" "}
              <span className="tabular-nums text-foreground">
                ${(summaryStats.postMoneyValuation / 1_000_000).toFixed(1)}M
              </span>
            </span>
            <span>
              New investor:{" "}
              <span className="tabular-nums text-terminal">
                {summaryStats.newInvestorPct.toFixed(1)}%
              </span>
            </span>
            <span>
              Dilution:{" "}
              <span className="tabular-nums text-destructive">
                {summaryStats.avgDilutionPct.toFixed(1)}%
              </span>
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <DilutionTable data={dilutionData} />
        <DilutionComparisonCharts data={dilutionData} />
      </CardContent>
    </Card>
  );
}
