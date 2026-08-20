import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ColumnAlign = "start" | "end";

interface RuledTableProps {
  head: ReactNode[];
  align?: ColumnAlign[];
  children: ReactNode;
  className?: string;
}

/**
 * A table with eyebrow-styled headers and hairline rules between rows.
 * `align` positions each header label; body rows are authored by the caller
 * (as `<tr>`/`<td>` children) and should mirror the same alignment on their
 * numeric cells with `text-end font-mono tabular-nums`.
 */
export function RuledTable({ head, align, children, className }: RuledTableProps) {
  return (
    <table className={cn("w-full border-collapse text-sm", className)}>
      <thead>
        <tr className="border-rule-strong border-b">
          {head.map((label, index) => {
            const columnAlign = align?.[index] ?? "start";
            return (
              <th
                key={index}
                scope="col"
                className={cn(
                  "tracking-eyebrow text-annotation py-2 font-sans text-xs uppercase",
                  columnAlign === "end" ? "text-end" : "text-start"
                )}
              >
                {label}
              </th>
            );
          })}
        </tr>
      </thead>
      <tbody className="[&>tr]:border-rule [&>tr:not(:last-child)]:border-b">{children}</tbody>
    </table>
  );
}
