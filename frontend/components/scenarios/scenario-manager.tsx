"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Calendar, TrendingUp, TrendingDown, Copy, Pencil, StickyNote, Search, Filter, ArrowUpDown } from "lucide-react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { toast } from "sonner";
import { getSavedScenarios, deleteScenario, clearAllScenarios, duplicateScenario, updateScenarioNotes, type ScenarioData } from "@/lib/export-utils";
import { formatCurrency } from "@/lib/format-utils";
import {
  searchScenarios,
  filterScenarios,
  sortScenarios,
  type FilterOption,
  type SortOption,
} from "@/lib/employee-scenario-utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ScenarioManagerProps {
  onLoadScenario?: (scenario: ScenarioData) => void;
  onCompareScenarios?: (scenarios: ScenarioData[]) => void;
}

export function ScenarioManager({ onLoadScenario, onCompareScenarios }: ScenarioManagerProps) {
  const [scenarios, setScenarios] = React.useState<ScenarioData[]>([]);
  const [selectedScenarios, setSelectedScenarios] = React.useState<Set<string>>(new Set());
  const [showClearConfirm, setShowClearConfirm] = React.useState(false);
  const [editingNotesTimestamp, setEditingNotesTimestamp] = React.useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = React.useState("");

  // Search, filter, and sort state
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterOption, setFilterOption] = React.useState<FilterOption>("all");
  const [sortOption, setSortOption] = React.useState<SortOption>("newest");

  // Load scenarios from localStorage on mount
  React.useEffect(() => {
    setScenarios(getSavedScenarios());
  }, []);

  // Apply search, filter, and sort
  const filteredScenarios = React.useMemo(() => {
    let result = searchScenarios(scenarios, searchQuery);
    result = filterScenarios(result, filterOption);
    result = sortScenarios(result, sortOption);
    return result;
  }, [scenarios, searchQuery, filterOption, sortOption]);

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

  const handleDuplicateScenario = (timestamp: string) => {
    const copy = duplicateScenario(timestamp);
    if (copy) {
      setScenarios(getSavedScenarios());
      toast.success("Scenario duplicated", {
        description: `Created "${copy.name}".`,
      });
    } else {
      toast.error("Failed to duplicate scenario", { description: "Please try again." });
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

  const handleOpenEditNotes = (timestamp: string) => {
    const scenario = scenarios.find((s) => s.timestamp === timestamp);
    setEditingNotesTimestamp(timestamp);
    setEditingNotesValue(scenario?.notes || "");
  };

  const handleSaveNotes = () => {
    if (!editingNotesTimestamp) return;

    const scenario = scenarios.find((s) => s.timestamp === editingNotesTimestamp);
    const trimmedNotes = editingNotesValue.trim() || undefined;

    try {
      const success = updateScenarioNotes(editingNotesTimestamp, trimmedNotes);
      if (success) {
        setScenarios(getSavedScenarios());
        toast.success("Notes updated", {
          description: scenario?.name ? `Notes for "${scenario.name}" have been updated.` : "Notes have been updated.",
        });
      } else {
        toast.error("Failed to update notes", { description: "Scenario not found." });
      }
    } catch {
      toast.error("Failed to update notes", { description: "Please try again." });
    }

    setEditingNotesTimestamp(null);
    setEditingNotesValue("");
  };

  const handleCloseEditNotes = () => {
    setEditingNotesTimestamp(null);
    setEditingNotesValue("");
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
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">
                Saved Scenarios
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground mt-1">
                {filteredScenarios.length === scenarios.length
                  ? `${scenarios.length} scenario${scenarios.length !== 1 ? "s" : ""} saved`
                  : `${filteredScenarios.length} of ${scenarios.length} scenario${scenarios.length !== 1 ? "s" : ""}`}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedScenarios.size > 0 && (
                <Button
                  onClick={handleCompare}
                  variant="outline"
                  size="sm"
                >
                  Compare ({selectedScenarios.size})
                </Button>
              )}
              <Button
                onClick={() => setShowClearConfirm(true)}
                variant="destructive"
                size="sm"
              >
                Clear All
              </Button>
            </div>
          </div>

          {/* Search, Filter, and Sort Controls */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search scenarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {/* Filter and Sort */}
            <div className="flex gap-2">
              <Select
                value={filterOption}
                onValueChange={(value) => setFilterOption(value as FilterOption)}
              >
                <SelectTrigger className="w-[130px] text-xs">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Types</SelectItem>
                  <SelectItem value="RSU" className="text-xs">RSU</SelectItem>
                  <SelectItem value="STOCK_OPTIONS" className="text-xs">Options</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={sortOption}
                onValueChange={(value) => setSortOption(value as SortOption)}
              >
                <SelectTrigger className="w-[140px] text-xs">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest" className="text-xs">Newest First</SelectItem>
                  <SelectItem value="oldest" className="text-xs">Oldest First</SelectItem>
                  <SelectItem value="name-asc" className="text-xs">Name A-Z</SelectItem>
                  <SelectItem value="name-desc" className="text-xs">Name Z-A</SelectItem>
                  <SelectItem value="outcome-best" className="text-xs">Best Outcome</SelectItem>
                  <SelectItem value="outcome-worst" className="text-xs">Worst Outcome</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {filteredScenarios.length === 0 && scenarios.length > 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No scenarios match your search or filter
                </div>
              ) : null}
              {filteredScenarios.map((scenario) => {
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                          <Calendar className="h-3 w-3" />
                          {new Date(scenario.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditNotes(scenario.timestamp);
                          }}
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Edit notes for ${scenario.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicateScenario(scenario.timestamp);
                          }}
                          variant="ghost"
                          size="icon-sm"
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={`Duplicate ${scenario.name}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <ConfirmationDialog
                          trigger={
                            <Button
                              onClick={(e) => e.stopPropagation()}
                              variant="ghost"
                              size="icon-sm"
                              className="text-destructive hover:text-destructive"
                              aria-label={`Delete ${scenario.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          }
                          title="Delete scenario?"
                          description={`This will permanently delete "${scenario.name}". This action cannot be undone.`}
                          confirmLabel="Delete"
                          variant="destructive"
                          onConfirm={() => handleDeleteScenario(scenario.timestamp)}
                        />
                      </div>
                    </div>

                    {/* Notes display */}
                    {scenario.notes && (
                      <div className="flex items-start gap-2 mb-3 p-2 rounded-md bg-muted/50">
                        <StickyNote className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                        <p className="text-xs text-muted-foreground italic line-clamp-2">
                          {scenario.notes}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Equity Type</div>
                        <Badge variant="outline" className="text-xs">
                          {scenario.equity.type === "RSU" ? "RSU" : "Options"}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Exit Year</div>
                        <div className="font-medium tabular-nums">Year {scenario.globalSettings.exitYear}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">Net Outcome</div>
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <TrendingUp className="h-4 w-4 text-terminal" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                          <span className={`tabular-nums font-semibold ${isPositive ? "text-terminal" : "text-destructive"}`}>
                            {formatCurrency(scenario.results.netOutcome)}
                          </span>
                          <Badge
                            variant={isPositive ? "default" : "destructive"}
                            className={isPositive ? "bg-terminal/15 text-terminal hover:bg-terminal/20 border border-terminal/30 text-xs" : "text-xs"}
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
                        className="w-full mt-3 text-xs"
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
            <DialogTitle>Clear All Scenarios?</DialogTitle>
            <DialogDescription>
              This will permanently delete all {scenarios.length} saved scenario{scenarios.length !== 1 ? "s" : ""}.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => setShowClearConfirm(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleClearAll}
              variant="destructive"
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Notes Dialog */}
      <Dialog open={editingNotesTimestamp !== null} onOpenChange={(open) => !open && handleCloseEditNotes()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Notes</DialogTitle>
            <DialogDescription>
              Add or update notes for this scenario.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-notes" className="text-sm">
                Notes
              </Label>
              <Textarea
                id="edit-notes"
                placeholder="Add any notes or comments about this scenario..."
                value={editingNotesValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditingNotesValue(e.target.value)}
                className="min-h-[100px] resize-none"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleCloseEditNotes}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveNotes}
            >
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
