"use client";

import { useWalkthrough } from "@/lib/walkthrough";
import { Spotlight } from "./spotlight";

export function WalkthroughOverlay() {
  const {
    activeTour,
    currentStep,
    isRunning,
    nextStep,
    prevStep,
    skipTour,
    completeTour,
  } = useWalkthrough();

  if (!activeTour || !isRunning) return null;

  return (
    <Spotlight
      steps={activeTour.steps}
      currentStep={currentStep}
      onNext={nextStep}
      onPrev={prevStep}
      onSkip={skipTour}
      onComplete={completeTour}
      isOpen={isRunning}
    />
  );
}
