"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 transition-all group-hover:bg-primary/15 group-hover:border-primary/30">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-semibold tracking-tight text-foreground">
            Worth It
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="hidden md:flex items-center mr-2">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors hover:bg-secondary text-foreground"
            >
              Analysis
            </Link>
            <Link
              href="/about"
              className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
          </nav>

          <div className="h-4 w-px bg-border mx-2 hidden md:block" />

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
