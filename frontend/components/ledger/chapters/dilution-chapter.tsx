"use client";

import { useTranslations } from "next-intl";
import { Chapter } from "@/components/ledger/chapter";
import { RuledTable } from "@/components/ledger/ruled-table";
import { Money } from "@/components/ledger/money";
import { formatStakePercent } from "@/lib/ledger/percent";
import { FORMATTING } from "@/lib/constants/formatting";
import type { DilutionRoundForm, DilutionScheduleEntry } from "@/lib/schemas";

/** `totalDilution * PCT_SCALE` converts the backend's 0-1 fraction into a displayable percentage. */
const PCT_SCALE = 100;
/** A round schedule always starts from 100% ownership before any dilution applies. */
const INITIAL_STAKE_PCT = 100;

export interface DilutionChapterProps {
  index: string;
  rounds: DilutionRoundForm[];
  totalDilution: number | null;
  dilutedEquityPct: number | null;
  /**
   * One entry per *enabled* round, computed by the backend's dilution engine
   * (`dilution_engine.py`'s `round_factors`) — the single source of truth for
   * per-round dilution math, including SAFE-conversion timing. It is a
   * *parallel* array (index `i` belongs to the `i`th enabled round, in the
   * order `toDilutionRoundWires` submitted them), not one keyed by year, so
   * this chapter only looks values up by position; it never recomputes them.
   */
  dilutionSchedule: DilutionScheduleEntry[] | null;
}

interface StakeRow {
  round: DilutionRoundForm;
  resultingStakePct: number;
}

/**
 * One row per round, ordered by year. Resulting-stake values come straight
 * from `dilutionSchedule`, zipped by position against the enabled rounds in
 * their original (submission) order — `dilutionSchedule` is a parallel array,
 * not one keyed by year, so two rounds sharing a year still get their own
 * entry instead of colliding on a shared key. A disabled round has no entry,
 * so it carries forward the stake left by the nearest earlier enabled round,
 * unchanged — matching what "disabled" means.
 */
function buildStakeRows(
  rounds: DilutionRoundForm[],
  schedule: DilutionScheduleEntry[] | null
): StakeRow[] {
  const enabledRounds = rounds.filter((round) => round.enabled);
  const stakeByRound = new Map(
    enabledRounds.map((round, i) => [round, schedule?.[i]?.resulting_stake_pct])
  );
  const ordered = [...rounds].sort((a, b) => a.year - b.year);
  let lastKnownStakePct = INITIAL_STAKE_PCT;
  return ordered.map((round) => {
    const stakePct = stakeByRound.get(round);
    if (stakePct !== undefined) lastKnownStakePct = stakePct;
    return { round, resultingStakePct: lastKnownStakePct };
  });
}

/**
 * Chapter 03: the dilution round schedule — completed and projected rounds,
 * their raise and dilution, and the stake remaining after each. Rendered only
 * when the parent has dilution simulation switched on.
 */
export function DilutionChapter({
  index,
  rounds,
  totalDilution,
  dilutedEquityPct,
  dilutionSchedule,
}: DilutionChapterProps) {
  const t = useTranslations("chapters");

  const rows = buildStakeRows(rounds, dilutionSchedule);

  const sub =
    dilutedEquityPct !== null
      ? t("dilution.summary", { pct: formatStakePercent(dilutedEquityPct) })
      : undefined;

  return (
    <Chapter index={index} title={t("dilution.title")} sub={sub}>
      {totalDilution !== null ? (
        <p className="text-annotation mt-2 text-sm">
          {t("dilution.totalCaption", { pct: Math.round(totalDilution * PCT_SCALE) })}
        </p>
      ) : null}
      <RuledTable
        className="mt-3"
        head={[
          t("dilution.round"),
          t("dilution.year"),
          t("dilution.raise"),
          t("dilution.dilutionPct"),
          t("dilution.resultingStake"),
        ]}
        align={["start", "end", "end", "end", "end"]}
      >
        {rows.map(({ round, resultingStakePct }) => (
          <tr key={`${round.round_name}-${round.year}`}>
            <td className="py-2">
              <span>{round.round_name}</span>{" "}
              <span className="text-annotation text-xs">
                {round.status === "completed"
                  ? t("dilution.statusCompleted")
                  : t("dilution.statusUpcoming")}
              </span>
            </td>
            <td className="text-end font-mono text-sm tabular-nums">{round.year}</td>
            <td className="text-end font-mono text-sm tabular-nums">
              <Money value={round.amount_raised} />
            </td>
            <td className="text-end font-mono text-sm tabular-nums">{round.dilution_pct}%</td>
            <td className="text-end font-mono text-sm tabular-nums">
              {resultingStakePct.toFixed(FORMATTING.DECIMAL_PLACES_PERCENT)}%
            </td>
          </tr>
        ))}
      </RuledTable>
    </Chapter>
  );
}
