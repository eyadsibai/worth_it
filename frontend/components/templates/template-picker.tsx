"use client";

import * as React from "react";
import {
  Rocket,
  TrendingUp,
  Building2,
  Briefcase,
  Users,
  UserCircle,
  Coins,
  LineChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { motion } from "@/lib/motion";
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
        <h3 className="text-foreground text-lg font-medium">Start from a template</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          {mode === "employee"
            ? "Choose a scenario that matches your situation"
            : "Pick a cap table structure to get started"}
        </p>
      </div>

      <motion.div
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08 },
          },
        }}
      >
        {mode === "employee"
          ? // Employee templates
            EXAMPLE_SCENARIOS.map((scenario) => {
              const Icon = STAGE_ICONS[scenario.stage];
              return (
                <motion.div
                  key={scenario.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Button
                    variant="outline"
                    className="hover:border-primary hover:bg-primary/5 h-auto w-full flex-col items-start gap-2 overflow-hidden p-4 text-left whitespace-normal transition-colors"
                    onClick={() => handleEmployeeTemplate(scenario.id, scenario.name)}
                  >
                    <div className="flex w-full items-center gap-2">
                      <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                        <Icon className="text-primary h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{scenario.name}</span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground line-clamp-2 text-xs">
                          {scenario.description}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px]">
                        {scenario.description}
                      </TooltipContent>
                    </Tooltip>
                  </Button>
                </motion.div>
              );
            })
          : // Founder templates
            FOUNDER_TEMPLATES.map((template) => {
              const Icon = FOUNDER_ICONS[template.id] || Users;
              return (
                <motion.div
                  key={template.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: { opacity: 1, y: 0 },
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Button
                    variant="outline"
                    className="hover:border-primary hover:bg-primary/5 h-auto w-full flex-col items-start gap-2 overflow-hidden p-4 text-left whitespace-normal transition-colors"
                    onClick={() => handleFounderTemplate(template.id, template.name)}
                  >
                    <div className="flex w-full items-center gap-2">
                      <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                        <Icon className="text-primary h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">{template.name}</span>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-muted-foreground line-clamp-2 text-xs">
                          {template.description}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px]">
                        {template.description}
                      </TooltipContent>
                    </Tooltip>
                  </Button>
                </motion.div>
              );
            })}
      </motion.div>
    </div>
  );
}
