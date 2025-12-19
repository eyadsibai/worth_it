"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SpotlightStep {
  /** CSS selector for the element to highlight */
  target: string;
  /** Title for the tooltip */
  title: string;
  /** Description text */
  description: string;
  /** Position of the tooltip relative to the target */
  position?: "top" | "bottom" | "left" | "right";
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface SpotlightProps {
  steps: SpotlightStep[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isOpen: boolean;
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right";
}

function calculateTooltipPosition(
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  preferredPosition: "top" | "bottom" | "left" | "right"
): TooltipPosition {
  const padding = 16;
  const arrowOffset = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  // Calculate center positions
  const centerX = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
  const centerY = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;

  // Try positions in order of preference
  const positions: Array<{ placement: "top" | "bottom" | "left" | "right"; top: number; left: number; valid: boolean }> = [
    {
      placement: "bottom",
      top: targetRect.bottom + padding + arrowOffset,
      left: Math.max(padding, Math.min(centerX, viewportWidth - tooltipWidth - padding)),
      valid: targetRect.bottom + padding + arrowOffset + tooltipHeight <= viewportHeight,
    },
    {
      placement: "top",
      top: targetRect.top - tooltipHeight - padding - arrowOffset,
      left: Math.max(padding, Math.min(centerX, viewportWidth - tooltipWidth - padding)),
      valid: targetRect.top - tooltipHeight - padding - arrowOffset >= 0,
    },
    {
      placement: "right",
      top: Math.max(padding, Math.min(centerY, viewportHeight - tooltipHeight - padding)),
      left: targetRect.right + padding + arrowOffset,
      valid: targetRect.right + padding + arrowOffset + tooltipWidth <= viewportWidth,
    },
    {
      placement: "left",
      top: Math.max(padding, Math.min(centerY, viewportHeight - tooltipHeight - padding)),
      left: targetRect.left - tooltipWidth - padding - arrowOffset,
      valid: targetRect.left - tooltipWidth - padding - arrowOffset >= 0,
    },
  ];

  // Find preferred position or first valid one
  const preferred = positions.find((p) => p.placement === preferredPosition && p.valid);
  if (preferred) return { top: preferred.top, left: preferred.left, placement: preferred.placement };

  const fallback = positions.find((p) => p.valid) || positions[0];
  return { top: fallback.top, left: fallback.left, placement: fallback.placement };
}

export function Spotlight({
  steps,
  currentStep,
  onNext,
  onPrev,
  onSkip,
  onComplete,
  isOpen,
}: SpotlightProps) {
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState<TooltipPosition | null>(null);
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // Find and highlight the target element
  React.useEffect(() => {
    if (!isOpen || !step) return;

    // Only measure and update the target's bounding rect.
    // This function is safe to use as a scroll/resize handler (no side effects that trigger more scroll events).
    const updateTargetRect = () => {
      const target = document.querySelector(step.target);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };

    // Scroll the element into view once when the step opens/changes.
    // This is separate from updateTargetRect to prevent infinite scroll loops.
    const scrollToTarget = () => {
      const target = document.querySelector(step.target);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    // Initial update and scroll
    updateTargetRect();
    scrollToTarget();

    // Re-find rect on resize/scroll (but don't scroll again)
    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect);

    return () => {
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect);
    };
  }, [isOpen, step]);

  // Calculate tooltip position
  React.useEffect(() => {
    if (!targetRect || !tooltipRef.current) return;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const position = calculateTooltipPosition(
      targetRect,
      tooltipRect.width,
      tooltipRect.height,
      step?.position || "bottom"
    );
    setTooltipPosition(position);
  }, [targetRect, step]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        if (isLastStep) {
          onComplete();
        } else {
          onNext();
        }
      } else if (e.key === "ArrowLeft" && !isFirstStep) {
        onPrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isFirstStep, isLastStep, onNext, onPrev, onSkip, onComplete]);

  if (!mounted || !isOpen || !step) return null;

  const overlayPadding = 8;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Tutorial walkthrough">
      {/* Overlay with cutout */}
      <div className="absolute inset-0">
        {/* Semi-transparent overlay */}
        <div className="absolute inset-0 bg-black/60 transition-opacity duration-300" />

        {/* Cutout for target element */}
        {targetRect && (
          <div
            className="absolute bg-transparent rounded-lg ring-4 ring-terminal/50 ring-offset-2 ring-offset-transparent transition-all duration-300"
            style={{
              top: targetRect.top - overlayPadding,
              left: targetRect.left - overlayPadding,
              width: targetRect.width + overlayPadding * 2,
              height: targetRect.height + overlayPadding * 2,
              boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.6)`,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <Card
        ref={tooltipRef}
        className={cn(
          "absolute z-[101] w-80 shadow-xl border-terminal/30 bg-card",
          "transition-all duration-300",
          !tooltipPosition && "opacity-0"
        )}
        style={{
          top: tooltipPosition?.top ?? 0,
          left: tooltipPosition?.left ?? 0,
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base text-terminal">{step.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mr-2 -mt-1"
              onClick={onSkip}
              aria-label="Close tutorial"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-sm text-muted-foreground">{step.description}</p>
          {step.action && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={step.action.onClick}
            >
              {step.action.label}
            </Button>
          )}
        </CardContent>
        <CardFooter className="pt-0 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {currentStep + 1} of {steps.length}
          </span>
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={onPrev}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={isLastStep ? onComplete : onNext}
              className="bg-terminal hover:bg-terminal/90"
            >
              {isLastStep ? "Finish" : "Next"}
              {!isLastStep && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>,
    document.body
  );
}
