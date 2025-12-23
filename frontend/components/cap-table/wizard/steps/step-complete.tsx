"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Users, PieChart, Target, Landmark, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/format-utils";
import type { WizardData } from "../types";

interface StepCompleteProps {
  data: WizardData;
  onComplete: () => void;
}

export function StepComplete({ data, onComplete }: StepCompleteProps) {
  const validFounders = data.founders.filter((f) => f.name.trim() !== "");
  const validAdvisors = data.advisors.filter((a) => a.name.trim() !== "");
  const validFunding = data.funding.filter((f) => f.investorName.trim() !== "" && f.amount > 0);

  const totalFounderOwnership = validFounders.reduce((sum, f) => sum + f.ownershipPct, 0);
  const totalAdvisorOwnership = validAdvisors.reduce((sum, a) => sum + a.ownershipPct, 0);
  const totalFundingAmount = validFunding.reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        className="space-y-2 text-center"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-terminal/20 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <CheckCircle2 className="text-terminal h-8 w-8" />
        </div>
        <h2 className="text-2xl font-semibold">Your cap table is ready!</h2>
        <p className="text-muted-foreground">Here is a summary of what has been set up</p>
      </motion.div>

      {/* Summary Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="space-y-4 p-6">
          {/* Founders */}
          <div className="flex items-start gap-3">
            <div className="bg-chart-1/20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
              <Users className="text-chart-1 h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Founders</h3>
                <Badge variant="secondary">{validFounders.length}</Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {validFounders.map((f) => f.name).join(", ")} ({totalFounderOwnership}% total)
              </p>
            </div>
          </div>

          {/* Option Pool */}
          <div className="flex items-start gap-3">
            <div className="bg-chart-2/20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
              <PieChart className="text-chart-2 h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Option Pool</h3>
                <Badge variant="secondary">{data.optionPoolPct}%</Badge>
              </div>
              <p className="text-muted-foreground text-sm">Reserved for future employee grants</p>
            </div>
          </div>

          {/* Advisors */}
          {validAdvisors.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="bg-chart-3/20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                <Target className="text-chart-3 h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Advisors</h3>
                  <Badge variant="secondary">{validAdvisors.length}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  {validAdvisors.map((a) => a.name).join(", ")} ({totalAdvisorOwnership}% total)
                </p>
              </div>
            </div>
          )}

          {/* Funding */}
          {validFunding.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="bg-chart-4/20 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full">
                <Landmark className="text-chart-4 h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  {/* formatCurrency displays full values (e.g., $10,000,000) for precision */}
                  <h3 className="font-medium">Funding</h3>
                  <Badge variant="secondary">{formatCurrency(totalFundingAmount)}</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  {validFunding.map((f) => `${f.investorName} (${f.type})`).join(", ")}
                </p>
              </div>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Next Steps */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card className="bg-muted/50 p-4">
          <h3 className="mb-2 font-medium">What you can do next:</h3>
          <ul className="text-muted-foreground space-y-1 text-sm">
            <li>• Add more stakeholders (employees, investors)</li>
            <li>• Model additional funding rounds</li>
            <li>• Analyze exit scenarios in the Waterfall tab</li>
            <li>• Export your cap table to CSV or PDF</li>
          </ul>
        </Card>
      </motion.div>

      {/* CTA */}
      <motion.div
        className="pt-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Button onClick={onComplete} size="lg" className="w-full">
          View Your Cap Table
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </motion.div>
    </div>
  );
}
