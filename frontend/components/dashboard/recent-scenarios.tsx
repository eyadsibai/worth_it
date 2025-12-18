"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Briefcase, Building2, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-utils";

interface EmployeeScenarioPreview {
  type: "employee";
  id: string;
  name: string;
  timestamp: string;
  isWorthIt: boolean;
  netBenefit: number;
}

interface FounderScenarioPreview {
  type: "founder";
  id: string;
  name: string;
  updatedAt: string;
  stakeholderCount: number;
  totalFunding: number;
}

type ScenarioPreview = EmployeeScenarioPreview | FounderScenarioPreview;

interface RecentScenariosProps {
  scenarios: ScenarioPreview[];
  onLoadScenario: (id: string, type: "employee" | "founder") => void;
  onViewAll?: () => void;
  maxItems?: number;
  className?: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function RecentScenarios({
  scenarios,
  onLoadScenario,
  onViewAll,
  maxItems = 5,
  className,
}: RecentScenariosProps) {
  const displayedScenarios = scenarios.slice(0, maxItems);

  return (
    <Card className={cn("terminal-card", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-terminal" />
            Recent Scenarios
          </CardTitle>
          {scenarios.length > maxItems && onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs">
              View All
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayedScenarios.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent scenarios</p>
            <p className="text-sm">Your saved work will appear here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedScenarios.map((scenario) => (
              <button
                key={`${scenario.type}-${scenario.id}`}
                onClick={() => onLoadScenario(scenario.id, scenario.type)}
                className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left group"
              >
                {/* Icon */}
                <div className={cn(
                  "p-2 rounded-lg",
                  scenario.type === "employee" ? "bg-chart-2/20" : "bg-chart-3/20"
                )}>
                  {scenario.type === "employee" ? (
                    <Briefcase className="h-4 w-4 text-chart-2" />
                  ) : (
                    <Building2 className="h-4 w-4 text-chart-3" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate group-hover:text-terminal transition-colors">
                    {scenario.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {formatRelativeTime(
                        scenario.type === "employee" ? scenario.timestamp : scenario.updatedAt
                      )}
                    </span>
                    {scenario.type === "employee" && (
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs px-1.5 py-0",
                          scenario.isWorthIt
                            ? "border-terminal/30 text-terminal"
                            : "border-muted-foreground/30 text-muted-foreground"
                        )}
                      >
                        {scenario.isWorthIt ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {scenario.isWorthIt ? "Worth it" : "Not worth it"}
                      </Badge>
                    )}
                    {scenario.type === "founder" && (
                      <span className="text-xs">
                        {scenario.stakeholderCount} stakeholder{scenario.stakeholderCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Value */}
                <div className="text-right shrink-0">
                  {scenario.type === "employee" ? (
                    <span className={cn(
                      "text-sm font-semibold tabular-nums",
                      scenario.netBenefit >= 0 ? "text-terminal" : "text-destructive"
                    )}>
                      {scenario.netBenefit >= 0 ? "+" : ""}
                      {formatCurrency(scenario.netBenefit)}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold tabular-nums text-terminal">
                      {formatCurrency(scenario.totalFunding)}
                    </span>
                  )}
                </div>

                {/* Arrow */}
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-terminal transition-colors shrink-0" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
