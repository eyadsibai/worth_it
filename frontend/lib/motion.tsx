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
 *
 * Respects reduced motion preference for accessibility - when enabled,
 * renders the final value immediately without animation.
 *
 * Performance optimization: Only subscribes to spring value changes when
 * the element is in view and animation is active, reducing CPU usage.
 */
export const AnimatedNumber = React.memo(function AnimatedNumber({
  value,
  duration = 0.8,
  formatValue,
  className,
}: AnimatedNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(prefersReducedMotion ? value : 0);
  const springValue = useSpring(motionValue, {
    duration: duration * 1000,
    bounce: 0,
  });
  // Use continuous visibility tracking (not once: true) to pause when scrolled away
  const isInView = useInView(ref, { margin: "-50px" });
  // Track initial animation state - use state to avoid ref access during render
  const [hasAnimated, setHasAnimated] = React.useState(prefersReducedMotion);

  // Memoize the formatter to prevent unnecessary effect re-runs
  const memoizedFormatter = React.useCallback(
    (v: number) => (formatValue ?? defaultNumberFormatter)(v),
    [formatValue]
  );

  React.useEffect(() => {
    if (isInView || prefersReducedMotion) {
      motionValue.set(value);
      setHasAnimated(true);
    }
  }, [isInView, value, motionValue, prefersReducedMotion]);

  // Only subscribe to spring changes when in view to reduce CPU usage
  React.useEffect(() => {
    // Skip subscription if reduced motion preferred or not in view
    if (prefersReducedMotion) {
      if (ref.current) {
        ref.current.textContent = memoizedFormatter(value);
      }
      return;
    }

    // Only subscribe when in view
    if (!isInView) return;

    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = memoizedFormatter(Math.round(latest));
      }
    });
    return unsubscribe;
  }, [springValue, memoizedFormatter, isInView, prefersReducedMotion, value]);

  // When reduced motion is preferred, render the final value immediately
  return (
    <span ref={ref} className={className}>
      {memoizedFormatter(hasAnimated ? value : 0)}
    </span>
  );
});

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
 *
 * Performance optimization: Only subscribes to spring value changes when
 * the element is in view, reducing CPU usage for off-screen elements.
 */
export const AnimatedCurrencyDisplay = React.memo(function AnimatedCurrencyDisplay({
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
  const motionValue = useMotionValue(prefersReducedMotion ? value : 0);
  const springValue = useSpring(motionValue, {
    duration: prefersReducedMotion ? 0 : 800,
    bounce: 0,
  });
  // Use continuous visibility tracking to pause when scrolled away
  const isInView = useInView(mainRef, { margin: "-50px" });
  // Track initial animation state - use state to avoid ref access during render
  const [hasAnimated, setHasAnimated] = React.useState(prefersReducedMotion);

  // Track previous value for delta calculation
  const previousValue = React.useRef<number | null>(null);
  const [delta, setDelta] = React.useState<number | null>(null);
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (isInView || prefersReducedMotion) {
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
      setHasAnimated(true);
    }
  }, [isInView, value, motionValue, showDelta, prefersReducedMotion]);

  // Only subscribe to spring changes when in view to reduce CPU usage
  React.useEffect(() => {
    if (prefersReducedMotion) {
      if (mainRef.current) {
        mainRef.current.textContent = formatCurrencyWithDecimals(value).main;
      }
      return;
    }

    // Only subscribe when in view
    if (!isInView) return;

    const unsubscribe = springValue.on("change", (latest) => {
      const { main } = formatCurrencyWithDecimals(Math.round(latest));
      if (mainRef.current) {
        mainRef.current.textContent = main;
      }
    });
    return unsubscribe;
  }, [springValue, isInView, prefersReducedMotion, value]);

  const initialMain = formatCurrencyWithDecimals(hasAnimated ? value : 0).main;

  return (
    <span className={`relative inline-block ${className ?? ""}`}>
      {/* Full format shown on lg+ screens, compact on smaller when responsive */}
      <span className={`tabular-nums ${responsive ? "hidden lg:inline" : ""}`}>
        <span ref={mainRef}>{initialMain}</span>
      </span>
      {/* Compact format shown only on smaller screens when responsive */}
      {responsive && <span className="tabular-nums lg:hidden">{formatCurrencyCompact(value)}</span>}
      {/* Delta positioned absolutely to prevent overflow */}
      <AnimatePresence>
        {delta !== null && (
          <motion.span
            initial={{ opacity: 0, y: -5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            className={`absolute top-0 left-full ml-1.5 hidden font-mono text-xs whitespace-nowrap tabular-nums lg:inline ${
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
});

/**
 * Animated percentage display
 *
 * Note: Trailing zeros are only removed when the animation completes (value stabilizes).
 * During animation, we show consistent decimal places to avoid visual "jumping"
 * between formats (e.g., "28" → "28.1" → "28.5" → "28.50").
 *
 * Performance optimization: Only subscribes to spring value changes when
 * the element is in view, reducing CPU usage for off-screen elements.
 */
export const AnimatedPercentage = React.memo(function AnimatedPercentage({
  value,
  decimals = 2,
  className,
}: {
  value: number;
  decimals?: number;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const ref = React.useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(prefersReducedMotion ? value : 0);
  const springValue = useSpring(motionValue, { duration: 800, bounce: 0 });
  // Use continuous visibility tracking to pause when scrolled away
  const isInView = useInView(ref, { margin: "-50px" });
  const targetValue = React.useRef(value);
  // Track initial animation state - use state to avoid ref access during render
  const [hasAnimated, setHasAnimated] = React.useState(prefersReducedMotion);

  // Memoize the formatter to prevent unnecessary effect re-runs
  const formatPercentage = React.useCallback(
    (v: number, isComplete: boolean, target: number) => {
      if (isComplete) {
        // Animation complete: use the exact target value and remove trailing zeros
        return target.toFixed(decimals).replace(/\.?0+$/, "") + "%";
      }
      // During animation: show consistent decimal places to avoid visual jumping
      return v.toFixed(decimals) + "%";
    },
    [decimals]
  );

  React.useEffect(() => {
    if (isInView || prefersReducedMotion) {
      targetValue.current = value;
      motionValue.set(value);
      setHasAnimated(true);
    }
  }, [isInView, value, motionValue, prefersReducedMotion]);

  // Only subscribe to spring changes when in view to reduce CPU usage
  React.useEffect(() => {
    if (prefersReducedMotion) {
      if (ref.current) {
        ref.current.textContent = formatPercentage(value, true, value);
      }
      return;
    }

    // Only subscribe when in view
    if (!isInView) return;

    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        // Check if animation is close to complete (within 0.01 of target)
        const isComplete = Math.abs(latest - targetValue.current) < 0.01;
        ref.current.textContent = formatPercentage(latest, isComplete, targetValue.current);
      }
    });
    return unsubscribe;
  }, [springValue, formatPercentage, isInView, prefersReducedMotion, value]);

  // Initial display value
  const initialValue = hasAnimated ? value : 0;
  const initialFormatted = formatPercentage(initialValue, hasAnimated, value);

  return (
    <span ref={ref} className={className}>
      {initialFormatted}
    </span>
  );
});

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
 *
 * Performance optimization: Only animates when in view to reduce CPU usage.
 * Uses React.memo to prevent unnecessary re-renders.
 */
export const PulsingDot = React.memo(function PulsingDot({
  className,
  color = "bg-terminal",
}: {
  className?: string;
  color?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();
  // Continuous visibility tracking to pause when scrolled away
  const isInView = useInView(ref, { margin: "-50px" });

  // Don't animate if user prefers reduced motion or element is off-screen
  const shouldAnimate = isInView && !prefersReducedMotion;

  return (
    <span ref={ref} className={`relative flex h-2 w-2 ${className}`}>
      {shouldAnimate ? (
        <motion.span
          className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}
          animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      ) : (
        <span className={`absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
    </span>
  );
});

// ============================================================================
// Skeleton Loading
// ============================================================================

interface SkeletonProps {
  className?: string;
}

/**
 * Animated skeleton loader
 *
 * Performance optimization: Only animates when in view to reduce CPU usage.
 * Uses React.memo to prevent unnecessary re-renders.
 */
export const Skeleton = React.memo(function Skeleton({ className }: SkeletonProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  // Continuous visibility tracking to pause when scrolled away
  const isInView = useInView(ref, { margin: "-50px" });

  // Don't animate if user prefers reduced motion or element is off-screen
  const shouldAnimate = isInView && !prefersReducedMotion;

  if (shouldAnimate) {
    return (
      <motion.div
        ref={ref}
        className={`bg-muted rounded ${className}`}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
    );
  }

  // Static skeleton when not animating
  return <div ref={ref} className={`bg-muted rounded opacity-75 ${className}`} />;
});

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
