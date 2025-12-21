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
      <div className="min-h-screen flex flex-col bg-noise">
        <SkipLink />
        <Header />
        <div className="flex-1 flex overflow-hidden pt-14">
          <main
            id="main-content"
            className="flex-1 overflow-auto page-enter px-4 md:px-6 pb-20 md:pb-0"
          >
            {children}
          </main>
        </div>
        <BottomNav
          onSaveClick={handleCommandPalette}
          onMoreClick={handleCommandPalette}
        />
      </div>
    </MobileViewProvider>
  );
}
