"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { SummaryCard, RecentScenarios, QuickActions } from "@/components/dashboard";
import { useDashboardStats } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { loadFounderScenarioById } from "@/lib/scenario-utils";
import { getSavedScenarios } from "@/lib/export-utils";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { RSUForm, StockOptionsForm } from "@/lib/schemas";

export default function DashboardPage() {
  const router = useRouter();
  const { stats, recentScenarios, isLoading, refresh } = useDashboardStats();

  const {
    setAppMode,
    setGlobalSettings,
    setCurrentJob,
    setEquityDetails,
    setCapTable,
    setInstruments,
    setPreferenceTiers,
  } = useAppStore();

  // Handle navigation to new analysis
  const handleNewEmployeeAnalysis = React.useCallback(() => {
    setAppMode("employee");
    router.push("/");
  }, [setAppMode, router]);

  const handleNewFounderAnalysis = React.useCallback(() => {
    setAppMode("founder");
    router.push("/");
  }, [setAppMode, router]);

  // Handle loading an example
  const handleLoadExample = React.useCallback(() => {
    setAppMode("employee");
    router.push("/?example=true");
  }, [setAppMode, router]);

  // Handle loading a specific scenario
  const handleLoadScenario = React.useCallback(
    (id: string, type: "employee" | "founder") => {
      if (type === "founder") {
        // Load founder scenario
        const scenario = loadFounderScenarioById(id);
        if (scenario) {
          setAppMode("founder");
          setCapTable(scenario.capTable);
          setInstruments(scenario.instruments);
          setPreferenceTiers(scenario.preferenceTiers);
          toast.success(`Loaded "${scenario.name}"`);
          router.push("/");
        } else {
          toast.error("Scenario not found");
        }
      } else {
        // Load employee scenario by finding it in saved scenarios
        const scenarios = getSavedScenarios();
        const scenario = scenarios.find((s) => s.timestamp === id);
        if (scenario) {
          setAppMode("employee");
          if (scenario.globalSettings) {
            setGlobalSettings({
              exit_year: scenario.globalSettings.exitYear,
            });
          }
          if (scenario.currentJob) {
            setCurrentJob({
              monthly_salary: scenario.currentJob.monthlySalary,
              annual_salary_growth_rate: scenario.currentJob.annualGrowthRate,
              assumed_annual_roi: scenario.currentJob.assumedROI,
              investment_frequency: scenario.currentJob.investmentFrequency as "Monthly" | "Annually",
            });
          }
          // Note: equity form data would need full conversion from ScenarioData format
          // For now, just navigate to the page - the user can re-enter details
          toast.success(`Loaded "${scenario.name || "scenario"}"`);
          router.push("/");
        } else {
          toast.error("Scenario not found");
        }
      }
    },
    [
      setAppMode,
      setCapTable,
      setInstruments,
      setPreferenceTiers,
      setGlobalSettings,
      setCurrentJob,
      setEquityDetails,
      router,
    ]
  );

  // Handle view all scenarios
  const handleViewAll = React.useCallback(() => {
    // Navigate to scenarios tab on main page
    router.push("/?tab=scenarios");
  }, [router]);

  // Handle compare all
  const handleCompareAll = React.useCallback(() => {
    router.push("/?tab=comparison");
  }, [router]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <AppShell>
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        {/* Welcome Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-terminal" />
            {getGreeting()}!
          </h1>
          <p className="text-muted-foreground">
            {stats.totalScenarios > 0
              ? `You have ${stats.totalScenarios} saved scenario${stats.totalScenarios !== 1 ? "s" : ""}. Here's an overview of your analysis.`
              : "Welcome to Worth It! Start by creating your first analysis."}
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-terminal" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Summary & Recent */}
            <div className="lg:col-span-2 space-y-6">
              <SummaryCard stats={stats} />
              <RecentScenarios
                scenarios={recentScenarios}
                onLoadScenario={handleLoadScenario}
                onViewAll={stats.totalScenarios > 5 ? handleViewAll : undefined}
                maxItems={5}
              />
            </div>

            {/* Right Column - Quick Actions */}
            <div className="space-y-6">
              <QuickActions
                onNewEmployeeAnalysis={handleNewEmployeeAnalysis}
                onNewFounderAnalysis={handleNewFounderAnalysis}
                onLoadExample={handleLoadExample}
                onCompareAll={stats.employeeScenarios >= 2 ? handleCompareAll : undefined}
                hasScenarios={stats.totalScenarios > 0}
              />

              {/* Tips Card */}
              <div className="p-4 rounded-lg border bg-terminal/5 border-terminal/20">
                <p className="text-sm font-medium text-terminal mb-2">
                  Pro Tips
                </p>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Save scenarios to track multiple opportunities</li>
                  <li>• Use Monte Carlo for uncertainty analysis</li>
                  <li>• Compare scenarios side-by-side</li>
                  <li>• Export your analysis as PDF or CSV</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
