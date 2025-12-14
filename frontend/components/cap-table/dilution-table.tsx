"use client";

import * as React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Star } from "lucide-react";
import type { DilutionData } from "@/lib/dilution-utils";

interface DilutionTableProps {
  data: DilutionData[];
}

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
    case "option_pool":
      return "bg-chart-5/20 text-chart-5 border-chart-5/30";
    case "new_investor":
      return "bg-terminal/20 text-terminal border-terminal/30";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const formatType = (type: string) => {
  switch (type) {
    case "option_pool":
      return "Pool";
    case "new_investor":
      return "New";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

export function DilutionTable({ data }: DilutionTableProps) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-semibold">Stakeholder</TableHead>
            <TableHead className="text-right font-semibold">Before</TableHead>
            <TableHead className="text-right font-semibold">After</TableHead>
            <TableHead className="text-right font-semibold">Dilution</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={`${row.name}-${row.type}-${index}`}
              className={row.isNew ? "bg-terminal/5" : undefined}
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{row.name}</span>
                  <Badge
                    variant="outline"
                    className={`text-xs ${getTypeColor(row.type)}`}
                  >
                    {formatType(row.type)}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.isNew ? "—" : `${row.beforePct.toFixed(1)}%`}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {row.afterPct.toFixed(1)}%
              </TableCell>
              <TableCell className="text-right">
                {row.isNew ? (
                  <span className="inline-flex items-center gap-1 text-terminal">
                    <Star className="h-3 w-3" aria-hidden="true" />
                    <span className="text-xs font-medium">new</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-destructive">
                    <TrendingDown className="h-3 w-3" aria-hidden="true" />
                    <span className="tabular-nums text-sm">
                      {row.dilutionPct.toFixed(1)}%
                    </span>
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
