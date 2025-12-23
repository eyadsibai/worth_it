"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, GitCompare, Download, Briefcase, Building2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  onNewEmployeeAnalysis: () => void;
  onNewFounderAnalysis: () => void;
  onLoadExample: () => void;
  onCompareAll?: () => void;
  onExportSummary?: () => void;
  hasScenarios: boolean;
  className?: string;
}

export function QuickActions({
  onNewEmployeeAnalysis,
  onNewFounderAnalysis,
  onLoadExample,
  onCompareAll,
  onExportSummary,
  hasScenarios,
  className,
}: QuickActionsProps) {
  return (
    <Card className={cn("terminal-card", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="text-terminal h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* New Employee Analysis */}
          <Button
            variant="outline"
            className="hover:border-terminal hover:text-terminal group flex h-auto flex-col items-center gap-2 py-4"
            onClick={onNewEmployeeAnalysis}
          >
            <div className="bg-chart-2/20 group-hover:bg-terminal/20 rounded-lg p-2 transition-colors">
              <Briefcase className="text-chart-2 group-hover:text-terminal h-5 w-5 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">New Job Analysis</p>
              <p className="text-muted-foreground text-xs">Compare offers</p>
            </div>
          </Button>

          {/* New Founder Analysis */}
          <Button
            variant="outline"
            className="hover:border-terminal hover:text-terminal group flex h-auto flex-col items-center gap-2 py-4"
            onClick={onNewFounderAnalysis}
          >
            <div className="bg-chart-3/20 group-hover:bg-terminal/20 rounded-lg p-2 transition-colors">
              <Building2 className="text-chart-3 group-hover:text-terminal h-5 w-5 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Cap Table</p>
              <p className="text-muted-foreground text-xs">Founder tools</p>
            </div>
          </Button>

          {/* Load Example */}
          <Button
            variant="outline"
            className="hover:border-terminal hover:text-terminal group flex h-auto flex-col items-center gap-2 py-4"
            onClick={onLoadExample}
          >
            <div className="bg-muted group-hover:bg-terminal/20 rounded-lg p-2 transition-colors">
              <FileText className="text-muted-foreground group-hover:text-terminal h-5 w-5 transition-colors" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Load Example</p>
              <p className="text-muted-foreground text-xs">Try a demo</p>
            </div>
          </Button>

          {/* Compare All */}
          {hasScenarios && onCompareAll && (
            <Button
              variant="outline"
              className="hover:border-terminal hover:text-terminal group flex h-auto flex-col items-center gap-2 py-4"
              onClick={onCompareAll}
            >
              <div className="bg-muted group-hover:bg-terminal/20 rounded-lg p-2 transition-colors">
                <GitCompare className="text-muted-foreground group-hover:text-terminal h-5 w-5 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Compare All</p>
                <p className="text-muted-foreground text-xs">Side by side</p>
              </div>
            </Button>
          )}

          {/* Export Summary (only if no Compare All) */}
          {hasScenarios && !onCompareAll && onExportSummary && (
            <Button
              variant="outline"
              className="hover:border-terminal hover:text-terminal group flex h-auto flex-col items-center gap-2 py-4"
              onClick={onExportSummary}
            >
              <div className="bg-muted group-hover:bg-terminal/20 rounded-lg p-2 transition-colors">
                <Download className="text-muted-foreground group-hover:text-terminal h-5 w-5 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Export</p>
                <p className="text-muted-foreground text-xs">Download data</p>
              </div>
            </Button>
          )}

          {/* Empty slot placeholder */}
          {!hasScenarios && (
            <div className="flex h-auto flex-col items-center gap-2 rounded-lg border border-dashed py-4 opacity-50">
              <div className="bg-muted rounded-lg p-2">
                <Plus className="text-muted-foreground h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-muted-foreground text-sm font-medium">More Actions</p>
                <p className="text-muted-foreground text-xs">Save scenarios first</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
