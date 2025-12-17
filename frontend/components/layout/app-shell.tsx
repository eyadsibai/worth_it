"use client";

import * as React from "react";
import { Header } from "./header";
import { SkipLink } from "./skip-link";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-noise">
      <SkipLink />
      <Header />
      <div className="flex-1 flex overflow-hidden pt-14">
        <main
          id="main-content"
          className="flex-1 overflow-auto page-enter px-4 md:px-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
