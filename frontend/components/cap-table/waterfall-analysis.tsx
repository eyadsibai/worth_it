"use client";

/** Fallback exit valuation ($50M) when the scenario has none */
const DEFAULT_EXIT_VALUATION = 50_000_000;
/** Number of exit valuation data points for chart */
const EXIT_VALUATION_COUNT = 20;
/** Low end of the anchored sweep (20% of the scenario exit valuation) */
const CHART_RANGE_LOW_MULTIPLIER = 0.2;
/** High end of the anchored sweep (200% of the scenario exit valuation) */
const CHART_RANGE_HIGH_MULTIPLIER = 2;
/**
 * The sweep always spans at least $1M-$500M. Anchoring on the scenario's exit
 * is what makes the chart relevant; it must never make a valuation the user
 * could previously model unreachable.
 */
const MIN_REACHABLE_VALUATION = 1_000_000;
const MAX_REACHABLE_VALUATION = 500_000_000;

import * as React from "react";
import { FORMATTING } from "@/lib/constants";
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
import type { CapTable, PreferenceTier, PricedRound, Stakeholder } from "@/lib/schemas";
import { formatLargeNumber } from "@/lib/format-utils";

interface WaterfallAnalysisProps {
  capTable: CapTable;
  pricedRounds?: PricedRound[];
  /** Scenario exit assumption; anchors the valuation range the chart sweeps */
  exitValuation?: number;
  /**
   * Tiers the caller already knows about - from a template or a saved scenario.
   * They take precedence over tiers inferred from priced rounds, which can only
   * guess at holders by name.
   */
  preferenceTiers?: PreferenceTier[];
}

/**
 * Sample the valuation range for the chart.
 *
 * Spacing is geometric because valuation is a multiplicative quantity: equal
 * ratios give a $5M acquihire the same resolution as a $500M exit, which a
 * linear sweep across three orders of magnitude cannot. The sample nearest the
 * anchor is snapped onto it so the scenario's own exit is priced exactly.
 */
function generateExitValuations(min: number, max: number, count: number, anchor: number): number[] {
  const ratio = (max / min) ** (1 / (count - 1));
  const valuations = Array.from({ length: count }, (_, i) => Math.round(min * ratio ** i));

  let nearest = 0;
  for (let i = 1; i < valuations.length; i++) {
    if (Math.abs(valuations[i] - anchor) < Math.abs(valuations[nearest] - anchor)) {
      nearest = i;
    }
  }
  valuations[nearest] = anchor;

  return valuations;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function roundTimestamp(round: PricedRound): number {
  return round.date ? new Date(round.date).getTime() : NaN;
}

interface OrderedRound {
  round: PricedRound;
  index: number;
}

// Most recent round is the most senior; declaration order breaks ties and covers missing dates
function compareSeniority(a: OrderedRound, b: OrderedRound): number {
  const aTime = roundTimestamp(a.round);
  const bTime = roundTimestamp(b.round);
  if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
    return bTime - aTime;
  }
  return b.index - a.index;
}

function matchStakeholderIds(round: PricedRound, available: Stakeholder[]): string[] {
  if (round.lead_investor) {
    const lead = normalizeName(round.lead_investor);
    const byLeadInvestor = available.filter((s) => normalizeName(s.name) === lead);
    if (byLeadInvestor.length > 0) {
      return byLeadInvestor.map((s) => s.id);
    }
  }

  const roundName = normalizeName(round.round_name);
  return available
    .filter((s) => s.share_class === "preferred" && normalizeName(s.name).includes(roundName))
    .map((s) => s.id);
}

function buildTiersFromRounds(
  pricedRounds: PricedRound[],
  stakeholders: Stakeholder[]
): PreferenceTier[] {
  const unclaimed = [...stakeholders];

  return pricedRounds
    .filter((r) => r.type === "PRICED_ROUND")
    .map((round, index) => ({ round, index }))
    .sort(compareSeniority)
    .map(({ round }, index) => {
      const stakeholderIds = matchStakeholderIds(round, unclaimed);
      for (const id of stakeholderIds) {
        const claimedAt = unclaimed.findIndex((s) => s.id === id);
        if (claimedAt >= 0) unclaimed.splice(claimedAt, 1);
      }

      return {
        id: generateId(),
        name: round.round_name,
        seniority: index + 1,
        investment_amount: round.amount_raised,
        liquidation_multiplier: round.liquidation_multiplier,
        participating: round.participating,
        participation_cap: round.participation_cap ?? undefined,
        stakeholder_ids: stakeholderIds,
      };
    });
}

export function WaterfallAnalysis({
  capTable,
  pricedRounds = [],
  exitValuation = DEFAULT_EXIT_VALUATION,
  preferenceTiers: providedTiers,
}: WaterfallAnalysisProps) {
  const anchorValuation = exitValuation > 0 ? exitValuation : DEFAULT_EXIT_VALUATION;

  // Tiers the caller supplied win; otherwise infer them from the priced rounds.
  const [preferenceTiers, setPreferenceTiers] = React.useState<PreferenceTier[]>(() =>
    providedTiers?.length
      ? providedTiers
      : buildTiersFromRounds(pricedRounds, capTable.stakeholders)
  );

  // Adopt caller-supplied tiers when they change - loading a template or switching
  // scenarios replaces the stack wholesale.
  const lastProvidedTiers = React.useRef(providedTiers);
  React.useEffect(() => {
    if (providedTiers?.length && providedTiers !== lastProvidedTiers.current) {
      setPreferenceTiers(providedTiers);
    }
    lastProvidedTiers.current = providedTiers;
  }, [providedTiers]);

  // Exit valuation state
  const [selectedValuation, setSelectedValuation] = React.useState(anchorValuation);
  const [activeView, setActiveView] = React.useState<"chart" | "table">("chart");

  // Debounce valuation changes to avoid too many API calls
  const debouncedValuation = useDebounce(selectedValuation, FORMATTING.DEBOUNCE_MS);

  // Calculate waterfall using API
  const waterfallMutation = useCalculateWaterfall();

  // Sweep the chart around the scenario's own exit assumption, without ever
  // narrowing the range below what the user could always reach.
  const chartMinValuation = Math.min(
    MIN_REACHABLE_VALUATION,
    anchorValuation * CHART_RANGE_LOW_MULTIPLIER
  );
  const chartMaxValuation = Math.max(
    MAX_REACHABLE_VALUATION,
    anchorValuation * CHART_RANGE_HIGH_MULTIPLIER
  );
  const exitValuations = React.useMemo(
    () =>
      generateExitValuations(
        chartMinValuation,
        chartMaxValuation,
        EXIT_VALUATION_COUNT,
        anchorValuation
      ),
    [chartMinValuation, chartMaxValuation, anchorValuation]
  );

  // A tier whose holders are unknown claims a preference for nobody: the engine
  // has no one to pay, so the preference silently disappears. Keep those tiers
  // in the editor where the user can assign holders, but never send them.
  const assignedTiers = React.useMemo(
    () => preferenceTiers.filter((t) => t.stakeholder_ids.length > 0),
    [preferenceTiers]
  );
  const unassignedTiers = React.useMemo(
    () => preferenceTiers.filter((t) => t.stakeholder_ids.length === 0),
    [preferenceTiers]
  );

  // Trigger waterfall calculation when inputs change
  React.useEffect(() => {
    if (capTable.stakeholders.length === 0) return;

    waterfallMutation.mutate({
      cap_table: capTable,
      preference_tiers: assignedTiers,
      exit_valuations: exitValuations,
    });
    // waterfallMutation.mutate is stable (TanStack Query guarantee)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capTable, assignedTiers, exitValuations]);

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

      {/* Tiers we could not attach to a holder. Excluded from the calculation —
          say so, because what the user cannot see they cannot correct. */}
      {unassignedTiers.length > 0 && (
        <Card role="status" className="terminal-card border-amber-500/20 bg-amber-500/10">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {unassignedTiers.length === 1
                  ? "1 preference tier has no holders"
                  : `${unassignedTiers.length} preference tiers have no holders`}
              </p>
              <p className="text-muted-foreground text-sm">
                {unassignedTiers.map((t) => t.name).join(", ")} — left out of the waterfall until
                you assign holders. Use <span className="font-medium">Holders</span> on the tier
                above to pick who owns it.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Waterfall Analysis Results */}
      {hasStakeholders ? (
        <>
          {/* Valuation Slider */}
          <ValuationSlider
            value={selectedValuation}
            onChange={setSelectedValuation}
            min={chartMinValuation}
            max={chartMaxValuation}
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
                      preference_tiers: assignedTiers,
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
