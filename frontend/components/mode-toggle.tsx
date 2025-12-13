"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, PieChart } from "lucide-react";
import type { AppMode } from "@/lib/store";

interface ModeToggleProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

const MODE_CONFIG = {
  employee: {
    icon: Scale,
    label: "Analyze Offer",
    description: "Compare a startup offer to your current job",
  },
  founder: {
    icon: PieChart,
    label: "Model Cap Table",
    description: "Simulate funding rounds and exit scenarios",
  },
} as const;

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="space-y-3">
      <Tabs value={mode} onValueChange={(v) => onModeChange(v as AppMode)}>
        <TabsList className="grid w-full grid-cols-2 max-w-lg h-auto p-1">
          {(["employee", "founder"] as const).map((modeKey) => {
            const config = MODE_CONFIG[modeKey];
            const Icon = config.icon;
            return (
              <TabsTrigger
                key={modeKey}
                value={modeKey}
                className="flex flex-col items-center gap-1 py-3 px-4 data-[state=active]:bg-accent/20"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{config.label}</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal hidden sm:block">
                  {config.description}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
      <p className="text-xs text-muted-foreground">
        <span className="font-medium">Not sure?</span>{" "}
        <span className="hidden sm:inline">
          Evaluating a new opportunity → Analyze Offer. Already have equity → Model Cap Table.
        </span>
        <span className="sm:hidden">
          New opportunity → Analyze. Have equity → Model.
        </span>
      </p>
    </div>
  );
}
