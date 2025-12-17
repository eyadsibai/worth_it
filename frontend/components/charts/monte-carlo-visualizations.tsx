"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Target } from "lucide-react";
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

  // Calculate statistics
  const stats: MonteCarloStats = React.useMemo(() => {
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
      return `${successPct}% chance of a positive outcome`;
    } else if (stats.positiveRate >= 50) {
      return `${successPct}% chance of a positive outcome`;
    } else {
      return `${successPct}% chance of a positive outcome`;
    }
  }, [stats.positiveRate]);

  // Prepare histogram data
  const histogramData: HistogramBin[] = React.useMemo(() => {
    const bins = 30;
    const min = Math.min(...netOutcomes);
    const max = Math.max(...netOutcomes);
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
    const sorted = [...netOutcomes].sort((a, b) => a - b);
    return sorted.map((value, index) => ({
      value,
      probability: ((index + 1) / sorted.length) * 100,
      label: formatCurrency(value),
    }));
  }, [netOutcomes]);

  // Prepare scatter data
  const scatterData: ScatterDataPoint[] = React.useMemo(() => {
    return netOutcomes.map((outcome, i) => ({
      valuation: simulatedValuations[i],
      outcome,
    }));
  }, [netOutcomes, simulatedValuations]);

  // Box plot data
  const boxPlotData: BoxPlotDataPoint[] = React.useMemo(() => {
    return [
      { name: "Min", value: stats.min },
      { name: "P10", value: stats.p10 },
      { name: "P25", value: stats.p25 },
      { name: "Median", value: stats.median },
      { name: "P75", value: stats.p75 },
      { name: "P90", value: stats.p90 },
      { name: "Max", value: stats.max },
    ];
  }, [stats]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monte Carlo Results</CardTitle>
        <CardDescription>
          Analysis of {netOutcomes.length.toLocaleString()} simulation scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
              <span>Range</span>
            </div>
            <span className="text-xl font-semibold tabular-nums">
              {formatCurrency(stats.min)} to {formatCurrency(stats.max)}
            </span>
          </div>
        </div>

        {/* Histogram Section (always visible) */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Distribution of Outcomes
          </h3>
          <MonteCarloHistogram data={histogramData} />
        </div>

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
