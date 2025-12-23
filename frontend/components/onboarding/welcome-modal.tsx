"use client";

import * as React from "react";
import { Briefcase, Building2, Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import type { AppMode } from "@/lib/store";

interface WelcomeModalProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

type Step = 1 | 2 | 3;

export function WelcomeModal({ open, onComplete, onSkip }: WelcomeModalProps) {
  const [currentStep, setCurrentStep] = React.useState<Step>(1);
  const setAppMode = useAppStore((state) => state.setAppMode);

  const handleModeSelect = (mode: AppMode) => {
    setAppMode(mode);
    setCurrentStep(3);
  };

  const handleGetStarted = () => {
    setCurrentStep(2);
  };

  const handleComplete = () => {
    onComplete();
  };

  // Reset step when modal reopens
  React.useEffect(() => {
    if (open) {
      setCurrentStep(1);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Step Indicators */}
        <div className="mb-2 flex justify-center gap-2">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              data-testid="step-indicator"
              data-active={currentStep === step ? "true" : "false"}
              className={`h-2 w-2 rounded-full transition-colors ${
                currentStep === step
                  ? "bg-primary"
                  : currentStep > step
                    ? "bg-primary/50"
                    : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <>
            <DialogHeader className="text-center">
              <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <Sparkles className="text-primary h-8 w-8" />
              </div>
              <DialogTitle className="text-2xl">Welcome to Worth It</DialogTitle>
              <DialogDescription className="text-base">
                Make smarter career decisions by comparing job offers with equity compensation
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                <div className="bg-chart-3/20 text-chart-3 flex h-6 w-6 items-center justify-center rounded-full">
                  1
                </div>
                <span>Enter your current job details</span>
              </div>
              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                <div className="bg-chart-3/20 text-chart-3 flex h-6 w-6 items-center justify-center rounded-full">
                  2
                </div>
                <span>Add your startup offer with equity</span>
              </div>
              <div className="text-muted-foreground flex items-center gap-3 text-sm">
                <div className="bg-chart-3/20 text-chart-3 flex h-6 w-6 items-center justify-center rounded-full">
                  3
                </div>
                <span>See instant comparison & Monte Carlo analysis</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button onClick={handleGetStarted} className="w-full">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="ghost" onClick={onSkip} className="w-full">
                Skip
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Mode Selection */}
        {currentStep === 2 && (
          <>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">Are you an Employee or Founder?</DialogTitle>
              <DialogDescription>This determines which tools you&apos;ll see</DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4">
              <Button
                variant="outline"
                className="hover:border-primary hover:bg-primary/5 h-auto flex-col items-start gap-2 p-4 text-left"
                onClick={() => handleModeSelect("employee")}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="text-primary h-5 w-5" />
                  <span className="font-semibold">Employee</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  Compare job offers with RSUs or stock options
                </span>
              </Button>

              <Button
                variant="outline"
                className="hover:border-primary hover:bg-primary/5 h-auto flex-col items-start gap-2 p-4 text-left"
                onClick={() => handleModeSelect("founder")}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="text-primary h-5 w-5" />
                  <span className="font-semibold">Founder</span>
                </div>
                <span className="text-muted-foreground text-sm">
                  Manage cap table and model waterfall distributions
                </span>
              </Button>
            </div>

            <Button variant="ghost" onClick={onSkip} className="w-full">
              Skip
            </Button>
          </>
        )}

        {/* Step 3: Quick Tour */}
        {currentStep === 3 && (
          <>
            <DialogHeader className="text-center">
              <div className="bg-chart-3/20 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
                <ArrowRight className="text-chart-3 h-8 w-8" />
              </div>
              <DialogTitle className="text-xl">You&apos;re all set!</DialogTitle>
              <DialogDescription className="text-base">
                Fill in the sidebar on the left to see your results instantly on the right
              </DialogDescription>
            </DialogHeader>

            <div className="border-primary/50 bg-primary/5 text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm">
              <p>
                <strong>Tip:</strong> Try loading an example scenario to see how it works
              </p>
            </div>

            <Button onClick={handleComplete} className="mt-4 w-full">
              Got it!
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
