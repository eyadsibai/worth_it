"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Briefcase, Building2, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format-utils";
import { AnimatedCurrencyDisplay, MotionListItem, MotionList } from "@/lib/motion";

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

  // Handle future dates explicitly (e.g., clock skew or manipulation)
  if (diffMs < 0) {
    const futureMs = Math.abs(diffMs);
    const futureMins = Math.floor(futureMs / 60000);
    const futureHours = Math.floor(futureMs / 3600000);
    const futureDays = Math.floor(futureMs / 86400000);

    if (futureMins < 1) return "In a few seconds";
    if (futureMins < 60) return `In ${futureMins}m`;
    if (futureHours < 24) return `In ${futureHours}h`;
    if (futureDays < 7) return `In ${futureDays}d`;
    return date.toLocaleDateString();
  }

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
            <Clock className="text-terminal h-5 w-5" />
            Recent Scenarios
          </CardTitle>
          {scenarios.length > maxItems && onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs">
              View All
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayedScenarios.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            <Clock className="mx-auto mb-2 h-8 w-8 opacity-50" />
            <p>No recent scenarios</p>
            <p className="text-sm">Your saved work will appear here.</p>
          </div>
        ) : (
          <MotionList className="space-y-2">
            {displayedScenarios.map((scenario) => (
              <MotionListItem key={`${scenario.type}-${scenario.id}`}>
                <button
                  onClick={() => onLoadScenario(scenario.id, scenario.type)}
                  className="bg-card hover:bg-accent/50 group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors"
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "rounded-lg p-2",
                      scenario.type === "employee" ? "bg-chart-2/20" : "bg-chart-3/20"
                    )}
                  >
                    {scenario.type === "employee" ? (
                      <Briefcase className="text-chart-2 h-4 w-4" />
                    ) : (
                      <Building2 className="text-chart-3 h-4 w-4" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="group-hover:text-terminal truncate font-medium transition-colors">
                      {scenario.name}
                    </p>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span>
                        {formatRelativeTime(
                          scenario.type === "employee" ? scenario.timestamp : scenario.updatedAt
                        )}
                      </span>
                      {scenario.type === "employee" && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "px-1.5 py-0 text-xs",
                            scenario.isWorthIt
                              ? "border-terminal/30 text-terminal"
                              : "border-muted-foreground/30 text-muted-foreground"
                          )}
                        >
                          {scenario.isWorthIt ? (
                            <TrendingUp className="mr-1 h-3 w-3" />
                          ) : (
                            <TrendingDown className="mr-1 h-3 w-3" />
                          )}
                          {scenario.isWorthIt ? "Worth it" : "Not worth it"}
                        </Badge>
                      )}
                      {scenario.type === "founder" && (
                        <span className="text-xs">
                          {scenario.stakeholderCount} stakeholder
                          {scenario.stakeholderCount !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Value */}
                  <div className="shrink-0 text-right">
                    {scenario.type === "employee" ? (
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          scenario.netBenefit >= 0 ? "text-terminal" : "text-destructive"
                        )}
                      >
                        {scenario.netBenefit >= 0 ? "+" : ""}
                        <AnimatedCurrencyDisplay value={scenario.netBenefit} showDelta={false} />
                      </span>
                    ) : (
                      <span className="text-terminal text-sm font-semibold tabular-nums">
                        <AnimatedCurrencyDisplay value={scenario.totalFunding} showDelta={false} />
                      </span>
                    )}
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="text-muted-foreground group-hover:text-terminal h-4 w-4 shrink-0 transition-colors" />
                </button>
              </MotionListItem>
            ))}
          </MotionList>
        )}
      </CardContent>
    </Card>
  );
}
