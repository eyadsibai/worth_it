"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BarChart3, Table2, Layers, AlertCircle } from "lucide-react";
import { WaterfallChart } from "./waterfall-chart";
import { WaterfallTable } from "./waterfall-table";
import { PreferenceStackEditor } from "./preference-stack-editor";
import { ValuationSlider } from "./valuation-slider";
import { useCalculateWaterfall } from "@/lib/api-client";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { generateId } from "@/lib/utils";
import type { CapTable, PreferenceTier, PricedRound } from "@/lib/schemas";
import { formatLargeNumber } from "@/lib/format-utils";

interface WaterfallAnalysisProps {
  capTable: CapTable;
  pricedRounds?: PricedRound[];
}

// Generate exit valuations for chart
function generateExitValuations(min: number, max: number, count: number): number[] {
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}

export function WaterfallAnalysis({ capTable, pricedRounds = [] }: WaterfallAnalysisProps) {
  // Initialize preference tiers from priced rounds
  const [preferenceTiers, setPreferenceTiers] = React.useState<PreferenceTier[]>(() => {
    if (pricedRounds.length === 0) return [];

    // Auto-generate preference tiers from priced rounds (reverse order = most recent is senior)
    return pricedRounds
      .filter((r) => r.type === "PRICED_ROUND")
      .sort((a, b) => {
        // Sort by date if available, otherwise by round order
        if (a.date && b.date) {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return 0;
      })
      .map((round, index) => ({
        id: generateId(),
        name: round.round_name,
        seniority: index + 1,
        investment_amount: round.amount_raised,
        liquidation_multiplier: round.liquidation_multiplier,
        participating: round.participating,
        participation_cap: round.participation_cap ?? undefined,
        stakeholder_ids: [],
      }));
  });

  // Exit valuation state
  const [selectedValuation, setSelectedValuation] = React.useState(50_000_000);
  const [activeView, setActiveView] = React.useState<"chart" | "table">("chart");

  // Debounce valuation changes to avoid too many API calls
  const debouncedValuation = useDebounce(selectedValuation, 300);

  // Calculate waterfall using API
  const waterfallMutation = useCalculateWaterfall();

  // Generate exit valuations for chart (from $1M to $500M)
  const exitValuations = React.useMemo(
    () => generateExitValuations(1_000_000, 500_000_000, 20),
    []
  );

  // Trigger waterfall calculation when inputs change
  React.useEffect(() => {
    if (capTable.stakeholders.length === 0) return;

    waterfallMutation.mutate({
      cap_table: capTable,
      preference_tiers: preferenceTiers,
      exit_valuations: exitValuations,
    });
    // waterfallMutation.mutate is stable (TanStack Query guarantee)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capTable, preferenceTiers, exitValuations]);

  // Find the distribution for the selected valuation
  const selectedDistribution = React.useMemo(() => {
    if (!waterfallMutation.data) return null;

    // Find closest valuation
    const distributions = waterfallMutation.data.distributions_by_valuation;
    if (distributions.length === 0) return null;

    let closest = distributions[0];
    let closestDiff = Math.abs(closest.exit_valuation - debouncedValuation);

    for (const dist of distributions) {
      const diff = Math.abs(dist.exit_valuation - debouncedValuation);
      if (diff < closestDiff) {
        closest = dist;
        closestDiff = diff;
      }
    }

    return closest;
  }, [waterfallMutation.data, debouncedValuation]);

  // Get breakeven points from response
  const breakevenPoints = waterfallMutation.data?.breakeven_points ?? {};

  // Check if we have stakeholders
  const hasStakeholders = capTable.stakeholders.length > 0;

  return (
    <div className="space-y-6">
      {/* Preference Stack Editor */}
      <PreferenceStackEditor
        tiers={preferenceTiers}
        onTiersChange={setPreferenceTiers}
        stakeholders={capTable.stakeholders}
      />

      {/* Waterfall Analysis Results */}
      {hasStakeholders ? (
        <>
          {/* Valuation Slider */}
          <ValuationSlider
            value={selectedValuation}
            onChange={setSelectedValuation}
            breakevenPoints={breakevenPoints}
          />

          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Distribution Analysis</h3>
            <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
              <TabsList>
                <TabsTrigger value="chart" className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  Chart
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-1">
                  <Table2 className="h-4 w-4" />
                  Table
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Loading State */}
          {waterfallMutation.isPending && (
            <Card className="terminal-card">
              <CardContent className="py-12 text-center">
                <Loader2 className="text-accent mx-auto h-8 w-8 animate-spin" />
                <p className="text-muted-foreground mt-4">Calculating waterfall distribution...</p>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {waterfallMutation.isError && (
            <Card className="terminal-card border-destructive/30">
              <CardContent className="py-8 text-center">
                <AlertCircle className="text-destructive mx-auto h-8 w-8" />
                <p className="text-destructive mt-4">
                  {waterfallMutation.error?.message || "Calculation failed"}
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() =>
                    waterfallMutation.mutate({
                      cap_table: capTable,
                      preference_tiers: preferenceTiers,
                      exit_valuations: exitValuations,
                    })
                  }
                >
                  Retry
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {waterfallMutation.data && !waterfallMutation.isPending && (
            <>
              {activeView === "chart" && (
                <WaterfallChart
                  distributions={waterfallMutation.data.distributions_by_valuation}
                  selectedValuation={debouncedValuation}
                  onSelectValuation={setSelectedValuation}
                />
              )}

              {activeView === "table" && <WaterfallTable distribution={selectedDistribution} />}

              {/* Waterfall Steps */}
              {selectedDistribution && selectedDistribution.waterfall_steps.length > 0 && (
                <Card className="terminal-card">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Waterfall Steps
                    </CardTitle>
                    <CardDescription>
                      Step-by-step breakdown of proceeds distribution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedDistribution.waterfall_steps.map((step) => (
                        <div
                          key={step.step_number}
                          className="bg-muted/50 flex items-start gap-4 rounded-lg p-3"
                        >
                          <Badge variant="outline" className="shrink-0 tabular-nums">
                            {step.step_number}
                          </Badge>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{step.description}</p>
                            <p className="text-muted-foreground text-sm">
                              Recipients: {step.recipients.join(", ")}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-medium tabular-nums">
                              {formatLargeNumber(step.amount)}
                            </p>
                            <p className="text-muted-foreground text-xs tabular-nums">
                              Remaining: {formatLargeNumber(step.remaining_proceeds)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      ) : (
        /* Empty State */
        <Card className="terminal-card">
          <CardContent className="py-12 text-center">
            <BarChart3 className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground">
              Add stakeholders to your cap table to see waterfall analysis
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
