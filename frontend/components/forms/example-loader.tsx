"use client";

import * as React from "react";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppStore } from "@/lib/store";
import { EXAMPLE_SCENARIOS } from "@/lib/constants/examples";
import { toast } from "sonner";

/**
 * Dropdown button that loads pre-configured example scenarios
 * for quick exploration. Shows stage-based presets (early/growth/late).
 */
export function ExampleLoader() {
  const loadExample = useAppStore((state) => state.loadExample);

  const handleLoadExample = (exampleId: string, name: string) => {
    const success = loadExample(exampleId);
    if (success) {
      toast.success("Example loaded", {
        description: `${name} values applied to all forms.`,
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <ClipboardList className="h-4 w-4" />
          Load Example
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {EXAMPLE_SCENARIOS.map((scenario) => (
          <DropdownMenuItem
            key={scenario.id}
            onClick={() => handleLoadExample(scenario.id, scenario.name)}
            className="flex cursor-pointer flex-col items-start gap-0.5 py-2"
          >
            <span className="font-medium">{scenario.name}</span>
            <span className="text-muted-foreground text-xs">{scenario.description}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
