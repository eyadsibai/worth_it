"use client";

import Link from "next/link";
import { Terminal } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center h-8 w-8 rounded-md bg-accent/10 border border-accent/30 transition-all group-hover:border-accent/50 group-hover:shadow-[0_0_12px_-3px] group-hover:shadow-accent/30">
            <Terminal className="h-4 w-4 text-accent" />
          </div>
          <span className="text-base font-semibold tracking-tight">
            <span className="text-accent font-mono">$</span> Worth It
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="hidden md:flex items-center mr-2">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-secondary text-foreground font-mono"
            >
              /analysis
            </Link>
            <Link
              href="/about"
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-secondary text-muted-foreground hover:text-foreground font-mono"
            >
              /about
            </Link>
          </nav>

          <div className="h-4 w-px bg-border mx-2 hidden md:block" />

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
