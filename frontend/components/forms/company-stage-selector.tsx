"use client";

import * as React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";
import type { CompanyStage, DilutionRoundForm } from "@/lib/schemas";
import { DEFAULT_DILUTION_ROUNDS } from "@/lib/constants/funding-rounds";

interface CompanyStageSelectorProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
  onChange?: (stage: CompanyStage) => void;
}

/**
 * Stage definitions with their completed rounds.
 * When a stage is selected, all prior rounds are marked as "completed"
 * and future rounds are marked as "upcoming".
 */
const STAGE_DEFINITIONS: Record<
  CompanyStage,
  {
    label: string;
    description: string;
    completedRounds: string[];
    typicalDilution: string;
  }
> = {
  "pre-seed": {
    label: "Pre-Seed",
    description: "Just starting, no funding yet",
    completedRounds: [],
    typicalDilution: "0%",
  },
  seed: {
    label: "Post-Seed",
    description: "Seed round completed",
    completedRounds: ["Pre-Seed", "Seed"],
    typicalDilution: "~25%",
  },
  "series-a": {
    label: "Post-Series A",
    description: "Series A completed",
    completedRounds: ["Pre-Seed", "Seed", "Series A"],
    typicalDilution: "~40%",
  },
  "series-b": {
    label: "Post-Series B",
    description: "Series B completed",
    completedRounds: ["Pre-Seed", "Seed", "Series A", "Series B"],
    typicalDilution: "~52%",
  },
  "series-c": {
    label: "Post-Series C",
    description: "Series C completed",
    completedRounds: ["Pre-Seed", "Seed", "Series A", "Series B", "Series C"],
    typicalDilution: "~60%",
  },
  "series-d": {
    label: "Post-Series D",
    description: "Series D completed",
    completedRounds: ["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D"],
    typicalDilution: "~65%",
  },
  "pre-ipo": {
    label: "Pre-IPO",
    description: "Late stage, preparing for IPO",
    completedRounds: ["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Series D"],
    typicalDilution: "~70%",
  },
};

/**
 * Generates dilution rounds based on the selected company stage.
 * Completed rounds get negative years (indicating they happened in the past).
 * Upcoming rounds get positive years (future projections).
 */
function generateRoundsForStage(stage: CompanyStage): DilutionRoundForm[] {
  const stageConfig = STAGE_DEFINITIONS[stage];
  const completedRoundNames = new Set(stageConfig.completedRounds);

  // Start with default rounds as template
  const rounds: DilutionRoundForm[] = [];

  // Add completed rounds with negative years
  let completedYear = -completedRoundNames.size;
  for (const defaultRound of DEFAULT_DILUTION_ROUNDS) {
    if (completedRoundNames.has(defaultRound.round_name)) {
      rounds.push({
        ...defaultRound,
        year: completedYear,
        enabled: true,
        status: "completed",
      });
      completedYear++;
    }
  }

  // Add upcoming rounds with positive years
  let upcomingYear = 1;
  for (const defaultRound of DEFAULT_DILUTION_ROUNDS) {
    if (!completedRoundNames.has(defaultRound.round_name)) {
      rounds.push({
        ...defaultRound,
        year: upcomingYear,
        enabled: false, // User can enable the ones they want to model
        status: "upcoming",
      });
      upcomingYear++;
    }
  }

  return rounds;
}

export function CompanyStageSelector({ form, onChange }: CompanyStageSelectorProps) {
  const currentStage = form.watch("company_stage") as CompanyStage | undefined;

  const handleStageChange = (value: string) => {
    const stage = value as CompanyStage;
    form.setValue("company_stage", stage);

    // Generate and set the appropriate rounds for this stage
    const rounds = generateRoundsForStage(stage);
    form.setValue("dilution_rounds", rounds);

    onChange?.(stage);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Building2 className="text-muted-foreground h-4 w-4" />
        <Label className="text-sm font-medium">Company Stage</Label>
      </div>

      <Select value={currentStage ?? ""} onValueChange={handleStageChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select current funding stage..." />
        </SelectTrigger>
        <SelectContent>
          {(
            Object.entries(STAGE_DEFINITIONS) as [
              CompanyStage,
              (typeof STAGE_DEFINITIONS)[CompanyStage],
            ][]
          ).map(([stage, config]) => (
            <SelectItem key={stage} value={stage}>
              <div className="flex w-full items-center justify-between gap-4">
                <div>
                  <span className="font-medium">{config.label}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{config.description}</span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {currentStage && (
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            {STAGE_DEFINITIONS[currentStage].completedRounds.length} completed round
            {STAGE_DEFINITIONS[currentStage].completedRounds.length !== 1 ? "s" : ""}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Typical dilution: {STAGE_DEFINITIONS[currentStage].typicalDilution}
          </Badge>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        Selecting a stage will configure funding rounds automatically. Completed rounds represent
        historical dilution; upcoming rounds are what you&apos;ll model.
      </p>
    </div>
  );
}

export { generateRoundsForStage, STAGE_DEFINITIONS };
