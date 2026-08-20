"use client";

import { useTranslations } from "next-intl";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";
import { Chapter } from "@/components/ledger/chapter";
import { FORMATTING } from "@/lib/constants/formatting";
import type { MonthlyDataGridResponse } from "@/lib/schemas";

const MAX_VESTED_PCT = 100;
/**
 * Fixed pixel size rather than `ResponsiveContainer`: Recharts only measures
 * its parent via `ResizeObserver`, which never fires synchronously (in real
 * browsers it's async; in the jsdom test environment it never fires at all),
 * so a percentage-sized chart renders no `<svg>` at all until a resize
 * happens. A fixed size renders immediately and deterministically; the
 * `overflow-x-auto` wrapper keeps it from breaking narrow layouts.
 */
const CHART_WIDTH = 640;
const CHART_HEIGHT = 220;

interface VestedPoint {
  month: number;
  vestedPct: number;
}

/**
 * Builds one point per elapsed month, following the standard cliff-then-linear
 * vesting schedule: nothing vests before the cliff, then vesting accrues
 * linearly to 100% at the end of the vesting period. This is the same
 * schedule shape already rendered client-side for the cap table timeline
 * (`components/cap-table/timeline/use-timeline-data.ts`) — a display of the
 * grant's terms, not a dollar calculation, so it stays presentational.
 */
function buildVestingCurve(
  totalMonths: number,
  vestingMonths: number,
  cliffMonths: number
): VestedPoint[] {
  return Array.from({ length: totalMonths }, (_, monthIndex) => {
    const month = monthIndex + 1;
    const vestedPct =
      month < cliffMonths || vestingMonths <= 0
        ? 0
        : Math.min(MAX_VESTED_PCT, (month / vestingMonths) * MAX_VESTED_PCT);
    return { month, vestedPct };
  });
}

function yearTicksFor(totalMonths: number): number[] {
  const years = Math.floor(totalMonths / FORMATTING.MONTHS_PER_YEAR);
  return Array.from(
    { length: years },
    (_, yearIndex) => (yearIndex + 1) * FORMATTING.MONTHS_PER_YEAR
  );
}

export interface VestingChapterProps {
  index: string;
  monthlyData: MonthlyDataGridResponse;
  vestingPeriod: number;
  cliffPeriod: number;
  exitYear: number;
}

/**
 * Chapter 01: a step chart of the equity's cumulative vesting schedule, with
 * the cliff and the exit year marked, and a caption naming the cliff as the
 * risk window if the employee leaves early.
 */
export function VestingChapter({
  index,
  monthlyData,
  vestingPeriod,
  cliffPeriod,
  exitYear,
}: VestingChapterProps) {
  const t = useTranslations("chapters");

  const vestingMonths = vestingPeriod * FORMATTING.MONTHS_PER_YEAR;
  const cliffMonths = cliffPeriod * FORMATTING.MONTHS_PER_YEAR;
  const totalMonths = monthlyData.data.length;
  const exitMonth = exitYear * FORMATTING.MONTHS_PER_YEAR;

  const data = buildVestingCurve(totalMonths, vestingMonths, cliffMonths);
  const ticks = yearTicksFor(totalMonths);

  return (
    <Chapter index={index} title={t("vesting.title")}>
      <div dir="ltr" className="mt-4 overflow-x-auto font-mono">
        <AreaChart
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--rule)" vertical={false} />
          <XAxis
            dataKey="month"
            ticks={ticks}
            tickFormatter={(month: number) => `Y${month / FORMATTING.MONTHS_PER_YEAR}`}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, MAX_VESTED_PCT]}
            tickFormatter={(value: number) => `${value}%`}
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          {cliffMonths > 0 && cliffMonths <= totalMonths ? (
            <ReferenceLine x={cliffMonths} stroke="var(--loss)" strokeDasharray="3 3" />
          ) : null}
          {exitMonth > 0 && exitMonth <= totalMonths ? (
            <ReferenceLine x={exitMonth} stroke="var(--rule-strong)" strokeDasharray="3 3" />
          ) : null}
          <Area
            type="step"
            dataKey="vestedPct"
            stroke="var(--market)"
            fill="var(--market-soft)"
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </div>
      <p className="text-annotation mt-3 text-sm">
        {t("vesting.cliffAnnotation", { cliff: cliffPeriod })}
      </p>
    </Chapter>
  );
}
