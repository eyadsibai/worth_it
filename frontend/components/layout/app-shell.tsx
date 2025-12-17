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

  // Scroll to results section
  const handleResultsClick = React.useCallback(() => {
    setActiveSection("results");
    // Find the results section and scroll to it
    const resultsSection = document.querySelector('[data-section="results"]');
    if (resultsSection) {
      resultsSection.scrollIntoView({ behavior: "smooth" });
    } else {
      // Fallback: scroll down past the forms
      window.scrollTo({ top: window.innerHeight * 0.6, behavior: "smooth" });
    }
  }, []);

  // Save scenario - trigger command palette with save action
  const handleSaveClick = React.useCallback(() => {
    // Open command palette which has save functionality
    openCommandPalette(true);
  }, [openCommandPalette]);

  // More menu - open command palette for additional options
  const handleMoreClick = React.useCallback(() => {
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
        onSaveClick={handleSaveClick}
        onMoreClick={handleMoreClick}
      />
    </div>
  );
}
