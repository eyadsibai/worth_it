import { Money } from "@/components/ledger/money";
import { cn } from "@/lib/utils";
import type { MonteCarloPercentiles } from "@/lib/schemas";

interface OutcomeBandProps {
  percentiles: MonteCarloPercentiles;
  ariaLabel: string;
  className?: string;
}

/** Width of the rendered SVG, in pixels. */
const BAND_WIDTH = 280;
/** Height of the rendered SVG, in pixels. */
const BAND_HEIGHT = 56;
/** Fraction of the p10-p90 span added as breathing room on each side of the scale. */
const PAD_RATIO = 0.08;
/** Domain span substituted when p10 === p90, so the scale never divides by zero. */
const ZERO_WIDTH_FALLBACK_SPAN = 1;
/** Vertical top of the track rectangles (outer p10-p90 and inner p25-p75). */
const TRACK_Y = 20;
/** Height of the track rectangles. */
const TRACK_THICKNESS = 16;
/** How far the median line extends past the track, above and below. */
const MEDIAN_LINE_MARGIN = 6;
/** How far the zero tick extends past the track, above and below. */
const ZERO_TICK_OVERHANG = 4;
/** Stroke width of the median line. */
const MEDIAN_STROKE_WIDTH = 2;
/** Stroke width of the zero tick. */
const ZERO_TICK_STROKE_WIDTH = 1;
/** Fill opacity of the inner p25-p75 track, layered over the softer outer track. */
const INNER_TRACK_OPACITY = 0.35;

/** Maps a value in [domainMin, domainMin + domainWidth] to an x coordinate in [0, BAND_WIDTH]. */
function scalePoint(value: number, domainMin: number, domainWidth: number): number {
  return ((value - domainMin) / domainWidth) * BAND_WIDTH;
}

/**
 * A horizontal p10-p90 band with an emphasized median, standing in for a time-series
 * fan chart. The Monte Carlo result is a terminal distribution, not a path over time,
 * so this renders the honest shape of that distribution instead of a fabricated one.
 */
export function OutcomeBand({ percentiles, ariaLabel, className }: OutcomeBandProps) {
  const { p10, p25, p50, p75, p90 } = percentiles;

  const rawSpan = p90 - p10;
  const span = rawSpan === 0 ? ZERO_WIDTH_FALLBACK_SPAN : rawSpan;
  const padding = span * PAD_RATIO;
  const domainMin = p10 - padding;
  const domainWidth = p90 + padding - domainMin;

  const x10 = scalePoint(p10, domainMin, domainWidth);
  const x25 = scalePoint(p25, domainMin, domainWidth);
  const x50 = scalePoint(p50, domainMin, domainWidth);
  const x75 = scalePoint(p75, domainMin, domainWidth);
  const x90 = scalePoint(p90, domainMin, domainWidth);
  const xZero = scalePoint(0, domainMin, domainWidth);

  const medianIsLoss = p50 < 0;
  const medianStroke = medianIsLoss ? "var(--loss)" : "var(--market)";
  const medianTextClass = medianIsLoss ? "text-loss" : "text-market";
  const showZeroTick = p10 <= 0 && p90 >= 0;

  return (
    <div
      dir="ltr"
      role="img"
      aria-label={ariaLabel}
      className={cn("inline-flex flex-col items-center", className)}
    >
      <div className="relative h-4" style={{ width: BAND_WIDTH }} aria-hidden="true">
        <span
          data-testid="label-median"
          className="absolute"
          style={{ left: x50, transform: "translateX(-50%)" }}
        >
          <Money value={p50} signed className={cn("font-mono text-xs", medianTextClass)} />
        </span>
      </div>
      <svg
        width={BAND_WIDTH}
        height={BAND_HEIGHT}
        viewBox={`0 0 ${BAND_WIDTH} ${BAND_HEIGHT}`}
        aria-hidden="true"
      >
        <rect
          x={x10}
          y={TRACK_Y}
          width={x90 - x10}
          height={TRACK_THICKNESS}
          fill="var(--market-soft)"
        />
        <rect
          x={x25}
          y={TRACK_Y}
          width={x75 - x25}
          height={TRACK_THICKNESS}
          fill="var(--market)"
          fillOpacity={INNER_TRACK_OPACITY}
        />
        {showZeroTick ? (
          <line
            data-testid="zero-tick"
            x1={xZero}
            x2={xZero}
            y1={TRACK_Y - ZERO_TICK_OVERHANG}
            y2={TRACK_Y + TRACK_THICKNESS + ZERO_TICK_OVERHANG}
            stroke="var(--rule-strong)"
            strokeWidth={ZERO_TICK_STROKE_WIDTH}
          />
        ) : null}
        <line
          x1={x50}
          x2={x50}
          y1={MEDIAN_LINE_MARGIN}
          y2={BAND_HEIGHT - MEDIAN_LINE_MARGIN}
          stroke={medianStroke}
          strokeWidth={MEDIAN_STROKE_WIDTH}
        />
      </svg>
      <div className="relative h-4" style={{ width: BAND_WIDTH }} aria-hidden="true">
        <span data-testid="label-p10" className="absolute" style={{ left: x10 }}>
          <Money value={p10} signed className="text-annotation font-mono text-xs" />
        </span>
        <span
          data-testid="label-p90"
          className="absolute"
          style={{ left: x90, transform: "translateX(-100%)" }}
        >
          <Money value={p90} signed className="text-annotation font-mono text-xs" />
        </span>
      </div>
    </div>
  );
}
