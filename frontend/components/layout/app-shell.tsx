"use client";

import * as React from "react";
import { Header } from "./header";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-noise">
      <Header />
      <div className="flex-1 flex overflow-hidden pt-14">
        <main className="flex-1 overflow-auto page-enter px-4 md:px-6">{children}</main>
      </div>
    </div>
  );
}
