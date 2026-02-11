import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Base for alphanumeric string encoding */
const RADIX_BASE36 = 36;
/** Start index for slicing random string */
const RANDOM_SLICE_START = 2;
/** End index for slicing random string (produces 9-char segment) */
const RANDOM_SLICE_END = 11;

/**
 * Generate a unique ID using crypto.randomUUID() when available,
 * falling back to a timestamp + random string for compatibility.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback: timestamp + random string
  return `${Date.now()}-${Math.random().toString(RADIX_BASE36).slice(RANDOM_SLICE_START, RANDOM_SLICE_END)}`;
}
