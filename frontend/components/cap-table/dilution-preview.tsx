"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Loader2 } from "lucide-react";
import { DilutionTable } from "./dilution-table";
import { DilutionComparisonCharts } from "./dilution-comparison-charts";
import { useGetDilutionPreview } from "@/lib/api-client";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { Stakeholder, DilutionData } from "@/lib/schemas";
import { transformDilutionResult } from "@/lib/schemas";

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

  const dilutionMutation = useGetDilutionPreview();

  // Trigger API call when debounced values change
  React.useEffect(() => {
    if (debouncedPreMoney <= 0 || debouncedAmount <= 0) {
      return;
    }

    // Transform stakeholders to API format
    const apiStakeholders = stakeholders.map((s) => ({
      name: s.name,
      type: s.type,
      ownership_pct: s.ownership_pct,
    }));

    dilutionMutation.mutate({
      stakeholders: apiStakeholders,
      option_pool_pct: optionPoolPct,
      pre_money_valuation: debouncedPreMoney,
      amount_raised: debouncedAmount,
      investor_name: debouncedInvestorName || "New Investor",
    });
  }, [
    stakeholders,
    optionPoolPct,
    debouncedPreMoney,
    debouncedAmount,
    debouncedInvestorName,
  ]);

  // Transform API response to frontend format
  const dilutionData: DilutionData[] = React.useMemo(() => {
    if (!dilutionMutation.data) return [];
    return dilutionMutation.data.dilution_results.map(transformDilutionResult);
  }, [dilutionMutation.data]);

  // Calculate summary stats from API response
  const summaryStats = React.useMemo(() => {
    if (!dilutionMutation.data || dilutionData.length === 0) return null;

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
      postMoneyValuation: dilutionMutation.data.post_money_valuation,
    };
  }, [dilutionMutation.data, dilutionData]);

  // Don't render if inputs are invalid
  if (debouncedPreMoney <= 0 || debouncedAmount <= 0) {
    return null;
  }

  // Show loading state
  if (dilutionMutation.isPending) {
    return (
      <Card className="terminal-card border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Loader2 className="h-4 w-4 animate-spin text-terminal" />
            Calculating Dilution...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  // Don't render if no data yet
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
