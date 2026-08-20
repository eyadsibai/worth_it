"use client";

import { useTranslations } from "next-intl";
import { Chapter } from "@/components/ledger/chapter";
import { RuledTable } from "@/components/ledger/ruled-table";
import { Money } from "@/components/ledger/money";
import { FORMATTING } from "@/lib/constants/formatting";
import type { DilutionRoundForm } from "@/lib/schemas";

const FULL_STAKE_PCT = 100;

export interface DilutionChapterProps {
  index: string;
  rounds: DilutionRoundForm[];
  totalDilution: number | null;
  dilutedEquityPct: number | null;
}

interface StakeRow {
  round: DilutionRoundForm;
  resultingStakePct: number;
}

/**
 * One row per round, ordered by year, carrying the running stake left after
 * each enabled round applies its dilution. Same cumulative-product math
 * already used for display in `components/forms/dilution-summary-card.tsx`
 * and `components/forms/completed-rounds-section.tsx` — reused here as the
 * established frontend pattern for this kind of presentational rollup, not a
 * new calculation.
 */
function buildStakeRows(rounds: DilutionRoundForm[]): StakeRow[] {
  const ordered = [...rounds].sort((a, b) => a.year - b.year);
  let runningStake = FULL_STAKE_PCT;
  return ordered.map((round) => {
    if (round.enabled) {
      runningStake *= 1 - round.dilution_pct / FULL_STAKE_PCT;
    }
    return { round, resultingStakePct: runningStake };
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
}: DilutionChapterProps) {
  const t = useTranslations("chapters");

  const rows = buildStakeRows(rounds);

  const sub =
    dilutedEquityPct !== null
      ? t("dilution.summary", { pct: Math.round(dilutedEquityPct * FULL_STAKE_PCT) })
      : undefined;

  return (
    <Chapter index={index} title={t("dilution.title")} sub={sub}>
      {totalDilution !== null ? (
        <p className="text-annotation mt-2 text-sm">
          {t("dilution.totalCaption", { pct: Math.round(totalDilution * FULL_STAKE_PCT) })}
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
