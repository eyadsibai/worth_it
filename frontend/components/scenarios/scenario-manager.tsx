"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { getSavedScenarios, deleteScenario, clearAllScenarios, type ScenarioData } from "@/lib/export-utils";
import { formatCurrency } from "@/lib/format-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScenarioManagerProps {
  onLoadScenario?: (scenario: ScenarioData) => void;
  onCompareScenarios?: (scenarios: ScenarioData[]) => void;
}

export function ScenarioManager({ onLoadScenario, onCompareScenarios }: ScenarioManagerProps) {
  const [scenarios, setScenarios] = React.useState<ScenarioData[]>([]);
  const [selectedScenarios, setSelectedScenarios] = React.useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);

  // Load scenarios from localStorage on mount
  React.useEffect(() => {
    setScenarios(getSavedScenarios());
  }, []);

  const handleDeleteScenario = (timestamp: string) => {
    const scenarioName = scenarios.find((s) => s.timestamp === timestamp)?.name;
    try {
      deleteScenario(timestamp);
      setScenarios(getSavedScenarios());
      setSelectedScenarios((prev) => {
        const updated = new Set(prev);
        updated.delete(timestamp);
        return updated;
      });
      toast.success("Scenario deleted", {
        description: scenarioName ? `"${scenarioName}" has been removed.` : "The scenario has been removed.",
      });
    } catch {
      toast.error("Failed to delete scenario", { description: "Please try again." });
    }
  };

  const handleClearAll = () => {
    const count = scenarios.length;
    try {
      clearAllScenarios();
      setScenarios([]);
      setSelectedScenarios(new Set());
      setShowClearConfirm(false);
      toast.success("All scenarios cleared", {
        description: `${count} scenario${count !== 1 ? "s" : ""} removed.`,
      });
    } catch {
      toast.error("Failed to clear scenarios", { description: "Please try again." });
    }
  };

  const handleToggleSelect = (timestamp: string) => {
    setSelectedScenarios((prev) => {
      const updated = new Set(prev);
      if (updated.has(timestamp)) {
        updated.delete(timestamp);
      } else {
        updated.add(timestamp);
      }
      return updated;
    });
  };

  const handleCompare = () => {
    if (onCompareScenarios && selectedScenarios.size > 0) {
      const selected = scenarios.filter((s) => selectedScenarios.has(s.timestamp));
      onCompareScenarios(selected);
    }
  };

  if (scenarios.length === 0) {
    return (
      <Card className="terminal-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Saved Scenarios
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            No saved scenarios yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            Save a scenario from the results to compare different offers
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="terminal-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Saved Scenarios
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                {scenarios.length} scenario{scenarios.length !== 1 ? "s" : ""} saved
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedScenarios.size > 0 && (
                <Button
                  onClick={handleCompare}
                  variant="outline"
                  size="sm"
                  className="font-mono"
                >
                  Compare ({selectedScenarios.size})
                </Button>
              )}
              <Button
                onClick={() => setShowClearConfirm(true)}
                variant="destructive"
                size="sm"
                className="font-mono"
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {scenarios.map((scenario) => {
                const isPositive = scenario.results.netOutcome >= 0;
                const isSelected = selectedScenarios.has(scenario.timestamp);

                return (
                  <div
                    key={scenario.timestamp}
                    className={`rounded-lg border p-4 transition-all cursor-pointer ${
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/50 hover:bg-accent/5"
                    }`}
                    onClick={() => handleToggleSelect(scenario.timestamp)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{scenario.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                          <Calendar className="h-3 w-3" />
                          {new Date(scenario.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteScenario(scenario.timestamp);
                        }}
                        variant="ghost"
                        size="icon-sm"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-muted-foreground font-mono mb-0.5">Equity Type</div>
                        <Badge variant="outline" className="font-mono text-xs">
                          {scenario.equity.type === "RSU" ? "RSU" : "Options"}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-muted-foreground font-mono mb-0.5">Exit Year</div>
                        <div className="font-mono font-medium">Year {scenario.globalSettings.exitYear}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-muted-foreground font-mono mb-0.5">Net Outcome</div>
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4 text-terminal" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                          <span className={`font-mono font-semibold ${isPositive ? "text-terminal" : "text-destructive"}`}>
                            {formatCurrency(scenario.results.netOutcome)}
                          </span>
                          <Badge
                            variant={isPositive ? "default" : "destructive"}
                            className={isPositive ? "bg-terminal/15 text-terminal hover:bg-terminal/20 border border-terminal/30 font-mono text-xs" : "font-mono text-xs"}
                          >
                            {isPositive ? "WORTH IT" : "NOT WORTH IT"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {onLoadScenario && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoadScenario(scenario);
                        }}
                        variant="outline"
                        size="sm"
                        className="w-full mt-3 font-mono text-xs"
                      >
                        Load Scenario
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono">Clear All Scenarios?</DialogTitle>
            <DialogDescription className="font-mono">
              This will permanently delete all {scenarios.length} saved scenario{scenarios.length !== 1 ? "s" : ""}.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowClearConfirm(false)}
              variant="outline"
              className="font-mono"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearAll}
              variant="destructive"
              className="font-mono"
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
