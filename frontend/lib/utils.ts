import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a unique ID using crypto.randomUUID() when available,
 * falling back to a timestamp + random string for compatibility.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random string
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
