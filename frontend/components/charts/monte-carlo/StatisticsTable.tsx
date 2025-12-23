"use client";

import { memo } from "react";
import { formatCurrency } from "./utils";
import type { MonteCarloStats } from "./hooks/use-monte-carlo-stats";

interface StatisticsTableProps {
  stats: MonteCarloStats;
}

export const StatisticsTable = memo(function StatisticsTable({ stats }: StatisticsTableProps) {
  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold">Statistical Summary</h3>
      <div className="border-border rounded-md border">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Metric</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-border border-t">
              <td className="px-4 py-3 text-sm">Mean</td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                {formatCurrency(stats.mean)}
              </td>
            </tr>
            <tr className="border-border bg-muted/50 border-t">
              <td className="px-4 py-3 text-sm">Median (50th percentile)</td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                {formatCurrency(stats.median)}
              </td>
            </tr>
            <tr className="border-border border-t">
              <td className="px-4 py-3 text-sm">Standard Deviation</td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                {formatCurrency(stats.std)}
              </td>
            </tr>
            <tr className="border-border bg-muted/50 border-t">
              <td className="px-4 py-3 text-sm">Minimum</td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                {formatCurrency(stats.min)}
              </td>
            </tr>
            <tr className="border-border border-t">
              <td className="px-4 py-3 text-sm">10th Percentile</td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                {formatCurrency(stats.p10)}
              </td>
            </tr>
            <tr className="border-border bg-muted/50 border-t">
              <td className="px-4 py-3 text-sm">25th Percentile (Q1)</td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                {formatCurrency(stats.p25)}
              </td>
            </tr>
            <tr className="border-border border-t">
              <td className="px-4 py-3 text-sm">75th Percentile (Q3)</td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                {formatCurrency(stats.p75)}
              </td>
            </tr>
            <tr className="border-border bg-muted/50 border-t">
              <td className="px-4 py-3 text-sm">90th Percentile</td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                {formatCurrency(stats.p90)}
              </td>
            </tr>
            <tr className="border-border border-t">
              <td className="px-4 py-3 text-sm">Maximum</td>
              <td className="px-4 py-3 text-right text-sm font-medium">
                {formatCurrency(stats.max)}
              </td>
            </tr>
            <tr className="border-border bg-muted/50 border-t">
              <td className="px-4 py-3 text-sm font-semibold">Probability of Positive Outcome</td>
              <td className="text-primary px-4 py-3 text-right text-sm font-semibold">
                {stats.positiveRate.toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
});
