"use client";

import Link from "next/link";
import { TrendingUp, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useCommandPalette } from "@/components/command-palette";
import { TourLauncher } from "@/components/walkthrough";

export function Header() {
  const { setOpen } = useCommandPalette();

  return (
    <header className="border-border/50 bg-background/95 no-print fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="bg-primary/10 border-primary/20 group-hover:bg-primary/15 group-hover:border-primary/30 flex h-8 w-8 items-center justify-center rounded-lg border transition-all">
              <TrendingUp className="text-primary h-4 w-4" />
            </div>
            <span className="text-foreground text-base font-semibold tracking-tight">Worth It</span>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <nav className="mr-2 hidden items-center md:flex">
            <Link
              href="/"
              className="hover:bg-secondary text-foreground rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              Analysis
            </Link>
            <Link
              href="/valuation"
              className="hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              Valuation
            </Link>
            <Link
              href="/about"
              className="hover:bg-secondary text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            >
              About
            </Link>
          </nav>

          <div className="bg-border mx-2 hidden h-4 w-px md:block" />

          <Button
            variant="outline"
            size="sm"
            className="text-muted-foreground hover:text-foreground hidden items-center gap-2 md:flex"
            onClick={() => setOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">Search</span>
            <kbd className="bg-muted pointer-events-none hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open command palette"
          >
            <Search className="h-4 w-4" />
          </Button>

          <TourLauncher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
