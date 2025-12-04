"use client";

import Link from "next/link";
import { Scale } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-accent/10 border border-accent/20 transition-colors group-hover:bg-accent/15">
            <Scale className="h-4 w-4 text-accent" />
          </div>
          <span className="text-lg font-display tracking-tight">Worth It</span>
        </Link>

        <div className="flex items-center gap-1">
          <nav className="hidden md:flex items-center mr-2">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-muted text-foreground"
            >
              Analysis
            </Link>
            <Link
              href="/about"
              className="px-3 py-1.5 text-sm font-medium rounded-md transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
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
