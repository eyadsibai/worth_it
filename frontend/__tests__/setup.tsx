import * as React from "react";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll, afterAll, vi } from "vitest";

// Suppress expected console.error/warn messages from error handling tests
// These patterns match expected error messages that verify error handling works correctly
const EXPECTED_ERROR_PATTERNS = [
  /Failed to retrieve scenarios from localStorage/,
  /WebSocket error/,
  /Invalid JSON from server/,
  /should handle invalid JSON/,
  /Failed to parse/,
  /Failed to load version history from localStorage/,
  // React act() warnings from Zustand store updates in tests
  // These are expected when testing hooks that use Zustand for state management
  /not wrapped in act/,
  // Recharts warnings when testing chart components without real DOM dimensions
  /The width\(-?\d+\) and height\(-?\d+\) of chart should be greater than 0/,
  // React warnings about Framer Motion props passed through mocked components
  // These occur because our simplified framer-motion mock passes all props to DOM elements
  /React does not recognize the `while(Hover|InView|Tap)` prop/,
];

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    const message = args.join(" ");
    const isExpected = EXPECTED_ERROR_PATTERNS.some((pattern) => pattern.test(message));
    if (!isExpected) {
      originalConsoleError(...args);
    }
  };
  console.warn = (...args: unknown[]) => {
    const message = args.join(" ");
    const isExpected = EXPECTED_ERROR_PATTERNS.some((pattern) => pattern.test(message));
    if (!isExpected) {
      originalConsoleWarn(...args);
    }
  };
});

afterAll(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Helper function to filter motion-specific props from DOM elements
const filterMotionProps = (props: Record<string, unknown>): Record<string, unknown> => {
  const motionProps = new Set([
    "initial",
    "animate",
    "exit",
    "variants",
    "whileHover",
    "whileTap",
    "whileInView",
    "whileFocus",
    "whileDrag",
    "transition",
    "layout",
    "layoutId",
    "drag",
    "dragConstraints",
    "onAnimationComplete",
    "onAnimationStart",
    "style", // Sometimes contains motion values
  ]);
  const filtered: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (!motionProps.has(key)) {
      filtered[key] = props[key];
    }
  }
  return filtered;
};

// Mock framer-motion to skip animations in tests
// This ensures elements are immediately visible without waiting for animations
vi.mock("framer-motion", async () => {
  const actual = await vi.importActual("framer-motion");

  // Create a motion mock that filters props before passing to DOM
  const createMotionMock = (Tag: string) => {
    return function MotionMock({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) {
      return React.createElement(Tag, filterMotionProps(props), children);
    };
  };

  return {
    ...actual,
    motion: {
      div: createMotionMock("div"),
      button: createMotionMock("button"),
      span: createMotionMock("span"),
      p: createMotionMock("p"),
      tr: createMotionMock("tr"),
      td: createMotionMock("td"),
      section: createMotionMock("section"),
      article: createMotionMock("article"),
      a: createMotionMock("a"),
      li: createMotionMock("li"),
      ul: createMotionMock("ul"),
      h1: createMotionMock("h1"),
      h2: createMotionMock("h2"),
      h3: createMotionMock("h3"),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => true, // Simulate reduced motion preference in tests
    useInView: () => true, // Always return true so animations trigger immediately
    // Mock useMotionValue to track a value that can be set and retrieved
    useMotionValue: (initial: number) => {
      let current = initial;
      const listeners: ((v: number) => void)[] = [];
      return {
        get: () => current,
        set: (v: number) => {
          current = v;
          listeners.forEach((l) => l(v));
        },
        on: (event: string, callback: (v: number) => void) => {
          if (event === "change") {
            listeners.push(callback);
            // Immediately call with current value
            callback(current);
          }
          return () => {
            const idx = listeners.indexOf(callback);
            if (idx > -1) listeners.splice(idx, 1);
          };
        },
      };
    },
    // Mock useSpring to return a value that immediately reflects changes
    useSpring: (value: {
      get: () => number;
      on: (event: string, cb: (v: number) => void) => () => void;
    }) => {
      return value; // Pass through the motion value for immediate updates
    },
  };
});

// Also mock @/lib/motion since many components import from there
// This ensures the motion components filter out motion-specific props
vi.mock("@/lib/motion", async (importOriginal) => {
  // Import the original to get the non-motion exports
  const original = await importOriginal<typeof import("@/lib/motion")>();

  // Create a motion mock that filters motion-specific props
  // Note: We define filterMotionProps inline to avoid hoisting issues with vi.mock
  const motionPropSet = new Set([
    "initial",
    "animate",
    "exit",
    "variants",
    "whileHover",
    "whileTap",
    "whileInView",
    "whileFocus",
    "whileDrag",
    "transition",
    "layout",
    "layoutId",
    "drag",
    "dragConstraints",
    "onAnimationComplete",
    "onAnimationStart",
    "viewport",
  ]);

  const filterProps = (props: Record<string, unknown>): Record<string, unknown> => {
    const filtered: Record<string, unknown> = {};
    for (const key of Object.keys(props)) {
      if (!motionPropSet.has(key)) {
        filtered[key] = props[key];
      }
    }
    return filtered;
  };

  const createMotionMock = (Tag: string) => {
    const MotionMock = ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      return React.createElement(Tag, filterProps(props), children);
    };
    MotionMock.displayName = `motion.${Tag}`;
    return MotionMock;
  };

  return {
    ...original,
    motion: {
      div: createMotionMock("div"),
      button: createMotionMock("button"),
      span: createMotionMock("span"),
      p: createMotionMock("p"),
      tr: createMotionMock("tr"),
      td: createMotionMock("td"),
      section: createMotionMock("section"),
      article: createMotionMock("article"),
      a: createMotionMock("a"),
      li: createMotionMock("li"),
      ul: createMotionMock("ul"),
      h1: createMotionMock("h1"),
      h2: createMotionMock("h2"),
      h3: createMotionMock("h3"),
    },
  };
});

// Mock the custom useReducedMotion hook to return true in tests
vi.mock("@/lib/hooks/use-reduced-motion", () => ({
  useReducedMotion: () => true,
}));

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
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
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
