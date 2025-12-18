"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FileText,
  GitCompare,
  Download,
  Briefcase,
  Building2,
  Zap,
} from "lucide-react";
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
          <Zap className="h-5 w-5 text-terminal" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* New Employee Analysis */}
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:border-terminal hover:text-terminal group"
            onClick={onNewEmployeeAnalysis}
          >
            <div className="p-2 rounded-lg bg-chart-2/20 group-hover:bg-terminal/20 transition-colors">
              <Briefcase className="h-5 w-5 text-chart-2 group-hover:text-terminal transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">New Job Analysis</p>
              <p className="text-xs text-muted-foreground">Compare offers</p>
            </div>
          </Button>

          {/* New Founder Analysis */}
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:border-terminal hover:text-terminal group"
            onClick={onNewFounderAnalysis}
          >
            <div className="p-2 rounded-lg bg-chart-3/20 group-hover:bg-terminal/20 transition-colors">
              <Building2 className="h-5 w-5 text-chart-3 group-hover:text-terminal transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Cap Table</p>
              <p className="text-xs text-muted-foreground">Founder tools</p>
            </div>
          </Button>

          {/* Load Example */}
          <Button
            variant="outline"
            className="h-auto py-4 flex flex-col items-center gap-2 hover:border-terminal hover:text-terminal group"
            onClick={onLoadExample}
          >
            <div className="p-2 rounded-lg bg-muted group-hover:bg-terminal/20 transition-colors">
              <FileText className="h-5 w-5 text-muted-foreground group-hover:text-terminal transition-colors" />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Load Example</p>
              <p className="text-xs text-muted-foreground">Try a demo</p>
            </div>
          </Button>

          {/* Compare All */}
          {hasScenarios && onCompareAll && (
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-terminal hover:text-terminal group"
              onClick={onCompareAll}
            >
              <div className="p-2 rounded-lg bg-muted group-hover:bg-terminal/20 transition-colors">
                <GitCompare className="h-5 w-5 text-muted-foreground group-hover:text-terminal transition-colors" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">Compare All</p>
                <p className="text-xs text-muted-foreground">Side by side</p>
              </div>
            </Button>
          )}

          {/* Export Summary (only if no Compare All) */}
          {hasScenarios && !onCompareAll && onExportSummary && (
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 hover:border-terminal hover:text-terminal group"
              onClick={onExportSummary}
            >
              <div className="p-2 rounded-lg bg-muted group-hover:bg-terminal/20 transition-colors">
                <Download className="h-5 w-5 text-muted-foreground group-hover:text-terminal transition-colors" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm">Export</p>
                <p className="text-xs text-muted-foreground">Download data</p>
              </div>
            </Button>
          )}

          {/* Empty slot placeholder */}
          {!hasScenarios && (
            <div className="h-auto py-4 flex flex-col items-center gap-2 border border-dashed rounded-lg opacity-50">
              <div className="p-2 rounded-lg bg-muted">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="font-medium text-sm text-muted-foreground">More Actions</p>
                <p className="text-xs text-muted-foreground">Save scenarios first</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
