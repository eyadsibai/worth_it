"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ModeToggle } from "@/components/mode-toggle";
import { FounderDashboard, EmployeeDashboard } from "@/components/dashboard";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { AnimatedText, AnimatePresence, motion } from "@/lib/motion";
import { useAppStore } from "@/lib/store";
import { useDraftAutoSave, getDraft, clearDraft, useBeforeUnload, useReducedMotion } from "@/lib/hooks";
import { useFirstVisit } from "@/lib/hooks/use-first-visit";
import type { RSUForm, StockOptionsForm } from "@/lib/schemas";

export default function Home() {
  // Global state from Zustand store
  const {
    appMode,
    setAppMode,
    globalSettings,
    currentJob,
    equityDetails,
    setGlobalSettings,
    setCurrentJob,
    setEquityDetails,
  } = useAppStore();

  // Draft auto-save (recovery happens automatically without dialog)

  // First-time user onboarding
  const { isFirstVisit, isLoaded: isOnboardingLoaded, markAsOnboarded } = useFirstVisit();
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  // Reduced motion accessibility support
  const prefersReducedMotion = useReducedMotion();

  // Show onboarding modal for first-time visitors
  React.useEffect(() => {
    if (isOnboardingLoaded && isFirstVisit) {
      setShowOnboarding(true);
    }
  }, [isOnboardingLoaded, isFirstVisit]);

  const handleOnboardingComplete = React.useCallback(() => {
    markAsOnboarded();
    setShowOnboarding(false);
  }, [markAsOnboarded]);

  const handleOnboardingSkip = React.useCallback(() => {
    markAsOnboarded();
    setShowOnboarding(false);
  }, [markAsOnboarded]);

  // Auto-save form data every 5 seconds (only in employee mode)
  useDraftAutoSave(
    {
      globalSettings,
      currentJob,
      equityDetails,
    },
    { disabled: appMode !== "employee" }
  );

  // Warn before leaving with unsaved changes
  const hasUnsavedChanges = appMode === "employee" && (
    globalSettings !== null || currentJob !== null || equityDetails !== null
  );
  useBeforeUnload(hasUnsavedChanges);

  // Automatically restore saved draft on mount (no dialog - just restore silently)
  React.useEffect(() => {
    if (appMode !== "employee") return;

    const draft = getDraft();
    if (draft) {
      // Auto-restore draft without showing dialog
      const { data } = draft;
      if (data.globalSettings) {
        setGlobalSettings(data.globalSettings as Parameters<typeof setGlobalSettings>[0]);
      }
      if (data.currentJob) {
        setCurrentJob(data.currentJob as Parameters<typeof setCurrentJob>[0]);
      }
      if (data.equityDetails) {
        setEquityDetails(data.equityDetails as RSUForm | StockOptionsForm);
      }
      clearDraft();
    }
  }, [appMode, setGlobalSettings, setCurrentJob, setEquityDetails]);


  return (
    <AppShell>
      <div className="container py-8 space-y-8">
        {/* Hero Section - Stable container, only text animates */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
            <AnimatedText
              text={appMode === "employee" ? "Offer" : "Cap Table"}
              as="span"
              className="mr-2"
            />
            <AnimatedText
              text={appMode === "employee" ? "Analysis" : "Modeling"}
              as="span"
              className="gradient-text"
            />
          </h1>
          <AnimatedText
            text={appMode === "employee"
              ? "Compare startup offers to your current job with equity modeling, dilution scenarios, and Monte Carlo simulations"
              : "Simulate funding rounds, model ownership dilution, and understand your exit scenarios with waterfall analysis"
            }
            as="p"
            className="text-base text-muted-foreground max-w-2xl leading-relaxed"
          />
          <div>
            <ModeToggle mode={appMode} onModeChange={setAppMode} />
          </div>
          <div className="section-divider" />
        </div>

        {/* Mode-specific Dashboard with crossfade transition */}
        <AnimatePresence mode="wait" initial={false}>
          {appMode === "founder" ? (
            <motion.div
              key="founder-dashboard"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            >
              <FounderDashboard />
            </motion.div>
          ) : (
            <motion.div
              key="employee-dashboard"
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.98 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            >
              <EmployeeDashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Onboarding Modal for First-Time Users */}
      <WelcomeModal
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </AppShell>
  );
}
