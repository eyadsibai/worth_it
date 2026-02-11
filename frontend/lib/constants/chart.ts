/**
 * Chart-related constants for Recharts visualizations,
 * including tick counts, margins, animation durations,
 * opacity values, and label font sizes.
 */

export const CHART = {
  // === Dimensions ===
  DEFAULT_HEIGHT: 300,
  DEFAULT_WIDTH: 500,

  // === Tick / axis ===
  TICK_COUNT: 5,
  TICK_FONT_SIZE: 12,

  // === Animation ===
  ANIMATION_DURATION_MS: 300,
  TOOLTIP_ANIMATION_MS: 200,

  // === Opacity ===
  OPACITY_MUTED: 0.3,
  OPACITY_MEDIUM: 0.5,
  OPACITY_DEFAULT: 0.7,
  OPACITY_FULL: 0.8,
  OPACITY_HOVER: 1.0,
  AREA_FILL_OPACITY: 0.2,
  AREA_FILL_OPACITY_MEDIUM: 0.4,

  // === Stroke / radius ===
  STROKE_WIDTH: 2,
  STROKE_WIDTH_THICK: 3,
  BAR_RADIUS: 4,
  DOT_RADIUS: 3,
  DOT_RADIUS_ACTIVE: 5,
  REFERENCE_LINE_DASH: "3 3" as const,

  // === Label sizing ===
  LABEL_FONT_SIZE: 12,
  LABEL_FONT_SIZE_SMALL: 10,

  // === Margins ===
  MARGIN_TOP: 5,
  MARGIN_RIGHT: 30,
  MARGIN_BOTTOM: 5,
  MARGIN_LEFT: 20,
} as const;
