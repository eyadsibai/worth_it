/**
 * TDD tests for Bug #11: localStorage draft save error handling.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { safeDraftSerialize } from "@/lib/hooks/use-draft-auto-save";

describe("Draft auto-save error handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should not crash when JSON.stringify fails", () => {
    // Create a circular reference object
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;

    // Should not throw, should return null
    const result = safeDraftSerialize(circular);
    expect(result).toBeNull();
  });

  it("should successfully serialize valid data", () => {
    const validData = {
      globalSettings: { exit_year: 5 },
      currentJob: null,
      equityDetails: null,
    };

    const result = safeDraftSerialize(validData);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("string");
  });
});
