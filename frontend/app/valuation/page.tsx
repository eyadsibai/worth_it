"use client";

import { ValuationCalculator } from "@/components/valuation";

export default function ValuationPage() {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Valuation Calculator</h1>
        <p className="text-muted-foreground">
          Calculate your startup&apos;s valuation using industry-standard methods and compare results.
        </p>
      </div>
      <ValuationCalculator />
    </div>
  );
}
