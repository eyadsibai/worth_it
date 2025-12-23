"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { SensitivityAnalysis } from "@/components/charts/sensitivity-analysis";
import { useRunSensitivityAnalysis } from "@/lib/api-client";
import {
  buildSensitivityRequest,
  transformSensitivityResponse,
  calculateBreakevenThresholds,
} from "@/lib/sensitivity-utils";
import type { GlobalSettingsForm, CurrentJobForm, RSUForm, StockOptionsForm } from "@/lib/schemas";

interface SensitivityAnalysisPanelProps {
  globalSettings: GlobalSettingsForm;
  currentJob: CurrentJobForm;
  equityDetails: RSUForm | StockOptionsForm;
  currentOutcome: number;
}

/**
 * Sensitivity Analysis Panel for Issue #155
 * Provides quick-view sensitivity analysis with tornado chart
 */
export function SensitivityAnalysisPanel({
  globalSettings,
  currentJob,
  equityDetails,
  currentOutcome,
}: SensitivityAnalysisPanelProps) {
  const sensitivityMutation = useRunSensitivityAnalysis();

  const runAnalysis = React.useCallback(() => {
    const request = buildSensitivityRequest(globalSettings, currentJob, equityDetails);
    sensitivityMutation.mutate(request);
  }, [globalSettings, currentJob, equityDetails, sensitivityMutation]);

  // Transform results when available
  const sensitivityData = React.useMemo(() => {
    if (!sensitivityMutation.data) return null;
    return transformSensitivityResponse(sensitivityMutation.data, currentOutcome);
  }, [sensitivityMutation.data, currentOutcome]);

  // Calculate breakeven thresholds
  const breakevenThresholds = React.useMemo(() => {
    if (!sensitivityData) return [];
    return calculateBreakevenThresholds(sensitivityData, currentOutcome);
  }, [sensitivityData, currentOutcome]);

  const isRunning = sensitivityMutation.isPending;
  const hasResults = !!sensitivityData;

  return (
    <div className="space-y-6">
      {/* Intro Card with Run Button */}
      <Card className="terminal-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Sensitivity Analysis
          </CardTitle>
          <CardDescription>
            Discover which variables have the biggest impact on your outcome
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              Run sensitivity analysis to see how changes in exit valuation, salary growth,
              investment ROI, and dilution affect your net outcome. The tornado chart shows which
              factors matter most for your decision.
            </p>

            <div className="flex gap-2">
              <Button onClick={runAnalysis} disabled={isRunning} className="flex-1">
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : hasResults ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-run Analysis
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Run Sensitivity Analysis
                  </>
                )}
              </Button>
            </div>

            {/* Error Display */}
            {sensitivityMutation.isError && (
              <div className="border-destructive bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
                <p className="font-medium">Analysis Error</p>
                <p>
                  {sensitivityMutation.error?.message ||
                    "An error occurred during analysis. Please check your inputs and try again."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results Display */}
      {hasResults && sensitivityData && (
        <SensitivityAnalysis
          data={sensitivityData}
          breakeven={breakevenThresholds}
          currentOutcome={currentOutcome}
        />
      )}
    </div>
  );
}
