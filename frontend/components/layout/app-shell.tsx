"use client";

import * as React from "react";
import { Header } from "./header";
import { Sidebar } from "./sidebar";
import { SidebarProvider, useSidebar } from "./sidebar-context";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/lib/hooks";

interface AppShellProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

function AppShellContent({ sidebar, children }: AppShellProps) {
  const isMobile = useIsMobile();
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <div className="min-h-screen flex flex-col bg-noise">
      <Header />
      <div className="flex-1 flex overflow-hidden pt-14">
        {/* Desktop sidebar - always visible */}
        {sidebar && !isMobile && <Sidebar>{sidebar}</Sidebar>}

        {/* Mobile sidebar - shown as Sheet/Drawer */}
        {sidebar && isMobile && (
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent side="left" className="w-[85vw] max-w-[420px] p-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <Sidebar>{sidebar}</Sidebar>
            </SheetContent>
          </Sheet>
        )}

        <main className="flex-1 overflow-auto page-enter">{children}</main>
      </div>
    </div>
  );
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <SidebarProvider>
      <AppShellContent sidebar={sidebar}>{children}</AppShellContent>
    </SidebarProvider>
  );
}
