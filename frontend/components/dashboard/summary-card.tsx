"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3, Briefcase, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-utils";

interface SummaryStats {
  totalScenarios: number;
  employeeScenarios: number;
  founderScenarios: number;
  worthItCount: number;
  notWorthItCount: number;
  averageNetBenefit: number;
  bestOpportunity: {
    name: string;
    netBenefit: number;
  } | null;
}

interface SummaryCardProps {
  stats: SummaryStats;
  className?: string;
}

export function SummaryCard({ stats, className }: SummaryCardProps) {
  const worthItPercentage = stats.employeeScenarios > 0
    ? Math.round((stats.worthItCount / stats.employeeScenarios) * 100)
    : 0;

  return (
    <Card className={cn("terminal-card", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5 text-terminal" />
          Your Analysis Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Scenarios */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total Scenarios
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {stats.totalScenarios}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Briefcase className="h-3 w-3" />
              Employee
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {stats.employeeScenarios}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Founder
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {stats.founderScenarios}
            </p>
          </div>
        </div>

        {/* Worth It Analysis */}
        {stats.employeeScenarios > 0 && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Worth It Rate</span>
              <span className="text-sm font-medium">{worthItPercentage}%</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-terminal/20 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-terminal transition-all duration-500"
                  style={{ width: `${worthItPercentage}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <span className="flex items-center gap-1 text-terminal">
                <TrendingUp className="h-3 w-3" />
                {stats.worthItCount} worth it
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <TrendingDown className="h-3 w-3" />
                {stats.notWorthItCount} not worth it
              </span>
            </div>
          </div>
        )}

        {/* Best Opportunity */}
        {stats.bestOpportunity && (
          <div className="pt-4 border-t">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Best Opportunity
            </p>
            <div className="flex items-center justify-between">
              <span className="font-medium truncate max-w-[60%]">
                {stats.bestOpportunity.name}
              </span>
              <span className={cn(
                "text-sm font-semibold tabular-nums",
                stats.bestOpportunity.netBenefit >= 0 ? "text-terminal" : "text-destructive"
              )}>
                {stats.bestOpportunity.netBenefit >= 0 ? "+" : ""}
                {formatCurrency(stats.bestOpportunity.netBenefit)}
              </span>
            </div>
          </div>
        )}

        {/* Average Net Benefit */}
        {stats.employeeScenarios > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Average Net Benefit
            </p>
            <p className={cn(
              "text-xl font-semibold tabular-nums",
              stats.averageNetBenefit >= 0 ? "text-terminal" : "text-destructive"
            )}>
              {stats.averageNetBenefit >= 0 ? "+" : ""}
              {formatCurrency(stats.averageNetBenefit)}
              <span className="text-muted-foreground text-sm">/scenario</span>
            </p>
          </div>
        )}

        {/* Empty State */}
        {stats.totalScenarios === 0 && (
          <div className="py-4 text-center text-muted-foreground">
            <p>No scenarios saved yet.</p>
            <p className="text-sm">Create your first analysis to see insights here.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
