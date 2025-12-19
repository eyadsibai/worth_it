import { jobAnalysisTour } from "./job-analysis";
import { monteCarloTour } from "./monte-carlo";
import { capTableTour } from "./cap-table";
import { waterfallTour } from "./waterfall";
import type { Tour } from "../types";

export const tours: Record<string, Tour> = {
  "job-analysis": jobAnalysisTour,
  "monte-carlo": monteCarloTour,
  "cap-table": capTableTour,
  waterfall: waterfallTour,
};

export const tourList: Tour[] = Object.values(tours);

export { jobAnalysisTour, monteCarloTour, capTableTour, waterfallTour };
