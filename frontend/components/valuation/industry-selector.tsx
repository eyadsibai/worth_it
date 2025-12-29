"use client";

import { useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info, Loader2 } from "lucide-react";
import { useListIndustries, useIndustryBenchmark } from "@/lib/api-client";
import type { BenchmarkMetric } from "@/lib/schemas";

interface IndustrySelectorProps {
  /** Currently selected industry code */
  value: string | null;
  /** Callback when industry selection changes */
  onChange: (industryCode: string) => void;
  /** Callback when benchmark data is loaded for the selected industry */
  onBenchmarksLoaded?: (metrics: Record<string, BenchmarkMetric>) => void;
  /** Whether to show benchmark details card below the selector */
  showBenchmarkDetails?: boolean;
}

/**
 * Format a metric name for display (e.g., "revenue_multiple" -> "Revenue Multiple")
 */
function formatMetricName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format a metric range for display based on unit type
 */
function formatMetricRange(metric: BenchmarkMetric): string {
  const { typical_low, typical_high, unit } = metric;

  // Percentage format (unit is empty and values are <= 1)
  if (unit === "" && typical_high <= 1) {
    return `${Math.round(typical_low * 100)}% - ${Math.round(typical_high * 100)}%`;
  }

  // Multiplier format
  if (unit === "x") {
    return `${typical_low}x - ${typical_high}x`;
  }

  // Currency or other units
  if (unit) {
    return `${typical_low}${unit} - ${typical_high}${unit}`;
  }

  // Default numeric format
  return `${typical_low} - ${typical_high}`;
}

export function IndustrySelector({
  value,
  onChange,
  onBenchmarksLoaded,
  showBenchmarkDetails = true,
}: IndustrySelectorProps) {
  // Fetch list of industries
  const { data: industries, isLoading: industriesLoading } = useListIndustries();

  // Fetch benchmark data for selected industry
  const { data: benchmark, isLoading: benchmarkLoading } = useIndustryBenchmark(value);

  // Notify parent when benchmarks are loaded
  const notifyBenchmarksLoaded = useCallback(() => {
    if (benchmark && onBenchmarksLoaded) {
      onBenchmarksLoaded(benchmark.metrics);
    }
  }, [benchmark, onBenchmarksLoaded]);

  useEffect(() => {
    notifyBenchmarksLoaded();
  }, [notifyBenchmarksLoaded]);

  // Find the selected industry name for display
  const selectedIndustryName = industries?.find((i) => i.code === value)?.name;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Industry</label>
        <Select value={value || ""} onValueChange={onChange} disabled={industriesLoading}>
          <SelectTrigger>
            <SelectValue placeholder="Select your industry">{selectedIndustryName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {industries?.map((industry) => (
              <SelectItem key={industry.code} value={industry.code}>
                {industry.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Benchmark loading indicator */}
      {showBenchmarkDetails && value && benchmarkLoading && (
        <div
          data-testid="benchmark-loading"
          className="text-muted-foreground flex items-center gap-2 text-sm"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading benchmarks...
        </div>
      )}

      {/* Benchmark details card */}
      {showBenchmarkDetails && benchmark && !benchmarkLoading && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4" />
              {benchmark.name} Benchmarks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              {Object.entries(benchmark.metrics).map(([key, metric]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{formatMetricName(key)}</span>
                  <span className="font-medium tabular-nums">{formatMetricRange(metric)}</span>
                </div>
              ))}
            </div>
            {benchmark.description && (
              <p className="text-muted-foreground mt-3 text-xs">{benchmark.description}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
