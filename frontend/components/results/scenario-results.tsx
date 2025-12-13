"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Save, Copy, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { StartupScenarioResponse, GlobalSettingsForm, CurrentJobForm, RSUForm, StockOptionsForm } from "@/lib/schemas";
import { CumulativeComparisonChart } from "@/components/charts/cumulative-comparison-chart";
import { OpportunityCostChart } from "@/components/charts/opportunity-cost-chart";
import { formatCurrency } from "@/lib/format-utils";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import { AnimatedCurrencyDisplay } from "@/lib/motion";
import { saveScenario, getSavedScenarios, type ScenarioData } from "@/lib/export-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ScenarioResultsProps {
  results: StartupScenarioResponse;
  isLoading?: boolean;
  monteCarloContent?: React.ReactNode;
  globalSettings?: GlobalSettingsForm | null;
  currentJob?: CurrentJobForm | null;
  equityDetails?: RSUForm | StockOptionsForm | null;
}

export function ScenarioResults({ results, isLoading, monteCarloContent, globalSettings, currentJob, equityDetails }: ScenarioResultsProps) {
  const [showSaveDialog, setShowSaveDialog] = React.useState(false);
  const [scenarioName, setScenarioName] = React.useState("");
  const [scenarioNotes, setScenarioNotes] = React.useState("");

  if (isLoading) {
    return (
      <Card className="terminal-card">
        <CardContent className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-muted-foreground font-mono text-sm">Processing...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const netBenefit = results.final_payout_value - results.final_opportunity_cost;
  const isPositive = netBenefit >= 0;

  const handleSaveScenario = () => {
    if (!scenarioName.trim() || !globalSettings || !currentJob || !equityDetails) {
      return;
    }

    const scenarioData: ScenarioData = {
      name: scenarioName.trim(),
      timestamp: new Date().toISOString(),
      notes: scenarioNotes.trim() || undefined,
      globalSettings: {
        exitYear: globalSettings.exit_year,
      },
      currentJob: {
        monthlySalary: currentJob.monthly_salary,
        annualGrowthRate: currentJob.annual_salary_growth_rate,
        assumedROI: currentJob.assumed_annual_roi,
        investmentFrequency: currentJob.investment_frequency,
      },
      equity: equityDetails.equity_type === "RSU"
        ? {
            type: "RSU",
            monthlySalary: equityDetails.monthly_salary,
            vestingPeriod: equityDetails.vesting_period,
            cliffPeriod: equityDetails.cliff_period,
            equityPct: equityDetails.total_equity_grant_pct,
            exitValuation: equityDetails.exit_valuation,
            simulateDilution: equityDetails.simulate_dilution,
          }
        : {
            type: "STOCK_OPTIONS",
            monthlySalary: equityDetails.monthly_salary,
            vestingPeriod: equityDetails.vesting_period,
            cliffPeriod: equityDetails.cliff_period,
            numOptions: equityDetails.num_options,
            strikePrice: equityDetails.strike_price,
            exitPricePerShare: equityDetails.exit_price_per_share,
          },
      results: {
        finalPayoutValue: results.final_payout_value,
        finalOpportunityCost: results.final_opportunity_cost,
        netOutcome: netBenefit,
        breakeven: results.breakeven_label,
      },
    };

    try {
      saveScenario(scenarioData);
      toast.success("Scenario saved", {
        description: `"${scenarioName.trim()}" has been saved for comparison.`,
      });
      setShowSaveDialog(false);
      setScenarioName("");
      setScenarioNotes("");
    } catch (error) {
      console.error("Failed to save scenario:", error);
      toast.error("Failed to save scenario", {
        description: "Please try again.",
      });
    }
  };

  // Quick save with auto-generated name
  const handleQuickSave = () => {
    if (!globalSettings || !currentJob || !equityDetails) {
      return;
    }

    // Generate auto-name based on equity type and timestamp
    const equityLabel = equityDetails.equity_type === "RSU" ? "RSU" : "Options";
    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    let baseName = `${equityLabel} Scenario - ${dateStr}`;

    // Check for existing scenarios with similar names and increment
    const existingScenarios = getSavedScenarios();
    const similarNames = existingScenarios.filter((s) => s.name.startsWith(baseName));
    if (similarNames.length > 0) {
      baseName = `${baseName} (${similarNames.length + 1})`;
    }

    const scenarioData: ScenarioData = {
      name: baseName,
      timestamp: new Date().toISOString(),
      globalSettings: {
        exitYear: globalSettings.exit_year,
      },
      currentJob: {
        monthlySalary: currentJob.monthly_salary,
        annualGrowthRate: currentJob.annual_salary_growth_rate,
        assumedROI: currentJob.assumed_annual_roi,
        investmentFrequency: currentJob.investment_frequency,
      },
      equity: equityDetails.equity_type === "RSU"
        ? {
            type: "RSU",
            monthlySalary: equityDetails.monthly_salary,
            vestingPeriod: equityDetails.vesting_period,
            cliffPeriod: equityDetails.cliff_period,
            equityPct: equityDetails.total_equity_grant_pct,
            exitValuation: equityDetails.exit_valuation,
            simulateDilution: equityDetails.simulate_dilution,
          }
        : {
            type: "STOCK_OPTIONS",
            monthlySalary: equityDetails.monthly_salary,
            vestingPeriod: equityDetails.vesting_period,
            cliffPeriod: equityDetails.cliff_period,
            numOptions: equityDetails.num_options,
            strikePrice: equityDetails.strike_price,
            exitPricePerShare: equityDetails.exit_price_per_share,
          },
      results: {
        finalPayoutValue: results.final_payout_value,
        finalOpportunityCost: results.final_opportunity_cost,
        netOutcome: netBenefit,
        breakeven: results.breakeven_label,
      },
    };

    try {
      saveScenario(scenarioData);
      toast.success("Scenario saved", {
        description: `"${baseName}" has been saved for comparison.`,
      });
    } catch (error) {
      console.error("Failed to save scenario:", error);
      toast.error("Failed to save scenario", {
        description: "Please try again.",
      });
    }
  };

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        {/* Save Scenario Button with Dropdown */}
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="font-mono gap-2"
                disabled={!globalSettings || !currentJob || !equityDetails}
              >
                <Save className="h-4 w-4" />
                Save Scenario
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="font-mono">
              <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                <Save className="h-4 w-4 mr-2" />
                Save with name...
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleQuickSave}>
                <Copy className="h-4 w-4 mr-2" />
                Quick save
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {/* Final Payout */}
        <Card className="terminal-card overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="data-label text-xs">Final Payout</CardDescription>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <CardTitle className="text-lg lg:text-xl font-semibold tracking-tight text-foreground">
              <AnimatedCurrencyDisplay value={results.final_payout_value} />
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 truncate">{results.payout_label}</p>
          </CardContent>
        </Card>

        {/* Opportunity Cost */}
        <Card className="terminal-card overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="data-label text-xs">Opportunity Cost</CardDescription>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <CardTitle className="text-lg lg:text-xl font-semibold tracking-tight text-foreground">
              <AnimatedCurrencyDisplay value={results.final_opportunity_cost} />
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 truncate">Current job alternative</p>
          </CardContent>
        </Card>

        {/* Net Benefit */}
        <Card className="terminal-card overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="data-label text-xs">Net Benefit</CardDescription>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <div className="flex items-center gap-1.5">
              {isPositive ? (
                <TrendingUp className="h-4 w-4 flex-shrink-0 text-terminal" />
              ) : (
                <TrendingDown className="h-4 w-4 flex-shrink-0 text-destructive" />
              )}
              <CardTitle className={`text-lg lg:text-xl font-semibold tracking-tight ${isPositive ? "text-terminal" : "text-destructive"}`}>
                <AnimatedCurrencyDisplay value={netBenefit} />
              </CardTitle>
            </div>
            <div className="mt-2">
              <Badge
                variant={isPositive ? "default" : "destructive"}
                className={isPositive ? "bg-terminal/15 text-terminal hover:bg-terminal/20 border border-terminal/30 text-xs" : "text-xs"}
              >
                {isPositive ? "WORTH IT" : "NOT WORTH IT"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Dilution (if applicable) */}
        {results.total_dilution !== null && results.total_dilution !== undefined && (
          <Card className="terminal-card overflow-hidden">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardDescription className="data-label text-xs">Total Dilution</CardDescription>
            </CardHeader>
            <CardContent className="pb-4 px-4">
              <CardTitle className="text-lg lg:text-xl font-semibold tracking-tight tabular-nums text-foreground">
                {(results.total_dilution * 100).toFixed(2)}%
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Final: {((results.diluted_equity_pct || 0) * 100).toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        )}

        {/* Break-Even */}
        <Card className="terminal-card overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardDescription className="data-label text-xs">Break-Even</CardDescription>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <CardTitle className="text-lg lg:text-xl font-semibold tracking-tight text-foreground">
              {results.results_df.length > 0 && results.results_df[results.results_df.length - 1].breakeven_value !== undefined
                ? <CurrencyDisplay value={results.results_df[results.results_df.length - 1].breakeven_value} />
                : "N/A"}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {results.breakeven_label}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results Tabs */}
      <Card className="terminal-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold">
            Detailed Analysis
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Yearly breakdown and visualizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="table" className="w-full">
            <TabsList className="mb-4 bg-secondary/50 border border-border">
              <TabsTrigger value="table" className="text-sm font-mono data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
                table
              </TabsTrigger>
              <TabsTrigger value="charts" className="text-sm font-mono data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
                charts
              </TabsTrigger>
              {monteCarloContent && (
                <TabsTrigger value="monte-carlo" className="text-sm font-mono data-[state=active]:bg-accent/20 data-[state=active]:text-accent">
                  monte_carlo
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="table" className="space-y-4">
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="max-h-[500px] overflow-auto">
                  <table className="w-full font-mono text-sm">
                    <thead className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-medium text-muted-foreground">Year</th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium text-muted-foreground">
                          Startup
                        </th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium text-muted-foreground">
                          Current
                        </th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium text-muted-foreground">
                          Delta
                        </th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wider font-medium text-muted-foreground">
                          Cumulative
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {results.results_df.map((row, idx) => (
                        <tr
                          key={idx}
                          className="transition-colors hover:bg-secondary/30"
                        >
                          <td className="px-4 py-3 font-medium text-accent">{row.year || idx + 1}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(row.startup_monthly_salary || 0)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {formatCurrency(row.current_job_monthly_salary || 0)}
                          </td>
                          <td className={`px-4 py-3 text-right tabular-nums ${(row.monthly_surplus || 0) >= 0 ? "text-terminal" : "text-destructive"}`}>
                            {formatCurrency(row.monthly_surplus || 0)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            {formatCurrency(row.cumulative_opportunity_cost || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="charts" className="space-y-8">
              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <span className="text-accent font-mono text-sm">#</span>
                    Salary Comparison
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    Monthly salary over time
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <CumulativeComparisonChart data={results.results_df} />
                </div>
              </div>

              <div className="section-divider" />

              <div className="space-y-3">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2">
                    <span className="text-accent font-mono text-sm">#</span>
                    Opportunity Cost
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                    Cumulative cost analysis
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-5">
                  <OpportunityCostChart data={results.results_df} />
                </div>
              </div>
            </TabsContent>

            {monteCarloContent && (
              <TabsContent value="monte-carlo" className="space-y-6">
                {monteCarloContent}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
      </div>

      {/* Save Scenario Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Save Scenario</DialogTitle>
            <DialogDescription className="font-mono">
              Give this scenario a name to save it for later comparison.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scenario-name" className="font-mono text-sm">
                Scenario Name
              </Label>
              <Input
                id="scenario-name"
                placeholder="e.g., Company A - Series B"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && scenarioName.trim()) {
                    handleSaveScenario();
                  }
                }}
                className="font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scenario-notes" className="font-mono text-sm">
                Notes <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="scenario-notes"
                placeholder="Add any notes or comments about this scenario..."
                value={scenarioNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setScenarioNotes(e.target.value)}
                className="font-mono min-h-[80px] resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSaveDialog(false);
                setScenarioName("");
                setScenarioNotes("");
              }}
              variant="outline"
              className="font-mono"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveScenario}
              disabled={!scenarioName.trim()}
              className="font-mono"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
