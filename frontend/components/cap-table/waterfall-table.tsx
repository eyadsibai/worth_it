"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { WaterfallDistribution, StakeholderPayout } from "@/lib/schemas";

interface WaterfallTableProps {
  distribution: WaterfallDistribution | null;
}

// Format currency for display
function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// Format ROI (multiple of invested capital)
function formatROI(roi: number | undefined): string {
  if (roi === undefined) return "-";
  return `${roi.toFixed(2)}x`;
}

// Get ROI badge color
function getROIColor(roi: number | undefined): string {
  if (roi === undefined) return "";
  if (roi >= 10) return "bg-green-500/20 text-green-500 border-green-500/30";
  if (roi >= 3) return "bg-chart-1/20 text-chart-1 border-chart-1/30";
  if (roi >= 1) return "bg-chart-2/20 text-chart-2 border-chart-2/30";
  return "bg-destructive/20 text-destructive border-destructive/30";
}

export function WaterfallTable({ distribution }: WaterfallTableProps) {
  if (!distribution) {
    return (
      <Card className="terminal-card">
        <CardHeader>
          <CardTitle>Stakeholder Payouts</CardTitle>
          <CardDescription>
            Select an exit valuation to see detailed payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No distribution selected
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort payouts: investors first (by ROI descending), then common shareholders
  const sortedPayouts = React.useMemo(() => {
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
  }, [distribution.stakeholder_payouts]);

  return (
    <Card className="terminal-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Stakeholder Payouts</span>
          <Badge variant="outline" className="font-mono">
            Exit: {formatCurrency(distribution.exit_valuation)}
          </Badge>
        </CardTitle>
        <CardDescription>
          Detailed breakdown of proceeds for each stakeholder
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stakeholder</TableHead>
              <TableHead className="text-right">Investment</TableHead>
              <TableHead className="text-right">Payout</TableHead>
              <TableHead className="text-right">% of Exit</TableHead>
              <TableHead className="text-right">ROI</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPayouts.map((payout: StakeholderPayout) => (
              <TableRow key={payout.stakeholder_id}>
                <TableCell className="font-medium">{payout.name}</TableCell>
                <TableCell className="text-right font-mono">
                  {payout.investment_amount !== undefined
                    ? formatCurrency(payout.investment_amount)
                    : "-"}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatCurrency(payout.payout_amount)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {payout.payout_pct.toFixed(1)}%
                </TableCell>
                <TableCell className="text-right">
                  {payout.roi !== undefined ? (
                    <Badge variant="outline" className={getROIColor(payout.roi)}>
                      {formatROI(payout.roi)}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {/* Summary row */}
            <TableRow className="border-t-2 font-medium">
              <TableCell>Total</TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(
                  sortedPayouts.reduce(
                    (sum, p) => sum + (p.investment_amount ?? 0),
                    0
                  )
                )}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(distribution.exit_valuation)}
              </TableCell>
              <TableCell className="text-right font-mono">100%</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Common vs Preferred Summary */}
        <div className="mt-4 p-4 rounded-lg bg-muted/50 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Common Shareholders</p>
            <p className="text-2xl font-mono font-semibold text-chart-1">
              {distribution.common_pct.toFixed(1)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Preferred Shareholders</p>
            <p className="text-2xl font-mono font-semibold text-chart-3">
              {distribution.preferred_pct.toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
