/**
 * Shared types for Monte Carlo visualization components
 */

export interface MonteCarloStats {
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
  positiveRate: number;
}

export interface HistogramBin {
  bin: number;
  count: number;
  label: string;
}

export interface EcdfDataPoint {
  value: number;
  probability: number;
  label: string;
}

export interface ScatterDataPoint {
  valuation: number;
  outcome: number;
}

export interface BoxPlotDataPoint {
  name: string;
  value: number;
}
