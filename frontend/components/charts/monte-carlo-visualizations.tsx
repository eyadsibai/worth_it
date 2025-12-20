"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Target, ArrowLeftRight, AlertCircle } from "lucide-react";
import {
  MonteCarloHistogram,
  MonteCarloEcdf,
  MonteCarloBoxPlot,
  MonteCarloScatter,
  MonteCarloStatistics,
  MonteCarloPdf,
  MonteCarloSummary,
  formatCurrency,
  type MonteCarloStats,
  type HistogramBin,
  type EcdfDataPoint,
  type ScatterDataPoint,
  type BoxPlotDataPoint,
} from "./monte-carlo";

interface MonteCarloVisualizationsProps {
  netOutcomes: number[];
  simulatedValuations: number[];
}

const STORAGE_KEY = "monte-carlo-expanded";

export function MonteCarloVisualizations({
  netOutcomes,
  simulatedValuations,
}: MonteCarloVisualizationsProps) {
  // Expand/collapse state with localStorage persistence
  const [isExpanded, setIsExpanded] = React.useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) === "true";
    }
    return false;
  });

  // Persist preference to localStorage
  const handleToggleExpanded = React.useCallback(() => {
    const newValue = !isExpanded;
    setIsExpanded(newValue);
    localStorage.setItem(STORAGE_KEY, String(newValue));
  }, [isExpanded]);

  // Guard: Check for empty or invalid data
  const hasValidData = netOutcomes.length > 0 && simulatedValuations.length > 0;

  // Calculate statistics (with guards for empty data)
  // All hooks MUST be called unconditionally to satisfy Rules of Hooks
  const stats: MonteCarloStats = React.useMemo(() => {
    // Guard: Return safe defaults for empty arrays
    if (netOutcomes.length === 0) {
      return {
        mean: 0, median: 0, std: 0, min: 0, max: 0,
        p10: 0, p25: 0, p75: 0, p90: 0, positiveRate: 0
      };
    }

    const sorted = [...netOutcomes].sort((a, b) => a - b);
    const mean = netOutcomes.reduce((a, b) => a + b, 0) / netOutcomes.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const std = Math.sqrt(
      netOutcomes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / netOutcomes.length
    );
    const positiveCount = netOutcomes.filter((x) => x > 0).length;
    const positiveRate = (positiveCount / netOutcomes.length) * 100;

    return { mean, median, std, min, max, p10, p25, p75, p90, positiveRate };
  }, [netOutcomes]);

  // Generate plain-English headline based on success rate
  const headline = React.useMemo(() => {
    const successPct = Math.round(stats.positiveRate);
    if (stats.positiveRate >= 70) {
      return `Strong outlook: ${successPct}% chance of a positive outcome`;
    } else if (stats.positiveRate >= 50) {
      return `Moderate outlook: ${successPct}% chance of a positive outcome`;
    } else {
      return `Caution: only ${successPct}% chance of a positive outcome`;
    }
  }, [stats.positiveRate]);

  // Prepare histogram data (with guards for empty/single-value data)
  const histogramData: HistogramBin[] = React.useMemo(() => {
    // Guard: Return empty array for empty data
    if (netOutcomes.length === 0) {
      return [];
    }

    const bins = 30;
    const min = Math.min(...netOutcomes);
    const max = Math.max(...netOutcomes);

    // Handle single-value edge case: when all values are identical, min === max
    // This would cause binWidth = 0, leading to NaN in bin calculations
    if (min === max) {
      return [{
        bin: min,
        count: netOutcomes.length,
        label: formatCurrency(min),
      }];
    }

    const binWidth = (max - min) / bins;

    const histogram = Array.from({ length: bins }, (_, i) => ({
      bin: min + i * binWidth,
      count: 0,
      label: formatCurrency(min + i * binWidth),
    }));

    netOutcomes.forEach((value) => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1);
      histogram[binIndex].count++;
    });

    return histogram;
  }, [netOutcomes]);

  // Prepare ECDF data
  const ecdfData: EcdfDataPoint[] = React.useMemo(() => {
    // Guard: Return empty array for empty data
    if (netOutcomes.length === 0) {
      return [];
    }

    const sorted = [...netOutcomes].sort((a, b) => a - b);
    return sorted.map((value, index) => ({
      value,
      probability: ((index + 1) / sorted.length) * 100,
      label: formatCurrency(value),
    }));
  }, [netOutcomes]);

  // Prepare scatter data
  const scatterData: ScatterDataPoint[] = React.useMemo(() => {
    // Guard: Return empty array for empty data
    if (netOutcomes.length === 0) {
      return [];
    }

    return netOutcomes.map((outcome, i) => ({
      valuation: simulatedValuations[i],
      outcome,
    }));
  }, [netOutcomes, simulatedValuations]);

  // Box plot data
  const boxPlotData: BoxPlotDataPoint[] = React.useMemo(() => {
    // Guard: Return empty array for empty data
    if (netOutcomes.length === 0) {
      return [];
    }

    return [
      { name: "Min", value: stats.min },
      { name: "P10", value: stats.p10 },
      { name: "P25", value: stats.p25 },
      { name: "Median", value: stats.median },
      { name: "P75", value: stats.p75 },
      { name: "P90", value: stats.p90 },
      { name: "Max", value: stats.max },
    ];
  }, [stats, netOutcomes.length]);

  // Early return for empty data - show helpful empty state
  // This MUST come AFTER all hooks to satisfy Rules of Hooks
  if (!hasValidData) {
    return (
      <Card data-tour="monte-carlo-chart">
        <CardHeader>
          <CardTitle>Monte Carlo Results</CardTitle>
          <CardDescription>
            No simulation data available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Simulation Results</h3>
            <p className="text-muted-foreground max-w-md">
              Run a Monte Carlo simulation to see the distribution of possible outcomes.
              This helps you understand the range of potential returns based on different scenarios.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-tour="monte-carlo-chart">
      <CardHeader>
        <CardTitle>Monte Carlo Results</CardTitle>
        <CardDescription>
          Analysis of {netOutcomes.length.toLocaleString()} simulation scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6" data-tour="monte-carlo-stats">
        {/* Plain-English Summary Headline */}
        <div
          data-testid="monte-carlo-headline"
          className="text-2xl font-semibold text-center py-4"
        >
          {headline}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 flex flex-col items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span>Expected Value</span>
            </div>
            <span className="text-xl font-semibold tabular-nums">
              {formatCurrency(stats.mean)}
            </span>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 flex flex-col items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              {stats.positiveRate >= 50 ? (
                <TrendingUp className="h-4 w-4 text-terminal" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span>Success Probability</span>
            </div>
            <span
              className={`text-xl font-semibold tabular-nums ${
                stats.positiveRate >= 50 ? "text-terminal" : "text-destructive"
              }`}
            >
              {stats.positiveRate.toFixed(1)}%
            </span>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 flex flex-col items-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ArrowLeftRight className="h-4 w-4" />
              <span>Outcome Range</span>
            </div>
            <span className="text-xl font-semibold tabular-nums">
              {formatCurrency(stats.min)} to {formatCurrency(stats.max)}
            </span>
          </div>
        </div>

        {/* Histogram Section (visible only when collapsed to avoid duplication) */}
        {!isExpanded && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Distribution of Outcomes
            </h3>
            <MonteCarloHistogram data={histogramData} />
          </div>
        )}

        {/* Expand/Collapse Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={handleToggleExpanded}
            className="gap-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide detailed analysis
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                See detailed analysis
              </>
            )}
          </Button>
        </div>

        {/* Detailed Analysis Tabs (only when expanded) */}
        {isExpanded && (
          <Tabs defaultValue="histogram">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="histogram">Histogram</TabsTrigger>
              <TabsTrigger value="ecdf">ECDF</TabsTrigger>
              <TabsTrigger value="box">Box Plot</TabsTrigger>
              <TabsTrigger value="scatter">Scatter</TabsTrigger>
              <TabsTrigger value="stats">Statistics</TabsTrigger>
              <TabsTrigger value="pdf">PDF</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
            </TabsList>

            <TabsContent value="histogram" className="space-y-4">
              <MonteCarloHistogram data={histogramData} />
            </TabsContent>

            <TabsContent value="ecdf" className="space-y-4">
              <MonteCarloEcdf data={ecdfData} />
            </TabsContent>

            <TabsContent value="box" className="space-y-4">
              <MonteCarloBoxPlot data={boxPlotData} />
            </TabsContent>

            <TabsContent value="scatter" className="space-y-4">
              <MonteCarloScatter data={scatterData} />
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <MonteCarloStatistics stats={stats} />
            </TabsContent>

            <TabsContent value="pdf" className="space-y-4">
              <MonteCarloPdf data={histogramData} />
            </TabsContent>

            <TabsContent value="summary" className="space-y-4">
              <MonteCarloSummary stats={stats} simulationCount={netOutcomes.length} />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
