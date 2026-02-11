/** Percentile indices for statistical calculations */
const PERCENTILES = {
  P10: 0.1,
  P25: 0.25,
  P75: 0.75,
  P90: 0.9,
} as const;
/** Midpoint divisor for median and variance calculations */
const MIDPOINT_DIVISOR = 2;
/** Percentage conversion multiplier */
const PCT_MULTIPLIER = 100;

import { useMemo } from "react";

export interface MonteCarloStats {
  mean: number;
  median: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  min: number;
  max: number;
  std: number;
  positiveRate: number;
}

export function useMonteCarloStats(netOutcomes: number[]): MonteCarloStats {
  return useMemo(() => {
    const sorted = [...netOutcomes].sort((a, b) => a - b);
    const mean = netOutcomes.reduce((a, b) => a + b, 0) / netOutcomes.length;
    const median = sorted[Math.floor(sorted.length / MIDPOINT_DIVISOR)];
    const p10 = sorted[Math.floor(sorted.length * PERCENTILES.P10)];
    const p25 = sorted[Math.floor(sorted.length * PERCENTILES.P25)];
    const p75 = sorted[Math.floor(sorted.length * PERCENTILES.P75)];
    const p90 = sorted[Math.floor(sorted.length * PERCENTILES.P90)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const std = Math.sqrt(
      netOutcomes.reduce((sum, val) => sum + Math.pow(val - mean, MIDPOINT_DIVISOR), 0) / netOutcomes.length
    );
    const positiveCount = netOutcomes.filter((x) => x > 0).length;
    const positiveRate = (positiveCount / netOutcomes.length) * PCT_MULTIPLIER;

    return { mean, median, std, min, max, p10, p25, p75, p90, positiveRate };
  }, [netOutcomes]);
}
