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
        <div className="flex justify-center gap-2 mb-2">
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <DialogTitle className="text-2xl">Welcome to Worth It</DialogTitle>
              <DialogDescription className="text-base">
                Make smarter career decisions by comparing job offers with
                equity compensation
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-3/20 text-chart-3">
                  1
                </div>
                <span>Enter your current job details</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-3/20 text-chart-3">
                  2
                </div>
                <span>Add your startup offer with equity</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-chart-3/20 text-chart-3">
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
              <DialogTitle className="text-xl">
                Are you an Employee or Founder?
              </DialogTitle>
              <DialogDescription>
                This determines which tools you&apos;ll see
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3 py-4">
              <Button
                variant="outline"
                className="h-auto flex-col items-start gap-2 p-4 text-left hover:border-primary hover:bg-primary/5"
                onClick={() => handleModeSelect("employee")}
              >
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Employee</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  Compare job offers with RSUs or stock options
                </span>
              </Button>

              <Button
                variant="outline"
                className="h-auto flex-col items-start gap-2 p-4 text-left hover:border-primary hover:bg-primary/5"
                onClick={() => handleModeSelect("founder")}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Founder</span>
                </div>
                <span className="text-sm text-muted-foreground">
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
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-chart-3/20">
                <ArrowRight className="h-8 w-8 text-chart-3" />
              </div>
              <DialogTitle className="text-xl">You&apos;re all set!</DialogTitle>
              <DialogDescription className="text-base">
                Fill in the sidebar on the left to see your results instantly on
                the right
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-dashed border-primary/50 bg-primary/5 p-4 text-center text-sm text-muted-foreground">
              <p>
                <strong>Tip:</strong> Try loading an example scenario to see how
                it works
              </p>
            </div>

            <Button onClick={handleComplete} className="w-full mt-4">
              Got it!
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
