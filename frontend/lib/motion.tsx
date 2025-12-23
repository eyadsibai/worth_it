"use client";

import {
  motion,
  type HTMLMotionProps,
  type Variants,
  useInView,
  useSpring,
  useMotionValue,
  AnimatePresence,
} from "framer-motion";
import * as React from "react";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { formatCurrencyWithDecimals, formatCurrencyCompact } from "@/lib/format-utils";

// ============================================================================
// Animation Variants - Reusable animation presets
// ============================================================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// Stagger container for lists
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// ============================================================================
// Motion Components - Wrappers for common elements
// ============================================================================

interface MotionDivProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
}

/**
 * Animated container that fades in when scrolled into view
 */
export function MotionFadeIn({ children, className, ...props }: MotionDivProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={fadeIn}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated container that fades in and slides up
 */
export function MotionFadeInUp({
  children,
  className,
  delay = 0,
  ...props
}: MotionDivProps & { delay?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut", delay } },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Animated container that scales in
 */
export function MotionScaleIn({ children, className, ...props }: MotionDivProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={scaleIn}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * List container with staggered children animations
 */
export function MotionList({ children, className, ...props }: MotionDivProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-30px" }}
      variants={staggerContainer}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * List item with staggered animation
 */
export function MotionListItem({ children, className, ...props }: MotionDivProps) {
  return (
    <motion.div variants={staggerItem} className={className} {...props}>
      {children}
    </motion.div>
  );
}

/**
 * Card with hover lift effect
 */
export function MotionCard({ children, className, ...props }: MotionDivProps) {
  return (
    <motion.div
      whileHover={{
        y: -4,
        boxShadow: "0 10px 40px -10px rgba(0, 0, 0, 0.2)",
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.99 }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * Button with press animation
 */
export function MotionButton({ children, className, ...props }: HTMLMotionProps<"button">) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ============================================================================
// Animated Number Counter - For statistics and metrics
// ============================================================================

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  formatValue?: (value: number) => string;
  className?: string;
}

// Default formatter as a stable reference
const defaultNumberFormatter = (v: number) => v.toLocaleString();

/**
 * Animated number counter that smoothly transitions between values
 * Great for displaying metrics, statistics, and financial figures
 */
export function AnimatedNumber({
  value,
  duration = 0.8,
  formatValue,
  className,
}: AnimatedNumberProps) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
  });
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  // Memoize the formatter to prevent unnecessary effect re-runs
  const memoizedFormatter = React.useCallback(
    (v: number) => (formatValue ?? defaultNumberFormatter)(v),
    [formatValue]
  );

  React.useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  React.useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = memoizedFormatter(Math.round(latest));
      }
    });
    return unsubscribe;
  }, [springValue, memoizedFormatter]);

  return (
    <span ref={ref} className={className}>
      {memoizedFormatter(0)}
    </span>
  );
}

/**
 * Animated currency display
 */
export function AnimatedCurrency({
  value,
  currency = "$",
  className,
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  return (
    <span className={className}>
      {currency}{" "}
      <AnimatedNumber
        value={value}
        formatValue={(v) => v.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      />
    </span>
  );
}

/**
 * Enhanced animated currency with delta display
 * Shows the change amount briefly when value updates
 *
 * When responsive=true, shows compact format ($123K) at tablet/mobile
 * to prevent text truncation in tight layouts
 */
export function AnimatedCurrencyDisplay({
  value,
  showDelta = true,
  responsive = false,
  className,
}: {
  value: number;
  showDelta?: boolean;
  /** When true, uses compact notation ($123K) on smaller viewports */
  responsive?: boolean;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const mainRef = React.useRef<HTMLSpanElement>(null);
  const decimalRef = React.useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    duration: prefersReducedMotion ? 0 : 800,
    bounce: 0,
  });
  const isInView = useInView(mainRef, { once: true, margin: "-50px" });

  // Track previous value for delta calculation
  const previousValue = React.useRef<number | null>(null);
  const [delta, setDelta] = React.useState<number | null>(null);
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isInView) {
      // Calculate delta (skip on first render)
      if (!isFirstRender.current && previousValue.current !== null && showDelta) {
        const diff = value - previousValue.current;
        if (diff !== 0) {
          setDelta(diff);
          // Clear delta after 2 seconds
          const timer = setTimeout(() => setDelta(null), 2000);
          return () => clearTimeout(timer);
        }
      }
      isFirstRender.current = false;
      previousValue.current = value;
      motionValue.set(value);
    }
  }, [isInView, value, motionValue, showDelta]);

  // Format and update display using textContent (safe)
  React.useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      const { main, decimal } = formatCurrencyWithDecimals(Math.round(latest));
      if (mainRef.current) {
        mainRef.current.textContent = main;
      }
      if (decimalRef.current) {
        decimalRef.current.textContent = decimal;
      }
    });
    return unsubscribe;
  }, [springValue]);

  const { main, decimal } = formatCurrencyWithDecimals(0);

  return (
    <span className={`relative inline-flex items-center gap-2 ${className ?? ""}`}>
      {/* Full format shown on lg+ screens, compact on smaller when responsive */}
      <span className={`tabular-nums ${responsive ? "hidden lg:inline" : ""}`}>
        <span ref={mainRef}>{main}</span>
        <span ref={decimalRef} className="currency-decimal">
          {decimal}
        </span>
      </span>
      {/* Compact format shown only on smaller screens when responsive */}
      {responsive && <span className="tabular-nums lg:hidden">{formatCurrencyCompact(value)}</span>}
      <AnimatePresence>
        {delta !== null && (
          <motion.span
            initial={{ opacity: 0, y: -5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className={`font-mono text-xs tabular-nums ${
              delta > 0 ? "text-terminal" : delta < 0 ? "text-destructive" : ""
            }`}
          >
            {delta > 0 ? "+" : ""}
            {formatCurrencyWithDecimals(delta).main}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

/**
 * Animated percentage display
 */
export function AnimatedPercentage({
  value,
  decimals = 2,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 800, bounce: 0 });
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  React.useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  React.useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = latest.toFixed(decimals) + "%";
      }
    });
    return unsubscribe;
  }, [springValue, decimals]);

  return (
    <span ref={ref} className={className}>
      0%
    </span>
  );
}

// ============================================================================
// Progress Indicators
// ============================================================================

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

/**
 * Animated progress bar
 */
export function AnimatedProgress({
  value,
  max = 100,
  className,
  barClassName,
}: AnimatedProgressProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={className}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className={barClassName}
      />
    </div>
  );
}

// ============================================================================
// Pulse Effect - For drawing attention
// ============================================================================

/**
 * Pulsing dot indicator
 */
export function PulsingDot({
  className,
  color = "bg-terminal",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <span className={`relative flex h-2 w-2 ${className}`}>
      <motion.span
        className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
        animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
}

// ============================================================================
// Skeleton Loading
// ============================================================================

interface SkeletonProps {
  className?: string;
}

/**
 * Animated skeleton loader
 */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <motion.div
      className={`bg-muted rounded ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity }}
    />
  );
}

// ============================================================================
// Smart Highlight Effect
// ============================================================================

/**
 * Highlights changes in values with a brief glow effect
 */
export function HighlightOnChange({
  children,
  value,
  className,
}: {
  children: React.ReactNode;
  value: unknown;
  className?: string;
}) {
  const [highlight, setHighlight] = React.useState(false);
  const previousValue = React.useRef(value);

  React.useEffect(() => {
    if (previousValue.current !== value) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 600);
      previousValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <motion.span
      animate={
        highlight
          ? {
              backgroundColor: [
                "rgba(var(--terminal), 0)",
                "rgba(var(--terminal), 0.2)",
                "rgba(var(--terminal), 0)",
              ],
            }
          : {}
      }
      transition={{ duration: 0.6 }}
      className={className}
    >
      {children}
    </motion.span>
  );
}

// ============================================================================
// Animated Text - For smooth text transitions
// ============================================================================

interface AnimatedTextProps {
  /** The text content to display */
  text: string;
  /** Additional CSS classes */
  className?: string;
  /** Animation duration in seconds */
  duration?: number;
  /** HTML element to render as */
  as?: "span" | "p" | "h1" | "h2" | "h3";
}

/**
 * Animated text component that crossfades when content changes.
 * Uses AnimatePresence with mode="popLayout" for smooth transitions.
 * Respects prefers-reduced-motion user preference.
 */
export function AnimatedText({
  text,
  className,
  duration = 0.15,
  as: Component = "span",
}: AnimatedTextProps) {
  const prefersReducedMotion = useReducedMotion();
  const MotionComponent = motion[Component];

  // If user prefers reduced motion, render without animation
  if (prefersReducedMotion) {
    return <Component className={className}>{text}</Component>;
  }

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <MotionComponent
        key={text}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration, ease: "easeOut" }}
        className={className}
      >
        {text}
      </MotionComponent>
    </AnimatePresence>
  );
}

// Re-export motion for custom use
export { motion, AnimatePresence, type Variants };
