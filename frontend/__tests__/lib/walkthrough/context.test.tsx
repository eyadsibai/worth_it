import { render, screen, act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WalkthroughProvider, useWalkthrough } from "@/lib/walkthrough/context";
import { tours } from "@/lib/walkthrough/tours";

// Mock localStorage
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
};

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("WalkthroughContext", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WalkthroughProvider>{children}</WalkthroughProvider>
  );

  it("provides initial state with no active tour", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    expect(result.current.activeTour).toBeNull();
    expect(result.current.currentStep).toBe(0);
    expect(result.current.isRunning).toBe(false);
  });

  it("starts a tour by ID", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    act(() => {
      result.current.startTour("job-analysis");
    });

    expect(result.current.activeTour?.id).toBe("job-analysis");
    expect(result.current.isRunning).toBe(true);
    expect(result.current.currentStep).toBe(0);
  });

  it("advances to next step", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    act(() => {
      result.current.startTour("job-analysis");
    });

    act(() => {
      result.current.nextStep();
    });

    expect(result.current.currentStep).toBe(1);
  });

  it("goes to previous step", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    act(() => {
      result.current.startTour("job-analysis");
    });

    act(() => {
      result.current.nextStep();
      result.current.nextStep();
    });

    act(() => {
      result.current.prevStep();
    });

    expect(result.current.currentStep).toBe(1);
  });

  it("does not go below step 0", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    act(() => {
      result.current.startTour("job-analysis");
    });

    act(() => {
      result.current.prevStep();
    });

    expect(result.current.currentStep).toBe(0);
  });

  it("completes tour and marks it as completed", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    act(() => {
      result.current.startTour("job-analysis");
    });

    act(() => {
      result.current.completeTour();
    });

    expect(result.current.activeTour).toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isTourCompleted("job-analysis")).toBe(true);
  });

  it("skips tour without marking as completed", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    act(() => {
      result.current.startTour("job-analysis");
    });

    act(() => {
      result.current.skipTour();
    });

    expect(result.current.activeTour).toBeNull();
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isTourCompleted("job-analysis")).toBe(false);
  });

  it("auto-completes tour when advancing past last step", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    act(() => {
      result.current.startTour("job-analysis");
    });

    const stepsCount = tours["job-analysis"].steps.length;

    // Advance through all steps
    for (let i = 0; i < stepsCount; i++) {
      act(() => {
        result.current.nextStep();
      });
    }

    expect(result.current.activeTour).toBeNull();
    expect(result.current.isTourCompleted("job-analysis")).toBe(true);
  });

  it("resets all progress", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    // Complete a tour first
    act(() => {
      result.current.startTour("job-analysis");
    });

    act(() => {
      result.current.completeTour();
    });

    expect(result.current.isTourCompleted("job-analysis")).toBe(true);

    // Reset progress
    act(() => {
      result.current.resetProgress();
    });

    expect(result.current.isTourCompleted("job-analysis")).toBe(false);
  });

  it("filters available tours based on completion status", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    // Initially, job-analysis should be available
    expect(result.current.availableTours.some((t) => t.id === "job-analysis")).toBe(true);

    // Complete job-analysis
    act(() => {
      result.current.startTour("job-analysis");
    });

    act(() => {
      result.current.completeTour();
    });

    // job-analysis should no longer be in available tours
    expect(result.current.availableTours.some((t) => t.id === "job-analysis")).toBe(false);
  });

  it("persists progress to localStorage", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    act(() => {
      result.current.startTour("job-analysis");
    });

    act(() => {
      result.current.completeTour();
    });

    expect(localStorageMock.setItem).toHaveBeenCalled();
    const savedProgress = JSON.parse(localStorageMock.store["worth_it_tour_progress"]);
    expect(savedProgress.completed["job-analysis"]).toBe(true);
  });

  it("dismissAll hides all tours permanently", () => {
    const { result } = renderHook(() => useWalkthrough(), { wrapper });

    act(() => {
      result.current.dismissAll();
    });

    expect(result.current.progress.dismissedAll).toBe(true);
    expect(result.current.availableTours).toHaveLength(0);
  });

  it("throws error when used outside provider", () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(() => useWalkthrough());
    }).toThrow("useWalkthrough must be used within a WalkthroughProvider");

    consoleSpy.mockRestore();
  });
});
