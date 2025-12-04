"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-full md:w-[420px] border-r border-border/50 bg-sidebar">
      <div className="h-full flex flex-col">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-base font-display">Configuration</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enter your job offer details below
          </p>
        </div>
        <ScrollArea className="flex-1 px-5 py-4">{children}</ScrollArea>
      </div>
    </aside>
  );
}
