"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppMode } from "@/lib/store";

interface SidebarProps {
  children: React.ReactNode;
}

const SIDEBAR_CONFIG = {
  employee: {
    title: "Offer Details",
    description: "Configure your job offer comparison",
  },
  founder: {
    title: "Cap Table",
    description: "Configure equity and funding details",
  },
} as const;

export function Sidebar({ children }: SidebarProps) {
  const appMode = useAppMode();
  const config = SIDEBAR_CONFIG[appMode];

  return (
    <aside className="w-full md:w-[420px] border-r border-border bg-sidebar">
      <div className="h-full flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            {config.title}
          </h2>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {config.description}
          </p>
        </div>
        <ScrollArea className="flex-1 px-5 py-4">{children}</ScrollArea>
      </div>
    </aside>
  );
}
