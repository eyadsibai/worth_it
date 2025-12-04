/**
 * Monte Carlo visualization components
 *
 * This module exports smaller, focused components for visualizing
 * Monte Carlo simulation results, split from the original monolithic component.
 */

export { MonteCarloHistogram } from "./monte-carlo-histogram";
export { MonteCarloEcdf } from "./monte-carlo-ecdf";
export { MonteCarloBoxPlot } from "./monte-carlo-box-plot";
export { MonteCarloScatter } from "./monte-carlo-scatter";
export { MonteCarloStatistics } from "./monte-carlo-statistics";
export { MonteCarloPdf } from "./monte-carlo-pdf";
export { MonteCarloSummary } from "./monte-carlo-summary";
export { formatCurrency, tooltipStyle } from "./utils";
export type {
  MonteCarloStats,
  HistogramBin,
  EcdfDataPoint,
  ScatterDataPoint,
  BoxPlotDataPoint,
} from "./types";
