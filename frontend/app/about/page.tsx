"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal, TrendingUp, Calculator, BarChart3, GitBranch, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <AppShell>
      <div className="container max-w-4xl py-8 space-y-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-md bg-accent/10 border border-accent/30">
              <Terminal className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                <span className="text-accent font-mono">$</span> Worth It
              </h1>
              <p className="text-muted-foreground">Job Offer Financial Analyzer</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl">
            Make data-driven decisions about job offers with comprehensive financial modeling.
            Compare startup equity packages against traditional employment opportunities.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass-card border-l-4 border-l-chart-1/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-chart-1" />
                Opportunity Cost Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Calculate the true cost of taking a lower-paying startup role by modeling
              your foregone salary, potential investment returns, and career growth.
            </CardContent>
          </Card>

          <Card className="glass-card border-l-4 border-l-chart-2/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-chart-2" />
                Equity Valuation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Model RSUs and Stock Options with realistic dilution scenarios,
              vesting schedules, and exit valuations to understand your equity potential.
            </CardContent>
          </Card>

          <Card className="glass-card border-l-4 border-l-chart-3/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-chart-3" />
                Monte Carlo Simulation
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Run probabilistic simulations with variable exit valuations,
              startup failure rates, and salary growth to understand the range of outcomes.
            </CardContent>
          </Card>

          <Card className="glass-card border-l-4 border-l-chart-4/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-chart-4" />
                Cap Table Management
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              For founders: model cap tables with SAFE notes, convertible notes, and priced rounds.
              Run waterfall analysis to understand exit proceeds distribution.
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-accent font-mono">$</span> How It Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <ol className="list-decimal list-inside space-y-3">
              <li>
                <span className="font-medium text-foreground">Enter your current job details</span>
                {" "}- salary, expected growth rate, and investment returns
              </li>
              <li>
                <span className="font-medium text-foreground">Configure your startup offer</span>
                {" "}- salary, equity type (RSUs or Stock Options), and vesting schedule
              </li>
              <li>
                <span className="font-medium text-foreground">Set exit expectations</span>
                {" "}- target valuation, exit timeline, and dilution scenarios
              </li>
              <li>
                <span className="font-medium text-foreground">Analyze the results</span>
                {" "}- view breakeven points, IRR, NPV, and run Monte Carlo simulations
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Get Started */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 transition-colors"
          >
            <Terminal className="h-4 w-4" />
            Start Analyzing
          </Link>
          <a
            href="https://github.com/eyadsibai/worth_it"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border text-foreground font-medium text-sm hover:bg-secondary transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View on GitHub
          </a>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border text-sm text-muted-foreground font-mono">
          <p>Built with Next.js, FastAPI, and real financial modeling algorithms.</p>
        </div>
      </div>
    </AppShell>
  );
}
