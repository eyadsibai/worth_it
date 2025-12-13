"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export interface Column<T> {
  /** Unique key for the column */
  key: string;
  /** Header label */
  header: string;
  /** Function to render cell content */
  cell: (row: T, index: number) => React.ReactNode;
  /** Optional class name for table cell */
  className?: string;
  /** Whether this is the primary column (shown prominently on mobile) */
  primary?: boolean;
  /** Whether to hide this column on mobile cards (use for redundant data) */
  hideOnMobile?: boolean;
}

export interface ResponsiveTableProps<T> {
  /** Data array to display */
  data: T[];
  /** Column definitions */
  columns: Column<T>[];
  /** Function to get unique key for each row */
  getRowKey: (row: T, index: number) => string;
  /** Optional row class name function */
  rowClassName?: (row: T, index: number) => string;
  /** Optional empty state message */
  emptyMessage?: string;
  /** Optional footer row */
  footer?: React.ReactNode;
  /** Optional class name for the container */
  className?: string;
}

/**
 * A responsive table component that renders as cards on mobile
 * and as a standard table on larger screens.
 *
 * @example
 * ```tsx
 * <ResponsiveTable
 *   data={stakeholders}
 *   columns={[
 *     { key: "name", header: "Name", cell: (s) => s.name, primary: true },
 *     { key: "shares", header: "Shares", cell: (s) => formatNumber(s.shares), className: "text-right" },
 *   ]}
 *   getRowKey={(s) => s.id}
 * />
 * ```
 */
export function ResponsiveTable<T>({
  data,
  columns,
  getRowKey,
  rowClassName,
  emptyMessage = "No data available",
  footer,
  className,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Mobile: Render as cards
  if (isMobile) {
    const primaryColumn = columns.find((c) => c.primary) || columns[0];
    const otherColumns = columns.filter((c) => c !== primaryColumn && !c.hideOnMobile);

    return (
      <div className={cn("space-y-3", className)}>
        {data.map((row, index) => (
          <Card
            key={getRowKey(row, index)}
            className={cn(
              "border bg-card",
              rowClassName?.(row, index)
            )}
          >
            <CardContent className="p-4">
              {/* Primary field - prominent display */}
              <div className="font-medium text-sm mb-3">
                {primaryColumn.cell(row, index)}
              </div>

              {/* Other fields as label-value pairs */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {otherColumns.map((col) => (
                  <div key={col.key}>
                    <div className="text-xs text-muted-foreground font-mono mb-0.5">
                      {col.header}
                    </div>
                    <div className={cn("font-mono", col.className)}>
                      {col.cell(row, index)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Footer on mobile */}
        {footer && (
          <Card className="border-2 bg-muted/30">
            <CardContent className="p-4">
              {footer}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Desktop: Render as table
  return (
    <div className={cn("overflow-x-auto", className)}>
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow
              key={getRowKey(row, index)}
              className={rowClassName?.(row, index)}
            >
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.cell(row, index)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Footer rendered separately for table */}
      {footer}
    </div>
  );
}

/**
 * Mobile-friendly footer component for ResponsiveTable.
 * Renders as a summary card showing totals.
 */
export interface TableFooterProps {
  /** Label-value pairs to display */
  items: Array<{
    label: string;
    value: React.ReactNode;
    className?: string;
  }>;
}

export function ResponsiveTableFooter({ items }: TableFooterProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm font-medium">
      {items.map((item, index) => (
        <div key={index}>
          <div className="text-xs text-muted-foreground font-mono mb-0.5">
            {item.label}
          </div>
          <div className={cn("font-mono", item.className)}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
