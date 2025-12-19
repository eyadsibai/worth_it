/**
 * Dashboard Statistics Hook
 *
 * Aggregates data from both employee and founder scenarios
 * to provide summary statistics for the dashboard view.
 */

import { useState, useEffect, useCallback } from "react";
import { getSavedScenarios, type ScenarioData } from "@/lib/export-utils";
import { loadFounderScenarios, getScenarioMetrics } from "@/lib/scenario-utils";
import type { FounderScenario } from "@/lib/schemas";

interface EmployeeScenarioPreview {
  type: "employee";
  id: string;
  name: string;
  timestamp: string;
  isWorthIt: boolean;
  netBenefit: number;
}

interface FounderScenarioPreview {
  type: "founder";
  id: string;
  name: string;
  updatedAt: string;
  stakeholderCount: number;
  totalFunding: number;
}

type ScenarioPreview = EmployeeScenarioPreview | FounderScenarioPreview;

interface SummaryStats {
  totalScenarios: number;
  employeeScenarios: number;
  founderScenarios: number;
  worthItCount: number;
  notWorthItCount: number;
  averageNetBenefit: number;
  bestOpportunity: {
    name: string;
    netBenefit: number;
  } | null;
}

interface UseDashboardStatsReturn {
  stats: SummaryStats;
  recentScenarios: ScenarioPreview[];
  isLoading: boolean;
  refresh: () => void;
}

function mapEmployeeScenario(scenario: ScenarioData): EmployeeScenarioPreview {
  const netBenefit = scenario.results?.netOutcome || 0;
  return {
    type: "employee",
    id: scenario.timestamp, // Use timestamp as ID
    name: scenario.name || "Unnamed Scenario",
    timestamp: scenario.timestamp,
    isWorthIt: netBenefit > 0,
    netBenefit,
  };
}

function mapFounderScenario(scenario: FounderScenario): FounderScenarioPreview {
  const metrics = getScenarioMetrics(scenario);
  return {
    type: "founder",
    id: scenario.id,
    name: scenario.name,
    updatedAt: scenario.updatedAt,
    stakeholderCount: metrics.totalStakeholders,
    totalFunding: metrics.totalFundingRaised,
  };
}

export function useDashboardStats(): UseDashboardStatsReturn {
  const [stats, setStats] = useState<SummaryStats>({
    totalScenarios: 0,
    employeeScenarios: 0,
    founderScenarios: 0,
    worthItCount: 0,
    notWorthItCount: 0,
    averageNetBenefit: 0,
    bestOpportunity: null,
  });
  const [recentScenarios, setRecentScenarios] = useState<ScenarioPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(() => {
    setIsLoading(true);

    try {
      // Load employee scenarios
      const employeeScenarios = getSavedScenarios();
      const employeePreviews = employeeScenarios.map(mapEmployeeScenario);

      // Load founder scenarios
      const founderScenarios = loadFounderScenarios();
      const founderPreviews = founderScenarios.map(mapFounderScenario);

      // Calculate employee stats
      const worthItCount = employeePreviews.filter((s) => s.isWorthIt).length;
      const notWorthItCount = employeePreviews.length - worthItCount;

      const totalNetBenefit = employeePreviews.reduce(
        (sum, s) => sum + s.netBenefit,
        0
      );
      const averageNetBenefit =
        employeePreviews.length > 0
          ? totalNetBenefit / employeePreviews.length
          : 0;

      // Find best opportunity (highest net benefit among employee scenarios)
      // Only surface a "best opportunity" when it has a positive net benefit.
      const bestEmployeeScenario = employeePreviews.length > 0
        ? employeePreviews.reduce((best, current) =>
            current.netBenefit > best.netBenefit ? current : best
          )
        : null;

      const bestOpportunity =
        bestEmployeeScenario && bestEmployeeScenario.netBenefit > 0
          ? {
              name: bestEmployeeScenario.name,
              netBenefit: bestEmployeeScenario.netBenefit,
            }
          : null;

      // Combine and sort all scenarios by date (most recent first)
      const allPreviews: ScenarioPreview[] = [
        ...employeePreviews,
        ...founderPreviews,
      ].sort((a, b) => {
        const dateA = a.type === "employee" ? a.timestamp : a.updatedAt;
        const dateB = b.type === "employee" ? b.timestamp : b.updatedAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

      setStats({
        totalScenarios: employeePreviews.length + founderPreviews.length,
        employeeScenarios: employeePreviews.length,
        founderScenarios: founderPreviews.length,
        worthItCount,
        notWorthItCount,
        averageNetBenefit,
        bestOpportunity,
      });

      setRecentScenarios(allPreviews);
    } catch (error) {
      console.error("Failed to load dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Listen for storage changes (in case user modifies scenarios in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "worth_it_scenarios" ||
        e.key === "worth_it_founder_scenarios"
      ) {
        loadStats();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [loadStats]);

  return {
    stats,
    recentScenarios,
    isLoading,
    refresh: loadStats,
  };
}
