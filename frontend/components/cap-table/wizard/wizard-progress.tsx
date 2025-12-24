"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface WizardProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels?: string[];
}

export function WizardProgress({ currentStep, totalSteps, stepLabels = [] }: WizardProgressProps) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-2">
      {/* Step indicator text */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Step {currentStep} of {totalSteps}
        </span>
        {stepLabels[currentStep - 1] && (
          <span className="font-medium">{stepLabels[currentStep - 1]}</span>
        )}
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Wizard progress: step ${currentStep} of ${totalSteps}`}
        className="bg-muted h-2 overflow-hidden rounded-full"
      >
        <motion.div
          className="bg-primary h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Step dots */}
      <div className="flex justify-between px-1">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <motion.div
            key={index}
            className={cn(
              "h-2 w-2 rounded-full",
              index < currentStep ? "bg-primary" : "bg-muted-foreground/30"
            )}
            initial={{ scale: 0 }}
            animate={{
              scale: 1,
              backgroundColor: index < currentStep ? undefined : undefined,
            }}
            transition={{
              scale: { duration: 0.2, delay: index * 0.05 },
              backgroundColor: { duration: 0.3 },
            }}
            whileHover={{ scale: 1.3 }}
          />
        ))}
      </div>
    </div>
  );
}
