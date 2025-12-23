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
}
