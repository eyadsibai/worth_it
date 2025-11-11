"use client";

import * as React from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";

interface AppShellProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {sidebar && <Sidebar>{sidebar}</Sidebar>}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
