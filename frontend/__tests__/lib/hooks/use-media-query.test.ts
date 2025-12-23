import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMediaQuery, useIsMobile } from "@/lib/hooks/use-media-query";

describe("useMediaQuery", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockMatchMedia: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAddEventListener: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRemoveEventListener: any;

  beforeEach(() => {
    mockAddEventListener = vi.fn();
    mockRemoveEventListener = vi.fn();
    mockMatchMedia = vi.fn();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns false initially for SSR safety", () => {
    // Simulate SSR by making matchMedia throw
    mockMatchMedia.mockImplementation(() => {
      throw new Error("matchMedia not available");
    });

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("returns true when media query matches", () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(true);
  });

  it("returns false when media query does not match", () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("updates when media query changes", () => {
    let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;

    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: (event: string, handler: (event: MediaQueryListEvent) => void) => {
        if (event === "change") {
          changeHandler = handler;
        }
        mockAddEventListener(event, handler);
      },
      removeEventListener: mockRemoveEventListener,
    }));

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      if (changeHandler) {
        changeHandler({ matches: true } as MediaQueryListEvent);
      }
    });

    expect(result.current).toBe(true);
  });

  it("adds event listener on mount", () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));

    renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(mockAddEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("removes event listener on unmount", () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));

    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    unmount();

    expect(mockRemoveEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("handles different query strings", () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query.includes("max-width: 640px"),
      media: query,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));

    const { result: mobileResult } = renderHook(() => useMediaQuery("(max-width: 640px)"));
    const { result: tabletResult } = renderHook(() => useMediaQuery("(min-width: 768px)"));

    expect(mobileResult.current).toBe(true);
    expect(tabletResult.current).toBe(false);
  });

  it("re-evaluates when query changes", () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query.includes("min-width: 768px"),
      media: query,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));

    const { result, rerender } = renderHook(({ query }) => useMediaQuery(query), {
      initialProps: { query: "(max-width: 640px)" },
    });

    expect(result.current).toBe(false);

    rerender({ query: "(min-width: 768px)" });
    expect(result.current).toBe(true);
  });
});

describe("useIsMobile", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockMatchMedia: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockAddEventListener: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockRemoveEventListener: any;

  beforeEach(() => {
    mockAddEventListener = vi.fn();
    mockRemoveEventListener = vi.fn();
    mockMatchMedia = vi.fn();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when viewport is mobile-sized (below 768px)", () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: query.includes("max-width: 767px"),
      media: query,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("returns false when viewport is desktop-sized (768px and above)", () => {
    mockMatchMedia.mockImplementation((query: string) => ({
      matches: !query.includes("max-width: 767px"),
      media: query,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
    }));

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});
