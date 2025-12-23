"use client";

import * as React from "react";
import { Header } from "./header";
import { SkipLink } from "./skip-link";
import { BottomNav } from "./bottom-nav";
import { useCommandPalette } from "@/components/command-palette";
import { MobileViewProvider } from "@/lib/hooks";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Main application shell providing consistent layout structure.
 *
 * Includes:
 * - Skip link for accessibility
 * - Header with navigation
 * - Main content area
 * - Mobile bottom navigation (hidden on desktop)
 *
 * The MobileViewProvider enables tabbed navigation on mobile devices,
 * allowing users to switch between Inputs and Results views.
 */
export function AppShell({ children }: AppShellProps) {
  const { setOpen: openCommandPalette } = useCommandPalette();

  // Open command palette - used by Save and More buttons
  const handleCommandPalette = React.useCallback(() => {
    openCommandPalette(true);
  }, [openCommandPalette]);

  return (
    <MobileViewProvider>
      <div className="bg-noise flex min-h-screen flex-col">
        <SkipLink />
        <Header />
        <div className="flex flex-1 overflow-hidden pt-14">
          <main
            id="main-content"
            className="page-enter flex-1 overflow-auto px-4 pb-20 md:px-6 md:pb-0"
          >
            {children}
          </main>
        </div>
        <BottomNav onSaveClick={handleCommandPalette} onMoreClick={handleCommandPalette} />
      </div>
    </MobileViewProvider>
  );
}
