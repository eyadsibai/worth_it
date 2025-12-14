/**
 * Tests for SidebarProvider and useSidebar hook
 * Verifies context state management and fallback behavior when used outside provider
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { SidebarProvider, useSidebar } from "@/components/layout/sidebar-context";
import * as React from "react";

describe("SidebarProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("initializes with isOpen=false", () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: SidebarProvider,
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("toggle() changes state from false to true", () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: SidebarProvider,
    });

    expect(result.current.isOpen).toBe(false);

    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("toggle() changes state from true to false", () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: SidebarProvider,
    });

    // First toggle to true
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    // Toggle back to false
    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("setIsOpen(true) sets state to true", () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: SidebarProvider,
    });

    act(() => {
      result.current.setIsOpen(true);
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("setIsOpen(false) sets state to false", () => {
    const { result } = renderHook(() => useSidebar(), {
      wrapper: SidebarProvider,
    });

    // First set to true
    act(() => {
      result.current.setIsOpen(true);
    });
    expect(result.current.isOpen).toBe(true);

    // Then set to false
    act(() => {
      result.current.setIsOpen(false);
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("multiple components share the same context state", () => {
    // Create a test component that uses multiple useSidebar hooks
    // and exposes their states for verification via refs
    const resultsRef = React.createRef<{
      hook1: ReturnType<typeof useSidebar>;
      hook2: ReturnType<typeof useSidebar>;
    }>();

    const ForwardedComponent = React.forwardRef<
      { hook1: ReturnType<typeof useSidebar>; hook2: ReturnType<typeof useSidebar> }
    >(function ForwardedTestComponent(_props, ref) {
      const sidebar1 = useSidebar();
      const sidebar2 = useSidebar();
      React.useImperativeHandle(ref, () => ({
        hook1: sidebar1,
        hook2: sidebar2,
      }));
      return null;
    });

    render(
      <SidebarProvider>
        <ForwardedComponent ref={resultsRef} />
      </SidebarProvider>
    );

    // Both should start as false
    expect(resultsRef.current?.hook1.isOpen).toBe(false);
    expect(resultsRef.current?.hook2.isOpen).toBe(false);

    // Toggle from first hook
    act(() => {
      resultsRef.current?.hook1.toggle();
    });

    // Both hooks should see the updated state
    expect(resultsRef.current?.hook1.isOpen).toBe(true);
    expect(resultsRef.current?.hook2.isOpen).toBe(true);
  });
});

describe("useSidebar fallback behavior", () => {
  it("returns isOpen=false when used outside provider", () => {
    // Render without SidebarProvider wrapper
    const { result } = renderHook(() => useSidebar());

    expect(result.current.isOpen).toBe(false);
  });

  it("toggle() is a no-op when used outside provider", () => {
    const { result } = renderHook(() => useSidebar());

    // Should not throw and state should remain false
    act(() => {
      result.current.toggle();
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("setIsOpen() is a no-op when used outside provider", () => {
    const { result } = renderHook(() => useSidebar());

    // Should not throw and state should remain false
    act(() => {
      result.current.setIsOpen(true);
    });

    expect(result.current.isOpen).toBe(false);
  });

  it("allows components to be used standalone without provider", () => {
    // This verifies the deliberate design decision to have fallback behavior
    const { result } = renderHook(() => useSidebar());

    // All functions should be safe to call
    expect(() => result.current.toggle()).not.toThrow();
    expect(() => result.current.setIsOpen(true)).not.toThrow();
    expect(() => result.current.setIsOpen(false)).not.toThrow();
  });
});
