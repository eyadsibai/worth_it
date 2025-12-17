"use client";

import * as React from "react";
import { Rocket, TrendingUp, Building2, Briefcase, Users, UserCircle, Coins, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { EXAMPLE_SCENARIOS, type ExampleStage } from "@/lib/constants/examples";
import { FOUNDER_TEMPLATES } from "@/lib/constants/founder-templates";
import { toast } from "sonner";
import type { AppMode } from "@/lib/store";

interface TemplatePickerProps {
  mode: AppMode;
}

/**
 * Icon mapping for employee template stages
 */
const STAGE_ICONS: Record<ExampleStage, React.ComponentType<{ className?: string }>> = {
  early: Rocket,
  growth: TrendingUp,
  late: Building2,
  "big-tech": Briefcase,
};

/**
 * Icon mapping for founder templates
 */
const FOUNDER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "two-founders": Users,
  "solo-founder": UserCircle,
  "post-seed": Coins,
  "series-a-ready": LineChart,
};

/**
 * TemplatePicker displays a grid of template cards for quick scenario setup.
 * Shows Employee templates (early/growth/late/big-tech) or Founder templates
 * based on the current mode.
 */
export function TemplatePicker({ mode }: TemplatePickerProps) {
  const loadExample = useAppStore((state) => state.loadExample);
  const loadFounderTemplate = useAppStore((state) => state.loadFounderTemplate);

  const handleEmployeeTemplate = (templateId: string, name: string) => {
    const success = loadExample(templateId);
    if (success) {
      toast.success("Template loaded", {
        description: `${name} values applied to all forms.`,
      });
    } else {
      toast.error("Failed to load template", {
        description: `Template "${name}" could not be found.`,
      });
    }
  };

  const handleFounderTemplate = (templateId: string, name: string) => {
    const success = loadFounderTemplate(templateId);
    if (success) {
      toast.success("Template loaded", {
        description: `${name} cap table loaded.`,
      });
    } else {
      toast.error("Failed to load template", {
        description: `Template "${name}" could not be found.`,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-medium text-foreground">Start from a template</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === "employee"
            ? "Choose a scenario that matches your situation"
            : "Pick a cap table structure to get started"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mode === "employee" ? (
          // Employee templates
          EXAMPLE_SCENARIOS.map((scenario) => {
            const Icon = STAGE_ICONS[scenario.stage];
            return (
              <Button
                key={scenario.id}
                variant="outline"
                className="h-auto flex-col items-start gap-2 p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => handleEmployeeTemplate(scenario.id, scenario.name)}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{scenario.name}</span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {scenario.description}
                </span>
              </Button>
            );
          })
        ) : (
          // Founder templates
          FOUNDER_TEMPLATES.map((template) => {
            const Icon = FOUNDER_ICONS[template.id] || Users;
            return (
              <Button
                key={template.id}
                variant="outline"
                className="h-auto flex-col items-start gap-2 p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => handleFounderTemplate(template.id, template.name)}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium text-sm">{template.name}</span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {template.description}
                </span>
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
}
