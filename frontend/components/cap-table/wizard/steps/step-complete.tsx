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
        className="text-center space-y-2"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mx-auto w-16 h-16 rounded-full bg-terminal/20 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-terminal" />
        </div>
        <h2 className="text-2xl font-semibold">Your cap table is ready!</h2>
        <p className="text-muted-foreground">
          Here&apos;s a summary of what we&apos;ve set up
        </p>
      </motion.div>

      {/* Summary Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="p-6 space-y-4">
          {/* Founders */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-chart-1/20 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-chart-1" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Founders</h3>
                <Badge variant="secondary">{validFounders.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {validFounders.map((f) => f.name).join(", ")} ({totalFounderOwnership}% total)
              </p>
            </div>
          </div>

          {/* Option Pool */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-chart-2/20 flex items-center justify-center flex-shrink-0">
              <PieChart className="h-4 w-4 text-chart-2" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Option Pool</h3>
                <Badge variant="secondary">{data.optionPoolPct}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Reserved for future employee grants
              </p>
            </div>
          </div>

          {/* Advisors */}
          {validAdvisors.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-chart-3/20 flex items-center justify-center flex-shrink-0">
                <Target className="h-4 w-4 text-chart-3" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Advisors</h3>
                  <Badge variant="secondary">{validAdvisors.length}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {validAdvisors.map((a) => a.name).join(", ")} ({totalAdvisorOwnership}% total)
                </p>
              </div>
            </div>
          )}

          {/* Funding */}
          {validFunding.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-chart-4/20 flex items-center justify-center flex-shrink-0">
                <Landmark className="h-4 w-4 text-chart-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Funding</h3>
                  <Badge variant="secondary">{formatCurrency(totalFundingAmount)}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
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
        <Card className="p-4 bg-muted/50">
          <h3 className="font-medium mb-2">What you can do next:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
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
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}
