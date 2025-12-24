import * as React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock framer-motion to skip animations in tests
// This ensures elements are immediately visible without waiting for animations
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");
  return {
    ...actual,
    motion: {
      div: ({
        children,
        initial,
        animate,
        variants,
        whileHover,
        whileTap,
        transition,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => {
        // Filter out motion-specific props and render as regular div
        return <div {...props}>{children}</div>;
      },
      button: ({
        children,
        initial,
        animate,
        variants,
        whileHover,
        whileTap,
        transition,
        ...props
      }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => {
        return <button {...props}>{children}</button>;
      },
      tr: ({
        children,
        initial,
        animate,
        variants,
        whileHover,
        whileTap,
        transition,
        ...props
      }: React.HTMLAttributes<HTMLTableRowElement> & Record<string, unknown>) => {
        return <tr {...props}>{children}</tr>;
      },
      span: ({
        children,
        initial,
        animate,
        variants,
        whileHover,
        whileTap,
        transition,
        ...props
      }: React.HTMLAttributes<HTMLSpanElement> & Record<string, unknown>) => {
        return <span {...props}>{children}</span>;
      },
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => true, // Simulate reduced motion preference in tests
  };
});

// Mock crypto.randomUUID for tests (not available in jsdom)
let uuidCounter = 0;
if (typeof crypto === "undefined" || !crypto.randomUUID) {
  Object.defineProperty(globalThis, "crypto", {
    value: {
      ...globalThis.crypto,
      randomUUID: vi.fn(() => `test-uuid-${++uuidCounter}`),
    },
  });
} else {
  vi.spyOn(crypto, "randomUUID").mockImplementation(() => `test-uuid-${++uuidCounter}`);
}

// Mock browser APIs not available in jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock URL.createObjectURL for export utilities
Object.defineProperty(URL, "createObjectURL", {
  writable: true,
  value: vi.fn(() => "mock-url"),
});

Object.defineProperty(URL, "revokeObjectURL", {
  writable: true,
  value: vi.fn(),
});

// Mock ResizeObserver (required by Radix UI components like Checkbox)
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

// Mock IntersectionObserver (required by framer-motion for useInView)
class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {}
}
Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  value: IntersectionObserverMock,
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
})();
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});
