"use client";

import * as React from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ModeToggle } from "@/components/mode-toggle";
import { FounderDashboard, EmployeeDashboard } from "@/components/dashboard";
import { DraftRecoveryDialog } from "@/components/draft-recovery-dialog";
import { WelcomeModal } from "@/components/onboarding/welcome-modal";
import { useAppStore } from "@/lib/store";
import { useDraftAutoSave, getDraft, clearDraft, useBeforeUnload, type DraftData } from "@/lib/hooks";
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

  // Draft auto-save and recovery
  const [showDraftDialog, setShowDraftDialog] = React.useState(false);
  const [savedDraft, setSavedDraft] = React.useState<DraftData | null>(null);

  // First-time user onboarding
  const { isFirstVisit, isLoaded: isOnboardingLoaded, markAsOnboarded } = useFirstVisit();
  const [showOnboarding, setShowOnboarding] = React.useState(false);

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

  // Check for saved draft on mount
  React.useEffect(() => {
    if (appMode !== "employee") return;

    const draft = getDraft();
    if (draft) {
      setSavedDraft(draft);
      setShowDraftDialog(true);
    }
  }, [appMode]);

  // Handle draft restore
  const handleRestoreDraft = React.useCallback(() => {
    if (!savedDraft) return;

    const { data } = savedDraft;
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
    setShowDraftDialog(false);
    setSavedDraft(null);
  }, [savedDraft, setGlobalSettings, setCurrentJob, setEquityDetails]);

  // Handle draft discard
  const handleDiscardDraft = React.useCallback(() => {
    clearDraft();
    setShowDraftDialog(false);
    setSavedDraft(null);
  }, []);

  return (
    <AppShell>
      <div className="container py-8 space-y-8">
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground animate-fade-in">
            {appMode === "employee" ? (
              <>Offer <span className="gradient-text">Analysis</span></>
            ) : (
              <>Cap Table <span className="gradient-text">Modeling</span></>
            )}
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl leading-relaxed animate-fade-in delay-75">
            {appMode === "employee" ? (
              "Compare startup offers to your current job with equity modeling, dilution scenarios, and Monte Carlo simulations"
            ) : (
              "Simulate funding rounds, model ownership dilution, and understand your exit scenarios"
            )}
          </p>
          <div className="animate-fade-in delay-100">
            <ModeToggle mode={appMode} onModeChange={setAppMode} />
          </div>
          <div className="section-divider animate-fade-in delay-150" />
        </div>

        {/* Mode-specific Dashboard */}
        {appMode === "founder" && <FounderDashboard />}
        {appMode === "employee" && <EmployeeDashboard />}
      </div>

      {/* Draft Recovery Dialog */}
      {savedDraft && (
        <DraftRecoveryDialog
          open={showDraftDialog}
          draft={savedDraft}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      {/* Onboarding Modal for First-Time Users */}
      <WelcomeModal
        open={showOnboarding}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    </AppShell>
  );
}
