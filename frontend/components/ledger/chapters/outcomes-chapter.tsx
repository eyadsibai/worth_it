"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Chapter } from "@/components/ledger/chapter";
import { RuledTable } from "@/components/ledger/ruled-table";
import { Money } from "@/components/ledger/money";
import { OutcomeBand } from "@/components/ledger/outcome-band";
import { Field } from "@/components/ledger/field";
import { interpolate } from "@/lib/ledger/interpolate";
import { useMonteCarloWebSocket } from "@/lib/api-client";
import { buildMonteCarloRequest, rollSeed } from "@/lib/ledger/monte-carlo-request";
import { VALIDATION } from "@/lib/constants/validation";
import type {
  GlobalSettingsForm,
  CurrentJobForm,
  RSUForm,
  StockOptionsForm,
  MonteCarloPercentiles,
} from "@/lib/schemas";

/** Default simulation count for the on-demand "Run" action. */
export const DEFAULT_RUNS = 10_000;

/**
 * Sentinel spliced into the caption's translated sentence, then replaced
 * with a rendered `<bdi>` — see `lib/ledger/interpolate.tsx` for why: `t()`
 * cannot return a React element for a plain `{argument}` placeholder.
 */
const SEED_TOKEN = "";
/** Shown for the seed before any run has completed. */
const EMPTY_SEED = "—";

const PERCENTILE_ROWS: { key: keyof MonteCarloPercentiles; labelKey: string }[] = [
  { key: "p10", labelKey: "rowWeakExit" },
  { key: "p25", labelKey: "rowP25" },
  { key: "p50", labelKey: "rowMedian" },
  { key: "p75", labelKey: "rowP75" },
  { key: "p90", labelKey: "rowStrongExit" },
];

/**
 * Formats a plain count with Western digits regardless of locale, mirroring
 * `formatMoney`'s own `-u-nu-latn` technique in `lib/ledger/format-money.ts`.
 */
function formatCount(value: number, locale: string): string {
  return new Intl.NumberFormat(`${locale}-u-nu-latn`).format(value);
}

export interface OutcomesChapterProps {
  index: string;
  globalSettings: GlobalSettingsForm;
  currentJob: CurrentJobForm;
  equityDetails: RSUForm | StockOptionsForm;
  onPercentiles: (
    percentiles: MonteCarloPercentiles | null,
    probability: number | null,
    seed: number | null
  ) => void;
}

/**
 * Chapter 02: runs the Monte Carlo simulation on demand over the shared
 * WebSocket hook and renders the percentile spread, the OutcomeBand, and a
 * seed caption for reproducing the run. Task 13 feeds `onPercentiles`'
 * output into the verdict.
 */
export function OutcomesChapter({
  index,
  globalSettings,
  currentJob,
  equityDetails,
  onPercentiles,
}: OutcomesChapterProps) {
  const t = useTranslations("chapters");
  const locale = useLocale();
  const { isRunning, progress, result, error, runSimulation } = useMonteCarloWebSocket();
  const [numSimulations, setNumSimulations] = useState(DEFAULT_RUNS);
  const [seed, setSeed] = useState<number | null>(null);

  useEffect(() => {
    // Unconditional, not gated on `result` being non-null: `runSimulation`
    // resets the hook's `result` to null the moment a new run starts, and
    // the consumer (Task 13's verdict) needs that reset signalled too — a
    // guard here would leave it holding a stale percentiles/seed from the
    // PREVIOUS run while this chapter's own table/band correctly blank out.
    onPercentiles(
      result?.net_outcome_percentiles ?? null,
      result?.probability_offer_wins ?? null,
      result?.seed ?? null
    );
    // onPercentiles isn't tracked: only a `result` transition should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const handleRun = () => {
    runSimulation(
      buildMonteCarloRequest({ globalSettings, currentJob, equityDetails, numSimulations, seed })
    );
  };

  // Narrowed together so the table/band below read `outcomes.net`/`.payout`
  // without re-checking (or re-casting past) each field's own nullability.
  const outcomes =
    result?.net_outcome_percentiles && result?.payout_percentiles
      ? { net: result.net_outcome_percentiles, payout: result.payout_percentiles }
      : null;

  const caption = interpolate(
    t("outcomes.caption", {
      runs: formatCount(result?.net_outcomes.length ?? numSimulations, locale),
      seed: SEED_TOKEN,
    }),
    {
      [SEED_TOKEN]: (
        <bdi dir="ltr">
          {result?.seed !== null && result?.seed !== undefined ? result.seed : EMPTY_SEED}
        </bdi>
      ),
    }
  );

  return (
    <Chapter index={index} title={t("outcomes.title")}>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={handleRun}
          disabled={isRunning}
          className="border-market bg-market-soft text-market rounded-sm border px-3 py-1.5 font-mono text-xs disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("outcomes.run", { runs: formatCount(numSimulations, locale) })}
        </button>
        {error ? <p className="text-loss text-xs">{t("outcomes.error")}</p> : null}
      </div>

      {isRunning ? (
        <div
          role="progressbar"
          aria-valuenow={progress?.percentage ?? 0}
          aria-valuemin={0}
          aria-valuemax={100}
          className="border-rule mt-3 h-px w-full overflow-hidden"
        >
          <div className="bg-market h-full" style={{ width: `${progress?.percentage ?? 0}%` }} />
        </div>
      ) : null}

      {outcomes ? (
        <>
          <RuledTable
            className="mt-4"
            head={[
              t("outcomes.percentileHeader"),
              t("outcomes.columnEquityValue"),
              t("outcomes.columnNetVsStaying"),
            ]}
            align={["start", "end", "end"]}
          >
            {PERCENTILE_ROWS.map(({ key, labelKey }) => (
              <tr key={key}>
                <td className="py-2">{t(`outcomes.${labelKey}`)}</td>
                <td className="text-end font-mono text-sm tabular-nums">
                  <Money value={outcomes.payout[key]} signed />
                </td>
                <td className="text-end font-mono text-sm tabular-nums">
                  <Money value={outcomes.net[key]} signed />
                </td>
              </tr>
            ))}
          </RuledTable>

          <div className="mt-4">
            <OutcomeBand percentiles={outcomes.net} ariaLabel={t("outcomes.bandLabel")} />
          </div>

          <p className="text-annotation mt-3 text-xs">{caption}</p>
        </>
      ) : null}

      <details className="mt-4">
        <summary className="text-annotation cursor-pointer text-xs">
          {t("outcomes.assumptions")}
        </summary>
        <div className="mt-2 flex flex-wrap items-end gap-4">
          <Field
            label={t("outcomes.runsLabel")}
            value={numSimulations}
            onValueChange={(value) => setNumSimulations(value ?? DEFAULT_RUNS)}
            min={VALIDATION.NUM_SIMULATIONS_MIN}
            max={VALIDATION.NUM_SIMULATIONS_MAX}
          />
          <button
            type="button"
            onClick={() => setSeed(rollSeed())}
            className="border-rule rounded-sm border px-2 py-0.5 font-mono text-xs"
          >
            {t("outcomes.reroll")}
          </button>
        </div>
      </details>
    </Chapter>
  );
}
