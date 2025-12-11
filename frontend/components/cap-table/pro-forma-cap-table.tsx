"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { CapTable, ConversionResult } from "@/lib/schemas";

interface ProFormaCapTableProps {
  capTable: CapTable;
  conversions: ConversionResult[];
  isLoading: boolean;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

function formatPercent(pct: number): string {
  return `${pct.toFixed(2)}%`;
}

export function ProFormaCapTable({
  capTable,
  conversions,
  isLoading,
}: ProFormaCapTableProps) {
  // Calculate total shares including conversions
  const conversionShares = conversions.reduce((sum, c) => sum + c.shares_issued, 0);
  const totalProFormaShares = capTable.total_shares + conversionShares;

  // Recalculate ownership percentages for existing stakeholders
  const existingStakeholders = capTable.stakeholders.map((s) => ({
    ...s,
    proFormaOwnership: totalProFormaShares > 0
      ? (s.shares / totalProFormaShares) * 100
      : 0,
  }));

  // Create rows for converted investors
  // Only "cap" and "discount" are valid per schema; handle unexpected values defensively
  const convertedInvestors = conversions.map((c) => {
    let type: string;
    if (c.conversion_method === "cap" || c.conversion_method === "discount") {
      type = "SAFE";
    } else {
      // This should never happen if schema is enforced, but handle defensively
      console.warn(`Unexpected conversion_method: ${c.conversion_method}`);
      type = "Unknown";
    }
    return {
      name: c.investor_name,
      shares: c.shares_issued,
      ownership: c.ownership_pct,
      type,
      isConverted: true,
    };
  });

  const hasStakeholders = capTable.stakeholders.length > 0 || conversions.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-muted-foreground">Calculating pro-forma ownership...</span>
      </div>
    );
  }

  if (!hasStakeholders) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No stakeholders in the cap table yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stakeholder</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Ownership %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Existing stakeholders */}
          {existingStakeholders.map((stakeholder) => (
            <TableRow key={stakeholder.id}>
              <TableCell className="font-medium">{stakeholder.name}</TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize">
                  {stakeholder.type}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(stakeholder.shares)}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(stakeholder.proFormaOwnership)}
              </TableCell>
            </TableRow>
          ))}

          {/* Converted investors */}
          {convertedInvestors.map((investor, idx) => (
            <TableRow key={`conversion-${idx}`} className="bg-muted/30">
              <TableCell className="font-medium">{investor.name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{investor.type}</Badge>
              </TableCell>
              <TableCell className="text-right">
                {formatNumber(investor.shares)}
              </TableCell>
              <TableCell className="text-right">
                {formatPercent(investor.ownership)}
              </TableCell>
            </TableRow>
          ))}

          {/* Option Pool Row */}
          {capTable.option_pool_pct > 0 && (
            <TableRow className="bg-muted/20">
              <TableCell className="font-medium">Option Pool (Reserved)</TableCell>
              <TableCell>
                <Badge variant="outline">Pool</Badge>
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">
                {formatPercent(capTable.option_pool_pct)}
              </TableCell>
            </TableRow>
          )}

          {/* Total Row */}
          <TableRow className="font-bold border-t-2">
            <TableCell>Total</TableCell>
            <TableCell></TableCell>
            <TableCell className="text-right">
              {formatNumber(totalProFormaShares)}
            </TableCell>
            <TableCell className="text-right">100%</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {conversions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Pro-forma view includes {conversions.length} pending conversion(s) totaling{" "}
          {formatNumber(conversionShares)} new shares.
        </p>
      )}
    </div>
  );
}
