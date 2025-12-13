"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { ResponsiveTable, ResponsiveTableFooter, type Column } from "@/components/ui/responsive-table";
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

/** Row data for the pro-forma cap table */
interface TableRow {
  id: string;
  name: string;
  type: string;
  typeVariant: "outline" | "secondary";
  shares: number | null;
  ownership: number;
  isConverted?: boolean;
  isPool?: boolean;
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

  // Combine all data into a single array for the responsive table
  const allRows: TableRow[] = [
    // Existing stakeholders
    ...existingStakeholders.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      typeVariant: "outline" as const,
      shares: s.shares,
      ownership: s.proFormaOwnership,
    })),
    // Converted investors
    ...convertedInvestors.map((inv, idx) => ({
      id: `conversion-${idx}`,
      name: inv.name,
      type: inv.type,
      typeVariant: "secondary" as const,
      shares: inv.shares,
      ownership: inv.ownership,
      isConverted: true,
    })),
    // Option pool
    ...(capTable.option_pool_pct > 0
      ? [{
          id: "option-pool",
          name: "Option Pool (Reserved)",
          type: "Pool",
          typeVariant: "outline" as const,
          shares: null,
          ownership: capTable.option_pool_pct,
          isPool: true,
        }]
      : []),
  ];

  const columns: Column<TableRow>[] = [
    {
      key: "name",
      header: "Stakeholder",
      cell: (row) => <span className="font-medium">{row.name}</span>,
      primary: true,
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <Badge variant={row.typeVariant} className="capitalize">
          {row.type}
        </Badge>
      ),
    },
    {
      key: "shares",
      header: "Shares",
      cell: (row) => (row.shares !== null ? formatNumber(row.shares) : "-"),
      className: "text-right",
    },
    {
      key: "ownership",
      header: "Ownership %",
      cell: (row) => formatPercent(row.ownership),
      className: "text-right",
    },
  ];

  const footer = (
    <ResponsiveTableFooter
      items={[
        { label: "Total Shares", value: formatNumber(totalProFormaShares) },
        { label: "Total Ownership", value: "100%" },
      ]}
    />
  );

  return (
    <div className="space-y-4">
      <ResponsiveTable
        data={allRows}
        columns={columns}
        getRowKey={(row) => row.id}
        rowClassName={(row) =>
          row.isConverted ? "bg-muted/30" : row.isPool ? "bg-muted/20" : ""
        }
        footer={footer}
      />

      {conversions.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Pro-forma view includes {conversions.length} pending conversion(s) totaling{" "}
          {formatNumber(conversionShares)} new shares.
        </p>
      )}
    </div>
  );
}
