"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Users, Landmark, PieChart, BarChart3, Wand2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { UndoRedoControls } from "@/components/ui/undo-redo-controls";
import { StakeholderForm } from "./stakeholder-form";
import { OwnershipChart } from "./ownership-chart";
import { ExitCalculator } from "./exit-calculator";
import { FundingRoundsManager } from "./funding-rounds-manager";
import { WaterfallAnalysis } from "./waterfall-analysis";
import { ExportMenu } from "./export-menu";
import { ScenarioManager } from "./scenario-manager";
import {
  HistoryTriggerButton,
  VersionHistoryPanel,
  useVersionHistory,
  type CapTableSnapshot,
} from "./history";
import { FounderTimeline } from "./timeline";
import {
  motion,
  MotionFadeInUp,
  MotionList,
  MotionListItem,
  AnimatedPercentage,
} from "@/lib/motion";
import { generateId } from "@/lib/utils";
import { useConvertInstruments } from "@/lib/api-client";
import { useCapTableHistory } from "@/lib/hooks";
import { CapTableWizard } from "./wizard";
import type {
  Stakeholder,
  StakeholderFormData,
  CapTable,
  FundingInstrument,
  PricedRound,
  SAFE,
  ConvertibleNote,
  PreferenceTier,
  FounderScenario,
} from "@/lib/schemas";

interface CapTableManagerProps {
  capTable: CapTable;
  onCapTableChange: (capTable: CapTable) => void;
  instruments: FundingInstrument[];
  onInstrumentsChange: (instruments: FundingInstrument[]) => void;
  preferenceTiers: PreferenceTier[];
  onPreferenceTiersChange: (tiers: PreferenceTier[]) => void;
  /**
   * When true, hides the stakeholder form and option pool cards from the
   * Cap Table tab (they're shown in the sidebar instead for FounderDashboard layout).
   * When false (default), displays these cards inline within the Cap Table tab
   * for standalone usage.
   * @default false
   */
  hideSidebarContent?: boolean;
}

const WIZARD_SKIPPED_KEY = "cap-table-wizard-skipped";

export function CapTableManager({
  capTable,
  onCapTableChange,
  instruments,
  onInstrumentsChange,
  preferenceTiers,
  onPreferenceTiersChange,
  hideSidebarContent = false,
}: CapTableManagerProps) {
  const [activeSection, setActiveSection] = React.useState<"cap-table" | "funding" | "waterfall">(
    "cap-table"
  );
  const [wizardSkipped, setWizardSkipped] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(WIZARD_SKIPPED_KEY) === "true";
  });
  const [showWizard, setShowWizard] = React.useState(false);
  const convertInstruments = useConvertInstruments();

  // Version history for persistent snapshots
  const { addVersion, loadVersionsFromStorage } = useVersionHistory();

  // Load saved versions on mount.
  // NOTE: `loadVersionsFromStorage` is a stable action from the Zustand store,
  // so including it in the dependency array is safe and satisfies exhaustive-deps.
  React.useEffect(() => {
    loadVersionsFromStorage();
  }, [loadVersionsFromStorage]);

  // Memoize the current snapshot to avoid recreating on every render.
  // This is passed to VersionHistoryPanel for diff computation.
  const currentSnapshot = React.useMemo(
    (): CapTableSnapshot => ({
      stakeholders: capTable.stakeholders,
      fundingInstruments: instruments,
      optionPoolPct: capTable.option_pool_pct,
      totalShares: capTable.total_shares,
    }),
    [capTable.stakeholders, instruments, capTable.option_pool_pct, capTable.total_shares]
  );

  // Show wizard if cap table is empty and wizard hasn't been skipped
  const shouldShowWizard = showWizard || (capTable.stakeholders.length === 0 && !wizardSkipped);

  const handleWizardComplete = (newCapTable: CapTable, newInstruments: FundingInstrument[]) => {
    onCapTableChange(newCapTable);
    onInstrumentsChange(newInstruments);
    setShowWizard(false);
    localStorage.setItem(WIZARD_SKIPPED_KEY, "true");
    setWizardSkipped(true);
  };

  const handleWizardSkip = () => {
    localStorage.setItem(WIZARD_SKIPPED_KEY, "true");
    setWizardSkipped(true);
    setShowWizard(false);
  };

  const handleRunWizard = () => {
    setShowWizard(true);
  };

  // Wrap state changes with undo/redo history tracking
  const {
    setCapTable,
    setInstruments,
    // setPreferenceTiers - available but not currently used
    setAll,
    undo,
    redo,
    canUndo,
    canRedo,
    undoLabel,
    redoLabel,
  } = useCapTableHistory({
    capTable,
    instruments,
    preferenceTiers,
    onCapTableChange,
    onInstrumentsChange,
    onPreferenceTiersChange,
  });

  // Handle restoring from version history
  const handleRestoreVersion = React.useCallback(
    (snapshot: CapTableSnapshot) => {
      setAll(
        {
          capTable: {
            ...capTable,
            stakeholders: snapshot.stakeholders,
            option_pool_pct: snapshot.optionPoolPct,
            total_shares: snapshot.totalShares,
          },
          instruments: snapshot.fundingInstruments,
          preferenceTiers,
        },
        "Restore from history"
      );
    },
    [capTable, preferenceTiers, setAll]
  );

  // Handle automatic conversion when a priced round is added
  const handlePricedRoundAdded = React.useCallback(
    (round: PricedRound) => {
      // Filter for outstanding SAFEs and Convertible Notes
      const outstandingSAFEs = instruments.filter(
        (i): i is SAFE => i.type === "SAFE" && i.status === "outstanding"
      );
      const outstandingNotes = instruments.filter(
        (i): i is ConvertibleNote => i.type === "CONVERTIBLE_NOTE" && i.status === "outstanding"
      );

      const convertibleInstruments = [...outstandingSAFEs, ...outstandingNotes];

      // No instruments to convert
      if (convertibleInstruments.length === 0) {
        return;
      }

      // Call conversion API
      convertInstruments.mutate(
        {
          cap_table: capTable,
          instruments: convertibleInstruments,
          priced_round: round,
        },
        {
          onSuccess: (result) => {
            // Update cap table with new stakeholders from conversion
            setCapTable(result.updated_cap_table, `Convert instruments for ${round.round_name}`);

            // Mark converted instruments as "converted"
            const convertedIds = new Set(
              result.converted_instruments.map((ci) => ci.instrument_id)
            );
            const updatedInstruments = instruments.map((inst) => {
              if (convertedIds.has(inst.id)) {
                return { ...inst, status: "converted" as const };
              }
              return inst;
            });
            setInstruments(updatedInstruments, "Mark instruments as converted");

            // Conversion complete - toast notification could be added here
            // Instruments converted: result.summary.instruments_converted
            // Shares issued: result.summary.total_shares_issued
          },
          onError: (error) => {
            console.error(
              "Conversion failed:",
              error instanceof Error ? error.message : "Unknown error"
            );
          },
        }
      );
    },
    [capTable, instruments, convertInstruments, setCapTable, setInstruments]
  );

  const handleAddStakeholder = (formData: StakeholderFormData) => {
    const newStakeholder: Stakeholder = {
      id: generateId(),
      name: formData.name,
      type: formData.type,
      shares: 0,
      ownership_pct: formData.ownership_pct,
      share_class: formData.share_class,
      vesting: formData.has_vesting
        ? {
            total_shares: 0,
            vesting_months: formData.vesting_months,
            cliff_months: formData.cliff_months,
            vested_shares: 0,
          }
        : undefined,
    };

    // Save version before change
    addVersion(currentSnapshot, "stakeholder_added", formData.name);

    setCapTable(
      {
        ...capTable,
        stakeholders: [...capTable.stakeholders, newStakeholder],
      },
      `Add ${formData.name}`
    );
  };

  const handleRemoveStakeholder = (id: string) => {
    const stakeholder = capTable.stakeholders.find((s) => s.id === id);

    // Save version before change
    addVersion(currentSnapshot, "stakeholder_removed", stakeholder?.name);

    setCapTable(
      {
        ...capTable,
        stakeholders: capTable.stakeholders.filter((s) => s.id !== id),
      },
      `Remove ${stakeholder?.name || "stakeholder"}`
    );
  };

  const handleOptionPoolChange = (value: number[]) => {
    setCapTable(
      {
        ...capTable,
        option_pool_pct: value[0],
      },
      `Set option pool to ${value[0]}%`
    );
  };

  const handleAddInstrument = (instrument: FundingInstrument) => {
    const instrumentName = getInstrumentDisplayName(instrument);

    // Save version before change
    addVersion(currentSnapshot, "funding_added", instrumentName);

    setInstruments([...instruments, instrument], `Add ${instrumentName}`);
  };

  // Helper to get display name for funding instruments
  const getInstrumentDisplayName = (instrument: FundingInstrument): string => {
    switch (instrument.type) {
      case "SAFE":
        return `SAFE from ${instrument.investor_name}`;
      case "CONVERTIBLE_NOTE":
        return `Note from ${instrument.investor_name}`;
      case "PRICED_ROUND":
        return instrument.round_name;
      default:
        return "instrument";
    }
  };

  const handleRemoveInstrument = (id: string) => {
    const instrument = instruments.find((i) => i.id === id);
    const instrumentName = instrument && "name" in instrument ? instrument.name : "instrument";
    setInstruments(
      instruments.filter((i) => i.id !== id),
      `Remove ${instrumentName}`
    );
  };

  const handleLoadScenario = (scenario: FounderScenario) => {
    setAll(
      {
        capTable: scenario.capTable,
        instruments: scenario.instruments,
        preferenceTiers: scenario.preferenceTiers,
      },
      `Load ${scenario.name}`
    );
  };

  const totalOwnership =
    capTable.stakeholders.reduce((sum, s) => sum + s.ownership_pct, 0) + capTable.option_pool_pct;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "founder":
        return "bg-chart-1/20 text-chart-1 border-chart-1/30";
      case "employee":
        return "bg-chart-2/20 text-chart-2 border-chart-2/30";
      case "investor":
        return "bg-chart-3/20 text-chart-3 border-chart-3/30";
      case "advisor":
        return "bg-chart-4/20 text-chart-4 border-chart-4/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Show wizard if conditions are met
  if (shouldShowWizard) {
    return <CapTableWizard onComplete={handleWizardComplete} onSkip={handleWizardSkip} />;
  }

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <Tabs
        value={activeSection}
        onValueChange={(v) => setActiveSection(v as typeof activeSection)}
      >
        <div className="mb-4 flex items-center justify-between gap-4">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="cap-table" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Cap Table
            </TabsTrigger>
            <TabsTrigger value="funding" className="flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Funding
            </TabsTrigger>
            <TabsTrigger value="waterfall" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Waterfall
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunWizard}
              className="hidden sm:flex"
            >
              <Wand2 className="mr-2 h-4 w-4" />
              Wizard
            </Button>
            <UndoRedoControls
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={undo}
              onRedo={redo}
              undoLabel={undoLabel}
              redoLabel={redoLabel}
            />
            <HistoryTriggerButton />
            <ExportMenu capTable={capTable} instruments={instruments} />
          </div>
        </div>

        <TabsContent value="cap-table" className="mt-6 space-y-6">
          {/* Stakeholder Form and Option Pool - hidden when shown in sidebar */}
          {!hideSidebarContent && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Add Stakeholder Form */}
              <Card className="terminal-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Add Stakeholder
                  </CardTitle>
                  <CardDescription>
                    Add founders, employees, investors, or advisors to your cap table
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <StakeholderForm onSubmit={handleAddStakeholder} />
                </CardContent>
              </Card>

              {/* Option Pool */}
              <Card className="terminal-card">
                <CardHeader>
                  <CardTitle>Option Pool</CardTitle>
                  <CardDescription>Reserve equity for future employee grants</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Reserved for Options</Label>
                      <span className="text-sm tabular-nums">{capTable.option_pool_pct}%</span>
                    </div>
                    <Slider
                      value={[capTable.option_pool_pct]}
                      onValueChange={handleOptionPoolChange}
                      min={0}
                      max={30}
                      step={1}
                    />
                    <p className="text-muted-foreground text-xs">
                      Typical range: 10-20% for early-stage startups
                    </p>
                  </div>

                  {/* Allocation Summary */}
                  <motion.div
                    className="bg-muted/50 space-y-2 rounded-lg p-4"
                    whileHover={{ scale: 1.01 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex justify-between text-sm">
                      <span>Stakeholders</span>
                      <span className="tabular-nums">
                        <AnimatedPercentage
                          value={capTable.stakeholders.reduce((sum, s) => sum + s.ownership_pct, 0)}
                          decimals={1}
                        />
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Option Pool</span>
                      <span className="tabular-nums">
                        <AnimatedPercentage value={capTable.option_pool_pct} decimals={0} />
                      </span>
                    </div>
                    <div className="border-border flex justify-between border-t pt-2 font-medium">
                      <span>Total Allocated</span>
                      <span
                        className={`tabular-nums ${
                          totalOwnership > 100 ? "text-destructive" : "text-terminal"
                        }`}
                      >
                        <AnimatedPercentage value={totalOwnership} decimals={1} />
                      </span>
                    </div>
                    {totalOwnership > 100 && (
                      <motion.p
                        className="text-destructive text-xs"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        Warning: Total exceeds 100%
                      </motion.p>
                    )}
                  </motion.div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Stakeholders List */}
          {capTable.stakeholders.length > 0 && (
            <MotionFadeInUp>
              <Card className="terminal-card">
                <CardHeader>
                  <CardTitle>Stakeholders ({capTable.stakeholders.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <MotionList className="space-y-2">
                    {capTable.stakeholders.map((stakeholder) => (
                      <MotionListItem key={stakeholder.id}>
                        <motion.div
                          className="bg-card hover:bg-accent/50 flex items-center justify-between rounded-lg border p-3"
                          whileHover={{ x: 4, borderColor: "hsl(var(--terminal) / 0.5)" }}
                          transition={{ duration: 0.15 }}
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-medium">{stakeholder.name}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <Badge variant="outline" className={getTypeColor(stakeholder.type)}>
                                  {stakeholder.type}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {stakeholder.share_class}
                                </Badge>
                                {stakeholder.vesting && (
                                  <Badge variant="secondary" className="text-xs">
                                    {stakeholder.vesting.vesting_months / 12}yr vesting
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-lg font-semibold tabular-nums">
                              <AnimatedPercentage value={stakeholder.ownership_pct} />
                            </span>
                            <ConfirmationDialog
                              trigger={
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  aria-label={`Delete ${stakeholder.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              }
                              title="Delete stakeholder?"
                              description={`This will remove ${stakeholder.name} from your cap table. This action cannot be undone.`}
                              confirmLabel="Delete"
                              variant="destructive"
                              onConfirm={() => handleRemoveStakeholder(stakeholder.id)}
                            />
                          </div>
                        </motion.div>
                      </MotionListItem>
                    ))}
                  </MotionList>
                </CardContent>
              </Card>
            </MotionFadeInUp>
          )}

          {/* Visualizations */}
          <div className="grid gap-6 lg:grid-cols-2">
            <OwnershipChart
              stakeholders={capTable.stakeholders}
              optionPoolPct={capTable.option_pool_pct}
            />
            <ExitCalculator
              stakeholders={capTable.stakeholders}
              optionPoolPct={capTable.option_pool_pct}
            />
          </div>

          {/* Equity Timeline */}
          <FounderTimeline />

          {/* Scenario Management */}
          <ScenarioManager
            currentCapTable={capTable}
            currentInstruments={instruments}
            currentPreferenceTiers={preferenceTiers}
            onLoadScenario={handleLoadScenario}
          />
        </TabsContent>

        <TabsContent value="funding" className="mt-6">
          <FundingRoundsManager
            instruments={instruments}
            onAddInstrument={handleAddInstrument}
            onRemoveInstrument={handleRemoveInstrument}
            totalShares={capTable.total_shares}
            onPricedRoundAdded={handlePricedRoundAdded}
            stakeholders={capTable.stakeholders}
            optionPoolPct={capTable.option_pool_pct}
          />
        </TabsContent>

        <TabsContent value="waterfall" className="mt-6">
          <WaterfallAnalysis
            capTable={capTable}
            pricedRounds={instruments.filter((i): i is PricedRound => i.type === "PRICED_ROUND")}
          />
        </TabsContent>
      </Tabs>

      {/* Version History Panel */}
      <VersionHistoryPanel currentSnapshot={currentSnapshot} onRestore={handleRestoreVersion} />
    </div>
  );
}
