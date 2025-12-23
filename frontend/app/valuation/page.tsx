"use client";

import { AppShell } from "@/components/layout/app-shell";
import { ValuationCalculator } from "@/components/valuation";

export default function ValuationPage() {
  return (
    <AppShell>
      <div className="container mx-auto max-w-4xl py-8">
        <div className="mb-8 space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Valuation Calculator</h1>
          <p className="text-muted-foreground">
            Calculate your startup&apos;s valuation using industry-standard methods and compare
            results.
          </p>
        </div>
        <ValuationCalculator />
      </div>
    </AppShell>
  );
}
