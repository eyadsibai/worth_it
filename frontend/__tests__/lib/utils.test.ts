/**
 * Tests for utils.ts
 * Tests the cn (classnames) utility function
 */
import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (classnames utility)", () => {
  it("merges multiple class strings", () => {
    const result = cn("class1", "class2");
    expect(result).toBe("class1 class2");
  });

  it("handles conditional classes with objects", () => {
    const result = cn("base", { conditional: true, disabled: false });
    expect(result).toBe("base conditional");
  });

  it("handles array of classes", () => {
    const result = cn(["class1", "class2"]);
    expect(result).toBe("class1 class2");
  });

  it("handles undefined and null values", () => {
    const result = cn("class1", undefined, null, "class2");
    expect(result).toBe("class1 class2");
  });

  it("handles empty string", () => {
    const result = cn("class1", "", "class2");
    expect(result).toBe("class1 class2");
  });

  it("handles boolean false values", () => {
    const isActive = false;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base");
  });

  it("handles boolean true values", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  // Tailwind merge specific tests
  it("merges conflicting Tailwind classes correctly", () => {
    // tailwind-merge should keep the last conflicting class
    const result = cn("p-2", "p-4");
    expect(result).toBe("p-4");
  });

  it("merges conflicting text colors", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });

  it("merges conflicting background colors", () => {
    const result = cn("bg-white", "bg-gray-100");
    expect(result).toBe("bg-gray-100");
  });

  it("preserves non-conflicting classes", () => {
    const result = cn("p-4", "m-2", "text-red-500");
    expect(result).toBe("p-4 m-2 text-red-500");
  });

  it("handles complex class combinations", () => {
    const result = cn("base-class", { "conditional-class": true }, ["array-class"], "final-class");
    expect(result).toContain("base-class");
    expect(result).toContain("conditional-class");
    expect(result).toContain("array-class");
    expect(result).toContain("final-class");
  });

  it("returns empty string for no valid classes", () => {
    const result = cn(undefined, null, false, "");
    expect(result).toBe("");
  });
});
