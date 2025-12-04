"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-full md:w-[420px] border-r border-border bg-sidebar">
      <div className="h-full flex flex-col">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span className="text-accent">&gt;</span>
            Configuration
          </h2>
          <p className="text-xs text-muted-foreground/70 mt-1 font-mono">
            Enter job offer parameters
          </p>
        </div>
        <ScrollArea className="flex-1 px-5 py-4">{children}</ScrollArea>
      </div>
    </aside>
  );
}
