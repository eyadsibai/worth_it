"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { motion, HighlightOnChange } from "@/lib/motion";
import type { Stakeholder } from "@/lib/schemas";

interface ExitCalculatorProps {
  stakeholders: Stakeholder[];
  optionPoolPct: number;
}

interface PayoutRow {
  name: string;
  type: string;
  ownershipPct: number;
  payout: number;
}

export function ExitCalculator({ stakeholders, optionPoolPct }: ExitCalculatorProps) {
  const [exitValuation, setExitValuation] = React.useState<number>(50000000); // 50M default

  const payouts: PayoutRow[] = React.useMemo(() => {
    const rows: PayoutRow[] = stakeholders.map((s) => ({
      name: s.name,
      type: s.type,
      ownershipPct: s.ownership_pct,
      payout: (s.ownership_pct / 100) * exitValuation,
    }));

    // Add option pool payout (typically goes to employees)
    if (optionPoolPct > 0) {
      rows.push({
        name: "Option Pool (Reserved)",
        type: "option_pool",
        ownershipPct: optionPoolPct,
        payout: (optionPoolPct / 100) * exitValuation,
      });
    }

    return rows.sort((a, b) => b.payout - a.payout);
  }, [stakeholders, optionPoolPct, exitValuation]);

  const totalAllocatedPct = payouts.reduce((sum, p) => sum + p.ownershipPct, 0);
  const totalPayout = payouts.reduce((sum, p) => sum + p.payout, 0);

  const formatCurrency = (value: number): string => {
    const formatNum = (n: number, decimals: number) => {
      const fixed = n.toFixed(decimals);
      return fixed.replace(/\.?0+$/, "");
    };
    if (value >= 1000000000) {
      return `$${formatNum(value / 1000000000, 2)}B`;
    }
    if (value >= 1000000) {
      return `$${formatNum(value / 1000000, 2)}M`;
    }
    if (value >= 1000) {
      return `$${formatNum(value / 1000, 1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <Card className="terminal-card">
      <CardHeader>
        <CardTitle>Exit Payout Calculator</CardTitle>
        <CardDescription>
          See how proceeds are distributed at different exit valuations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="exit-valuation">Exit Valuation</Label>
          <div className="relative">
            <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
              $
            </span>
            <Input
              id="exit-valuation"
              type="text"
              className="pl-12"
              value={exitValuation.toLocaleString("en-US")}
              onChange={(e) => {
                const value = e.target.value.replace(/,/g, "");
                const num = parseInt(value, 10);
                if (!isNaN(num) && num >= 0) {
                  setExitValuation(num);
                }
              }}
            />
          </div>
          <div className="mt-2 flex gap-2">
            {[10000000, 50000000, 100000000, 500000000].map((val) => (
              <motion.button
                key={val}
                type="button"
                onClick={() => setExitValuation(val)}
                className={`rounded-md border px-3 py-1 text-xs ${
                  exitValuation === val
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted"
                }`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                {formatCurrency(val)}
              </motion.button>
            ))}
          </div>
        </div>

        {payouts.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            Add stakeholders to see exit payouts
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stakeholder</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Ownership</TableHead>
                <TableHead className="text-right">Payout</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payouts.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {row.type.replace("_", " ")}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.ownershipPct.toFixed(2).replace(/\.?0+$/, "")}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <HighlightOnChange value={row.payout}>
                      {formatCurrency(row.payout)}
                    </HighlightOnChange>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell />
                <TableCell className="text-right">
                  {totalAllocatedPct.toFixed(2).replace(/\.?0+$/, "")}%
                </TableCell>
                <TableCell className="text-terminal text-right tabular-nums">
                  <HighlightOnChange value={totalPayout}>
                    {formatCurrency(totalPayout)}
                  </HighlightOnChange>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
