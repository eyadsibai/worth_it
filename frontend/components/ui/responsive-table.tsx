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

  // Track mounted state to avoid layout shift during SSR hydration
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (data.length === 0) {
    return <div className="text-muted-foreground py-8 text-center">{emptyMessage}</div>;
  }

  // During SSR or before mount, render desktop view (most common/default)
  // This minimizes layout shift on hydration
  const showMobile = mounted && isMobile;

  // Mobile: Render as cards with semantic list structure
  if (showMobile) {
    const primaryColumn = columns.find((c) => c.primary) || columns[0];
    const otherColumns = columns.filter((c) => c !== primaryColumn && !c.hideOnMobile);

    return (
      <ul className={cn("space-y-3", className)} role="list">
        {data.map((row, index) => (
          <li key={getRowKey(row, index)} role="listitem">
            <Card className={cn("bg-card border", rowClassName?.(row, index))}>
              <CardContent className="p-4">
                {/* Primary field - prominent display */}
                <div className="mb-3 text-sm font-medium">{primaryColumn.cell(row, index)}</div>

                {/* Other fields as label-value pairs */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  {otherColumns.map((col) => (
                    <div key={col.key}>
                      <div className="text-muted-foreground mb-0.5 text-xs">{col.header}</div>
                      <div className={cn("tabular-nums", col.className)}>
                        {col.cell(row, index)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}

        {/* Footer on mobile */}
        {footer && (
          <li role="listitem">
            <Card className="bg-muted/30 border-2">
              <CardContent className="p-4">{footer}</CardContent>
            </Card>
          </li>
        )}
      </ul>
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
            <TableRow key={getRowKey(row, index)} className={rowClassName?.(row, index)}>
              {columns.map((col) => (
                <TableCell key={col.key} className={col.className}>
                  {col.cell(row, index)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Footer with consistent styling across breakpoints */}
      {footer && (
        <Card className="bg-muted/30 mt-4 border-2">
          <CardContent className="p-4">{footer}</CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Responsive footer component for ResponsiveTable.
 * Renders label-value pairs in a grid layout, used for both mobile and desktop views.
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
      {items.map((item) => (
        <div key={item.label}>
          <div className="text-muted-foreground mb-0.5 text-xs">{item.label}</div>
          <div className={cn("tabular-nums", item.className)}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}
