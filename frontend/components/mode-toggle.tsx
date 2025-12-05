"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Building2 } from "lucide-react";

export type AppMode = "employee" | "founder";

interface ModeToggleProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <Tabs value={mode} onValueChange={(v) => onModeChange(v as AppMode)}>
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="employee" className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          <span>I&apos;m an Employee</span>
        </TabsTrigger>
        <TabsTrigger value="founder" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span>I&apos;m a Founder</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
