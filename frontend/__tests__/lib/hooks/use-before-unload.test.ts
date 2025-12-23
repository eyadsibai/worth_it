/**
 * Tests for useBeforeUnload hook
 * Following TDD - tests written first
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBeforeUnload } from "@/lib/hooks/use-before-unload";

describe("useBeforeUnload", () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, "addEventListener");
    removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("adds beforeunload listener when hasUnsavedChanges is true", () => {
    renderHook(() => useBeforeUnload(true));

    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("does not add listener when hasUnsavedChanges is false", () => {
    renderHook(() => useBeforeUnload(false));

    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });

  it("removes listener on unmount", () => {
    const { unmount } = renderHook(() => useBeforeUnload(true));

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("prevents default and sets returnValue when triggered", () => {
    renderHook(() => useBeforeUnload(true));

    const handler = addEventListenerSpy.mock.calls.find(
      (call: [string, unknown]) => call[0] === "beforeunload"
    )?.[1] as EventListenerOrEventListenerObject;

    expect(handler).toBeDefined();

    const event = new Event("beforeunload") as BeforeUnloadEvent;
    Object.defineProperty(event, "returnValue", {
      writable: true,
      value: "",
    });
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");

    (handler as EventListener)(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(event.returnValue).toBe("");
  });

  it("updates listener when hasUnsavedChanges changes from false to true", () => {
    const { rerender } = renderHook(({ hasChanges }) => useBeforeUnload(hasChanges), {
      initialProps: { hasChanges: false },
    });

    expect(addEventListenerSpy).not.toHaveBeenCalled();

    rerender({ hasChanges: true });

    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("removes listener when hasUnsavedChanges changes from true to false", () => {
    const { rerender } = renderHook(({ hasChanges }) => useBeforeUnload(hasChanges), {
      initialProps: { hasChanges: true },
    });

    rerender({ hasChanges: false });

    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  it("allows custom message (though browsers may ignore it)", () => {
    renderHook(() => useBeforeUnload(true, "Custom message"));

    const handler = addEventListenerSpy.mock.calls.find(
      (call: [string, unknown]) => call[0] === "beforeunload"
    )?.[1] as EventListenerOrEventListenerObject;

    const event = new Event("beforeunload") as BeforeUnloadEvent;
    Object.defineProperty(event, "returnValue", {
      writable: true,
      value: "",
    });

    (handler as EventListener)(event);

    // Modern browsers ignore custom messages but we still set returnValue
    expect(event.returnValue).toBe("");
  });
});
