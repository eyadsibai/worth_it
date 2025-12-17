"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "worth_it_onboarded";

/**
 * Hook to track if this is the user's first visit to the app.
 * Uses localStorage to persist the onboarding state.
 */
export function useFirstVisit() {
  // Use lazy initialization to avoid setState in useEffect
  const [isFirstVisit, setIsFirstVisit] = useState(() => {
    // Only access localStorage on the client side
    if (typeof window === "undefined") return true;
    return localStorage.getItem(STORAGE_KEY) !== "true";
  });
  // Loaded state is true when running in browser (client-side)
  const [isLoaded] = useState(() => typeof window !== "undefined");

  // Mark user as onboarded
  const markAsOnboarded = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, "true");
    setIsFirstVisit(false);
  }, []);

  // Reset onboarding state (for "Show tutorial again" feature)
  const resetOnboarding = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
    setIsFirstVisit(true);
  }, []);

  return {
    isFirstVisit,
    isLoaded,
    markAsOnboarded,
    resetOnboarding,
  };
}
