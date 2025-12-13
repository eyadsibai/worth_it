/**
 * Utility functions for filtering, sorting, and searching employee scenarios
 */

import type { ScenarioData } from "@/lib/export-utils";

/**
 * Available filter options for equity type
 */
export type FilterOption = "all" | "RSU" | "STOCK_OPTIONS";

/**
 * Available sort options for scenarios
 */
export type SortOption =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "outcome-best"
  | "outcome-worst";

/**
 * Search scenarios by name (case-insensitive)
 * Returns all scenarios if query is empty or whitespace
 */
export function searchScenarios(
  scenarios: ScenarioData[],
  query: string
): ScenarioData[] {
  const trimmedQuery = query.trim().toLowerCase();

  if (!trimmedQuery) {
    return scenarios;
  }

  return scenarios.filter((scenario) =>
    scenario.name.toLowerCase().includes(trimmedQuery)
  );
}

/**
 * Filter scenarios by equity type
 * Returns all scenarios if filter is "all"
 */
export function filterScenarios(
  scenarios: ScenarioData[],
  filter: FilterOption
): ScenarioData[] {
  if (filter === "all") {
    return scenarios;
  }

  return scenarios.filter((scenario) => scenario.equity.type === filter);
}

/**
 * Sort scenarios by the specified option
 * Does not mutate the original array
 */
export function sortScenarios(
  scenarios: ScenarioData[],
  sort: SortOption
): ScenarioData[] {
  const sorted = [...scenarios];

  switch (sort) {
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    case "oldest":
      return sorted.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

    case "name-asc":
      return sorted.sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );

    case "name-desc":
      return sorted.sort((a, b) =>
        b.name.toLowerCase().localeCompare(a.name.toLowerCase())
      );

    case "outcome-best":
      return sorted.sort(
        (a, b) => b.results.netOutcome - a.results.netOutcome
      );

    case "outcome-worst":
      return sorted.sort(
        (a, b) => a.results.netOutcome - b.results.netOutcome
      );

    default:
      return sorted;
  }
}
