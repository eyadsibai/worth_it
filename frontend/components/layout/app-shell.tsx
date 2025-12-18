"use client";

import * as React from "react";
import { Header } from "./header";
import { SkipLink } from "./skip-link";
import { BottomNav, type BottomNavSection } from "./bottom-nav";
import { useCommandPalette } from "@/components/command-palette";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { setOpen: openCommandPalette } = useCommandPalette();
  const [activeSection, setActiveSection] = React.useState<BottomNavSection | undefined>(undefined);

  // Scroll to forms section (top of page on mobile)
  const handleFormsClick = React.useCallback(() => {
    setActiveSection("forms");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Scroll to results section (scrolls down past the forms area)
  const handleResultsClick = React.useCallback(() => {
    setActiveSection("results");
    window.scrollTo({ top: window.innerHeight * 0.6, behavior: "smooth" });
  }, []);

  // Open command palette - shared by Save and More buttons
  // These are separate callbacks intentionally for future differentiation
  // (e.g., Save could pre-select "save scenario", More could show all commands)
  const handleCommandPalette = React.useCallback(() => {
    openCommandPalette(true);
  }, [openCommandPalette]);

  return (
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
        activeSection={activeSection}
        onFormsClick={handleFormsClick}
        onResultsClick={handleResultsClick}
        onSaveClick={handleCommandPalette}
        onMoreClick={handleCommandPalette}
      />
    </div>
  );
}
