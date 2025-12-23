"use client";

import * as React from "react";
import { useTheme } from "next-themes";

/**
 * Chart color definitions for light and dark themes.
 * These match the CSS variables in globals.css but are resolved
 * to actual color values for use in Recharts components.
 *
 * Recharts uses inline SVG styles which don't automatically update
 * when CSS variables change, so we need to pass resolved colors
 * and trigger re-renders on theme change.
 */
const CHART_COLORS = {
  light: {
    chart1: "oklch(32% 0.08 155)", // Dark forest #1A3D2E
    chart2: "oklch(42% 0.10 155)", // Medium green #2D5A3D
    chart3: "oklch(72% 0.18 115)", // Lime #9BC53D
    chart4: "oklch(70% 0.14 175)", // Teal/Mint #3DD9C1
    chart5: "oklch(85% 0.08 155)", // Light mint
    destructive: "oklch(55% 0.22 25)", // Red for negative values
    muted: "oklch(50% 0.01 250)", // Muted foreground
    grid: "oklch(92% 0.003 250)", // Border/grid
    background: "oklch(100% 0 0)", // Card background
    foreground: "oklch(18% 0.01 250)", // Text
  },
  dark: {
    chart1: "oklch(55% 0.12 155)", // Brighter green for visibility
    chart2: "oklch(62% 0.14 155)", // Medium green
    chart3: "oklch(72% 0.18 115)", // Lime
    chart4: "oklch(70% 0.14 175)", // Teal/Mint
    chart5: "oklch(80% 0.10 155)", // Light mint
    destructive: "oklch(60% 0.20 25)", // Slightly brighter red for dark mode
    muted: "oklch(60% 0.01 250)", // Muted foreground
    grid: "oklch(25% 0.01 250)", // Border/grid
    background: "oklch(18% 0.01 250)", // Card background
    foreground: "oklch(92% 0.005 250)", // Text
  },
} as const;

export interface ChartColors {
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  destructive: string;
  muted: string;
  grid: string;
  background: string;
  foreground: string;
}

/**
 * Hook that returns theme-aware chart colors.
 * Triggers re-render when theme changes, ensuring Recharts
 * components update their colors correctly.
 *
 * @returns ChartColors object with resolved color values
 *
 * @example
 * ```tsx
 * const colors = useChartColors();
 * <Bar fill={colors.chart1} />
 * <Line stroke={colors.chart2} />
 * ```
 */
export function useChartColors(): ChartColors {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch by only using theme after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Return light theme colors during SSR and before hydration
  if (!mounted) {
    return CHART_COLORS.light;
  }

  return resolvedTheme === "dark" ? CHART_COLORS.dark : CHART_COLORS.light;
}

/**
 * Tooltip styles that work in both light and dark modes.
 * The tooltip has a dark background in both modes for consistency.
 * Exported as a constant since styles are static (no theme dependency).
 */
export const CHART_TOOLTIP_STYLES = {
  contentStyle: {
    backgroundColor: "hsl(220 15% 15%)",
    border: "none",
    borderRadius: "12px",
    color: "white",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
  },
  labelStyle: { color: "rgba(255, 255, 255, 0.7)" },
  itemStyle: { color: "white" },
} as const;
