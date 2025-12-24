"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveTable,
  ResponsiveTableFooter,
  type Column,
} from "@/components/ui/responsive-table";
import { formatLargeNumber } from "@/lib/format-utils";
import type { WaterfallDistribution, StakeholderPayout } from "@/lib/schemas";

interface WaterfallTableProps {
  distribution: WaterfallDistribution | null;
}

/**
 * Format currency for display, handling null/undefined values.
 * Uses the shared formatLargeNumber utility for consistent formatting.
 */
function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }
  return formatLargeNumber(value);
}

// Format ROI (multiple of invested capital)
function formatROI(roi: number | null | undefined): string {
  if (roi === undefined || roi === null) return "-";
  return `${roi.toFixed(2)}x`;
}

// Get ROI badge color
function getROIColor(roi: number | null | undefined): string {
  if (roi === undefined || roi === null) return "";
  if (roi >= 10) return "bg-green-500/20 text-green-500 border-green-500/30";
  if (roi >= 3) return "bg-chart-1/20 text-chart-1 border-chart-1/30";
  if (roi >= 1) return "bg-chart-2/20 text-chart-2 border-chart-2/30";
  return "bg-destructive/20 text-destructive border-destructive/30";
}

export function WaterfallTable({ distribution }: WaterfallTableProps) {
  // Sort payouts: investors first (by ROI descending), then common shareholders
  // Hook must be called unconditionally before any early returns
  const sortedPayouts = React.useMemo(() => {
    if (!distribution) return [];
    return [...distribution.stakeholder_payouts].sort((a, b) => {
      // Investors (have investment_amount) first
      const aIsInvestor = a.investment_amount !== undefined;
      const bIsInvestor = b.investment_amount !== undefined;
      if (aIsInvestor && !bIsInvestor) return -1;
      if (!aIsInvestor && bIsInvestor) return 1;
      // Within investors, sort by ROI descending
      if (aIsInvestor && bIsInvestor) {
        return (b.roi ?? 0) - (a.roi ?? 0);
      }
      // Within non-investors, sort by payout descending
      return b.payout_amount - a.payout_amount;
    });
  }, [distribution]);

  if (!distribution) {
    return (
      <Card className="terminal-card">
        <CardHeader>
          <CardTitle>Stakeholder Payouts</CardTitle>
          <CardDescription>Select an exit valuation to see detailed payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex h-[200px] items-center justify-center">
            No distribution selected
          </div>
        </CardContent>
      </Card>
    );
  }

  const columns: Column<StakeholderPayout>[] = [
    {
      key: "name",
      header: "Stakeholder",
      cell: (row) => <span className="font-medium">{row.name}</span>,
      primary: true,
    },
    {
      key: "investment",
      header: "Investment",
      cell: (row) =>
        row.investment_amount !== undefined ? formatCurrency(row.investment_amount) : "-",
      className: "text-right tabular-nums",
    },
    {
      key: "payout",
      header: "Payout",
      cell: (row) => formatCurrency(row.payout_amount),
      className: "text-right tabular-nums",
    },
    {
      key: "pct",
      header: "% of Exit",
      cell: (row) => `${(row.payout_pct ?? 0).toFixed(1)}%`,
      className: "text-right tabular-nums",
    },
    {
      key: "roi",
      header: "ROI",
      cell: (row) =>
        row.roi !== undefined ? (
          <Badge variant="outline" className={getROIColor(row.roi)}>
            {formatROI(row.roi)}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
      className: "text-right",
    },
  ];

  const totalInvestment = sortedPayouts.reduce((sum, p) => sum + (p.investment_amount ?? 0), 0);

  const footer = (
    <ResponsiveTableFooter
      items={[
        { label: "Total Investment", value: formatCurrency(totalInvestment) },
        { label: "Total Payout", value: formatCurrency(distribution.exit_valuation) },
        { label: "Exit Distribution", value: "100%" },
      ]}
    />
  );

  return (
    <Card className="terminal-card">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>Stakeholder Payouts</span>
          <Badge variant="outline" className="tabular-nums">
            Exit: {formatCurrency(distribution.exit_valuation)}
          </Badge>
        </CardTitle>
        <CardDescription>Detailed breakdown of proceeds for each stakeholder</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveTable
          data={sortedPayouts}
          columns={columns}
          getRowKey={(row) => row.stakeholder_id}
          footer={footer}
        />

        {/* Common vs Preferred Summary */}
        <div className="bg-muted/50 mt-4 grid grid-cols-2 gap-4 rounded-lg p-4">
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Common Shareholders</p>
            <p className="text-chart-1 text-2xl font-semibold tabular-nums">
              {(distribution.common_pct ?? 0).toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-sm">Preferred Shareholders</p>
            <p className="text-chart-3 text-2xl font-semibold tabular-nums">
              {(distribution.preferred_pct ?? 0).toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
