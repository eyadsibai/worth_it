"use client";

import { useState, useCallback } from "react";
import { Save, Trash2, Download, Upload, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  loadFounderScenarios,
  saveFounderScenario,
  deleteFounderScenario,
  createFounderScenario,
  exportFounderScenario,
  importFounderScenario,
} from "@/lib/scenario-utils";
import type { CapTable, FundingInstrument, PreferenceTier, FounderScenario } from "@/lib/schemas";

interface ScenarioManagerProps {
  currentCapTable: CapTable;
  currentInstruments: FundingInstrument[];
  currentPreferenceTiers: PreferenceTier[];
  onLoadScenario: (scenario: FounderScenario) => void;
}

export function ScenarioManager({
  currentCapTable,
  currentInstruments,
  currentPreferenceTiers,
  onLoadScenario,
}: ScenarioManagerProps) {
  // Initialize scenarios from localStorage on mount
  const [scenarios, setScenarios] = useState<FounderScenario[]>(() => loadFounderScenarios());
  const [isSaving, setIsSaving] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  const refreshScenarios = useCallback(() => {
    setScenarios(loadFounderScenarios());
  }, []);

  const handleSaveClick = () => {
    setIsSaving(true);
    setScenarioName("");
  };

  const handleSaveConfirm = () => {
    if (!scenarioName.trim()) return;

    const newScenario = createFounderScenario(
      scenarioName.trim(),
      currentCapTable,
      currentInstruments,
      currentPreferenceTiers,
      undefined
    );

    saveFounderScenario(newScenario);
    setIsSaving(false);
    setScenarioName("");
    refreshScenarios();
  };

  const handleSaveCancel = () => {
    setIsSaving(false);
    setScenarioName("");
  };

  const handleDelete = (id: string) => {
    deleteFounderScenario(id);
    refreshScenarios();
  };

  const handleExport = (scenario: FounderScenario) => {
    exportFounderScenario(scenario);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imported = await importFounderScenario(file);
      saveFounderScenario(imported);
      refreshScenarios();
    } catch (error) {
      console.error("Failed to import scenario:", error);
    }

    // Reset file input
    event.target.value = "";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Saved Scenarios</CardTitle>
        <CardDescription>
          Save, load, and compare different funding scenarios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Save Section */}
        <div className="flex gap-2">
          {isSaving ? (
            <>
              <Input
                placeholder="Scenario name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveConfirm();
                  if (e.key === "Escape") handleSaveCancel();
                }}
                className="flex-1"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleSaveConfirm}
                disabled={!scenarioName.trim()}
              >
                Save Scenario
              </Button>
              <Button size="sm" variant="outline" onClick={handleSaveCancel}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={handleSaveClick}>
                <Save className="mr-2 h-4 w-4" />
                Save Current
              </Button>
              <label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <Button size="sm" variant="outline" asChild>
                  <span>
                    <Upload className="mr-2 h-4 w-4" />
                    Import
                  </span>
                </Button>
              </label>
            </>
          )}
        </div>

        {/* Scenarios List */}
        {scenarios.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No saved scenarios yet. Save your current cap table to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{scenario.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Updated {new Date(scenario.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onLoadScenario(scenario)}
                    title="Load scenario"
                  >
                    <FolderOpen className="h-4 w-4" />
                    <span className="sr-only">Load</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleExport(scenario)}
                    title="Export as JSON"
                  >
                    <Download className="h-4 w-4" />
                    <span className="sr-only">Export JSON</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(scenario.id)}
                    title="Delete scenario"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
