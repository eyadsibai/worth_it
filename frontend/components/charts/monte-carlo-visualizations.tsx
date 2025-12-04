"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export function MonteCarloVisualizations({
  netOutcomes,
  simulatedValuations,
}: MonteCarloVisualizationsProps) {
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
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
