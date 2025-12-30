"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, TrendingUp, Calculator, BarChart3, GitBranch, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8 py-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="bg-accent/10 border-accent/30 flex h-12 w-12 items-center justify-center rounded-md border">
              <Terminal className="text-accent h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-accent font-mono">$</span> Worth It
              </h1>
              <p className="text-muted-foreground">Job Offer Financial Analyzer</p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
            Make data-driven decisions about job offers with comprehensive financial modeling.
            Compare startup equity packages against traditional employment opportunities.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="terminal-card border-l-chart-1/50 border-l-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="text-chart-1 h-4 w-4" />
                Opportunity Cost Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Calculate the true cost of taking a lower-paying startup role by modeling your
              foregone salary, potential investment returns, and career growth.
            </CardContent>
          </Card>

          <Card className="terminal-card border-l-chart-2/50 border-l-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calculator className="text-chart-2 h-4 w-4" />
                Equity Valuation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Model RSUs and Stock Options with realistic dilution scenarios, vesting schedules, and
              exit valuations to understand your equity potential.
            </CardContent>
          </Card>

          <Card className="terminal-card border-l-chart-3/50 border-l-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="text-chart-3 h-4 w-4" />
                Monte Carlo Simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              Run probabilistic simulations with variable exit valuations, startup failure rates,
              and salary growth to understand the range of outcomes.
            </CardContent>
          </Card>

          <Card className="terminal-card border-l-chart-4/50 border-l-4">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="text-chart-4 h-4 w-4" />
                Cap Table Management
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">
              For founders: model cap tables with SAFE notes, convertible notes, and priced rounds.
              Run waterfall analysis to understand exit proceeds distribution.
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="terminal-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-accent font-mono">$</span> How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4 text-sm">
            <ol className="list-inside list-decimal space-y-3">
              <li>
                <span className="text-foreground font-medium">Enter your current job details</span>{" "}
                - salary, expected growth rate, and investment returns
              </li>
              <li>
                <span className="text-foreground font-medium">Configure your startup offer</span> -
                salary, equity type (RSUs or Stock Options), and vesting schedule
              </li>
              <li>
                <span className="text-foreground font-medium">Set exit expectations</span> - target
                valuation, exit timeline, and dilution scenarios
              </li>
              <li>
                <span className="text-foreground font-medium">Analyze the results</span> - view
                breakeven points, IRR, NPV, and run Monte Carlo simulations
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Get Started */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link
            href="/"
            className="bg-accent text-accent-foreground hover:bg-accent/90 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            <Terminal className="h-4 w-4" />
            Start Analyzing
          </Link>
          <a
            href="https://github.com/eyadsibai/worth_it"
            target="_blank"
            rel="noopener noreferrer"
            className="border-border text-foreground hover:bg-secondary inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View on GitHub
          </a>
        </div>

        {/* Footer */}
        <div className="border-border text-muted-foreground border-t pt-4 font-mono text-sm">
          <p>Built with Next.js, FastAPI, and real financial modeling algorithms.</p>
        </div>
      </div>
    </AppShell>
  );
}
