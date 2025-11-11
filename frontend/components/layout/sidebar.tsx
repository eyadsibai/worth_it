"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  return (
    <aside className="w-full md:w-96 border-r bg-muted/10">
      <div className="h-full flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Enter your job offer details
          </p>
        </div>
        <ScrollArea className="flex-1 p-4">{children}</ScrollArea>
      </div>
    </aside>
  );
}
